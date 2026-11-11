import { GRADE_CONTROL_TYPES, nationalGrade, PASSING_SCORE } from '../academic/grading.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import {
  bookingResultSelect,
  bookingSelect,
  bookingStudentSelect,
  teacherSelect,
} from '../lib/selects.js';
import { NOTIFICATION_EVENTS, notifyBookingEvent } from './notification.service.js';
import { assertSubjectExists } from './subject.service.js';

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'];

const slotAlreadyBooked = () => new AppError(409, 'SLOT_ALREADY_BOOKED', 'Слот уже зайнято');

// Причина, з якої слот не вдалося забронювати (для зрозумілого повідомлення)
async function bookingFailure(tx, slotId) {
  const slot = await tx.slot.findUnique({
    where: { id: slotId },
    select: { status: true, startAt: true },
  });
  if (!slot) return new AppError(404, 'SLOT_NOT_FOUND', 'Слот не знайдено');
  if (slot.status === 'CANCELLED') {
    return new AppError(409, 'SLOT_NOT_AVAILABLE', 'Слот скасовано викладачем');
  }
  if (slot.startAt.getTime() <= Date.now()) {
    return new AppError(409, 'SLOT_IN_PAST', 'Слот уже розпочався або минув');
  }
  return slotAlreadyBooked();
}

// FR-15, FR-16, FR-17, BR-04: бронювання в одній транзакції.
// 1) Умовне оновлення слота FREE → BOOKED лише для майбутнього слота. PostgreSQL блокує рядок,
//    тому з одночасних запитів його змінює лише перший, решта отримують count = 0 → 409.
// 2) Створення запису PENDING. Частковий унікальний індекс Booking_active_slot_unique
//    додатково гарантує на рівні БД не більше одного активного запису на слот.
// Після успішного бронювання викладачу й студенту надсилаються листи (у фоні).
//
// Академічна інтеграція (FR-33, FR-35, FR-36): subjectId зберігає дисципліну запису
// (неіснуюча – 404 SUBJECT_NOT_FOUND). До транзакції слот перевіряється на накладку
// з розкладом студента: за накладки без acknowledgeConflict = true – 409 SCHEDULE_CONFLICT
// без зміни слота. Якщо перевірка недоступна (немає зіставлення або збій постачальника),
// бронювання виконується без неї. Відповідь містить результат перевірки scheduleCheck.
export async function createBooking(
  student,
  { slotId, topic, subjectId, acknowledgeConflict },
  academic,
) {
  if (subjectId) await assertSubjectExists(subjectId);

  // Накладку перевіряємо лише для слота, який ще можна забронювати; інакше транзакція
  // поверне звичайну причину відмови (слот не знайдено, зайнято, скасовано, минув)
  let scheduleCheck = 'UNAVAILABLE';
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    select: { status: true, startAt: true, endAt: true },
  });
  if (slot && slot.status === 'FREE' && slot.startAt.getTime() > Date.now()) {
    const check = await academic.checkSlot(student, slot);
    scheduleCheck = check.scheduleCheck;
    if (check.scheduleCheck === 'CONFLICT' && !acknowledgeConflict) {
      throw new AppError(
        409,
        'SCHEDULE_CONFLICT',
        'Слот перетинається із заняттям за розкладом. Підтвердьте бронювання',
        check.conflicts,
      );
    }
  }

  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const { count } = await tx.slot.updateMany({
        where: { id: slotId, status: 'FREE', startAt: { gt: new Date() } },
        data: { status: 'BOOKED' },
      });
      if (count === 0) {
        throw await bookingFailure(tx, slotId);
      }
      return tx.booking.create({
        data: { slotId, studentId: student.id, subjectId: subjectId ?? null, topic },
        select: bookingSelect,
      });
    });
  } catch (err) {
    // Порушення часткового унікального індексу: на слот уже є активний запис
    if (err.code === 'P2002') throw slotAlreadyBooked();
    throw err;
  }
  notifyBookingEvent(NOTIFICATION_EVENTS.BOOKING_CREATED, booking.id);
  return { ...booking, scheduleCheck };
}

// Дані запису для списку «Мої записи» (FR-18, FR-19): слот із викладачем і студент.
// Студент отримує лише власні записи, викладач – лише записи на власні слоти.
const myBookingSelect = {
  ...bookingSelect,
  ...bookingResultSelect,
  slot: {
    select: {
      id: true,
      startAt: true,
      endAt: true,
      location: true,
      status: true,
      teacher: { select: teacherSelect },
    },
  },
  student: { select: bookingStudentSelect },
  // FR-39: назва дисципліни; академічні дані студента викладачу не передаються
  subject: { select: { id: true, name: true } },
};

// FR-18, FR-19: власні записи студента або записи на слоти викладача.
// period: 'upcoming' – консультація ще не завершилася (endAt > зараз), 'past' – завершилася;
// без period повертаються всі записи. Упорядкування за startAt слота за зростанням (п. 10.1).
export function listMyBookings(user, period) {
  const owner = user.role === 'STUDENT' ? { studentId: user.id } : {};
  const slotWhere = user.role === 'TEACHER' ? { teacherId: user.id } : {};
  const now = new Date();
  if (period === 'upcoming') slotWhere.endAt = { gt: now };
  if (period === 'past') slotWhere.endAt = { lte: now };

  return prisma.booking.findMany({
    where: { ...owner, slot: slotWhere },
    orderBy: [{ slot: { startAt: 'asc' } }, { id: 'asc' }],
    select: myBookingSelect,
  });
}

// Допустимі переходи статусу запису (ТЗ, п. 9.3):
// confirm – PENDING → CONFIRMED (викладач, FR-21);
// reject  – PENDING → CANCELLED зі звільненням слота (викладач, FR-21);
// cancel  – PENDING / CONFIRMED → CANCELLED зі звільненням слота (студент або викладач, FR-20).
// Усі дії можливі лише до початку консультації (BR-05). event – тип email-сповіщення.
const TRANSITIONS = {
  confirm: {
    from: ['PENDING'],
    to: 'CONFIRMED',
    event: NOTIFICATION_EVENTS.BOOKING_CONFIRMED,
    releaseSlot: false,
    roles: ['TEACHER'],
    invalidMessage: 'Підтвердити можна лише запис, що очікує підтвердження',
    startedMessage: 'Консультація вже розпочалася, підтвердити запис неможливо',
  },
  reject: {
    from: ['PENDING'],
    to: 'CANCELLED',
    event: NOTIFICATION_EVENTS.BOOKING_REJECTED,
    releaseSlot: true,
    roles: ['TEACHER'],
    invalidMessage: 'Відхилити можна лише запис, що очікує підтвердження',
    startedMessage: 'Консультація вже розпочалася, відхилити запис неможливо',
  },
  cancel: {
    from: ACTIVE_BOOKING_STATUSES,
    to: 'CANCELLED',
    event: NOTIFICATION_EVENTS.BOOKING_CANCELLED,
    releaseSlot: true,
    roles: ['STUDENT', 'TEACHER'],
    invalidMessage: 'Запис уже скасовано',
    startedMessage: 'Консультація вже розпочалася, скасувати запис неможливо',
  },
};

// Стан змінився між перевіркою і транзакцією; транзакція відкочується
const changedConcurrently = () =>
  new AppError(409, 'INVALID_STATUS_TRANSITION', 'Запис уже скасовано або змінено');

// Зміна статусу запису з перевіркою належності (у шарі сервісів, ТЗ розділ 12)
// і пов'язаною зміною слота в одній транзакції (NFR-05)
async function changeBookingStatus(user, bookingId, action) {
  const transition = TRANSITIONS[action];
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      studentId: true,
      slotId: true,
      slot: { select: { teacherId: true, startAt: true } },
    },
  });
  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Запис не знайдено');
  }

  const isOwner =
    transition.roles.includes(user.role) &&
    ((user.role === 'STUDENT' && booking.studentId === user.id) ||
      (user.role === 'TEACHER' && booking.slot.teacherId === user.id));
  if (!isOwner) {
    throw new AppError(403, 'FORBIDDEN', 'Недостатньо прав для зміни цього запису');
  }
  if (!transition.from.includes(booking.status)) {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', transition.invalidMessage);
  }
  if (booking.slot.startAt.getTime() <= Date.now()) {
    throw new AppError(409, 'BOOKING_STARTED', transition.startedMessage);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const now = new Date();
    // Порядок блокувань (спочатку слот, потім запис) такий самий, як під час бронювання
    // та видалення слота, щоб одночасні операції не блокували одна одну взаємно
    if (transition.releaseSlot) {
      const slotUpdate = await tx.slot.updateMany({
        where: { id: booking.slotId, status: 'BOOKED', startAt: { gt: now } },
        data: { status: 'FREE' },
      });
      if (slotUpdate.count === 0) throw changedConcurrently();
    }
    // Умовне оновлення: якщо статус запису змінився після перевірки, зміна не виконується
    const bookingUpdate = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: { in: transition.from },
        slot: { startAt: { gt: now } },
      },
      data: { status: transition.to },
    });
    if (bookingUpdate.count === 0) throw changedConcurrently();

    return tx.booking.findUnique({ where: { id: bookingId }, select: bookingSelect });
  });

  // Лист іншому учаснику консультації надсилається у фоні після фіксації змін
  notifyBookingEvent(transition.event, bookingId, { cancelledBy: user.role });
  return updated;
}

// Результат консультації (етап 9б). Викладач (власник слота) може зафіксувати результат
// підтвердженої консультації лише після її завершення (endAt слота минув) і лише один раз.
async function findCompletableBooking(user, bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      status: true,
      conductedAt: true,
      studentId: true,
      subject: { select: { id: true, name: true } },
      slot: { select: { teacherId: true, endAt: true } },
    },
  });
  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Запис не знайдено');
  }
  if (user.role !== 'TEACHER' || booking.slot.teacherId !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Недостатньо прав для зміни цього запису');
  }
  if (booking.status !== 'CONFIRMED') {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      'Проведеною можна позначити лише підтверджену консультацію',
    );
  }
  if (booking.slot.endAt.getTime() > Date.now()) {
    throw new AppError(
      409,
      'BOOKING_NOT_FINISHED',
      'Консультація ще не завершилася. Результат можна зафіксувати після її завершення',
    );
  }
  if (booking.conductedAt) {
    throw new AppError(409, 'BOOKING_ALREADY_COMPLETED', 'Результат консультації вже зафіксовано');
  }
  return booking;
}

const debtNotClosable = () =>
  new AppError(
    409,
    'DEBT_NOT_CLOSABLE',
    'Заборгованість не знайдено серед відкритих заборгованостей студента з дисципліни запису',
  );

const gradeNotAllowed = () =>
  new AppError(
    409,
    'GRADE_NOT_ALLOWED',
    'Оцінку можна виставити лише за консультацію з дисципліни для студента з академічними даними',
  );

const providerUnavailable = () =>
  new AppError(
    503,
    'ACADEMIC_PROVIDER_UNAVAILABLE',
    'Джерело академічних даних тимчасово недоступне. Спробуйте пізніше',
  );

// Що викладач може зафіксувати за результатом консультації: відкриті заборгованості студента
// з дисципліни запису і можливість виставити оцінку з цієї дисципліни (поточний семестр)
async function loadResultOptions(booking, academic) {
  const subjectId = booking.subject?.id ?? null;
  const { mapped, available, debts, semester } = await academic.getResultOptions(
    booking.studentId,
    subjectId,
  );
  const grading =
    subjectId && available && semester
      ? { semester, controlTypes: GRADE_CONTROL_TYPES, passingScore: PASSING_SCORE }
      : null;
  return { mapped, available, debts, grading };
}

// GET /api/bookings/:id/result-options: відкриті заборгованості студента з дисципліни запису,
// які викладач може закрити, і параметри оцінки (семестр, форми контролю). Доступно лише тоді,
// коли результат можна зафіксувати (ті самі перевірки). Це єдині академічні дані студента,
// які бачить викладач: лише дисципліна запису і лише після проведеної консультації.
export async function getResultOptions(user, bookingId, academic) {
  const booking = await findCompletableBooking(user, bookingId);
  const { available, debts, grading } = await loadResultOptions(booking, academic);
  return { subject: booking.subject, available, debts, grading };
}

// PATCH /api/bookings/:id/complete: позначка «Проведено», необов'язкова рекомендація
// студентові (note), закриття однієї відкритої заборгованості студента з дисципліни запису
// (closeDebtId) і оцінка з цієї дисципліни (grade). Закриття та оцінка зберігаються в Session
// (DebtClosure, GradeEntry); у джерелі академічних даних нічого не змінюється.
// Статус запису лишається CONFIRMED.
export async function completeBooking(user, bookingId, { note, closeDebtId, grade }, academic) {
  const booking = await findCompletableBooking(user, bookingId);

  let debt = null;
  let gradeData = null;
  if (closeDebtId || grade) {
    if (!booking.subject) throw closeDebtId ? debtNotClosable() : gradeNotAllowed();
    const { mapped, available, debts, grading } = await loadResultOptions(booking, academic);
    if (!available && mapped) throw providerUnavailable();
    if (closeDebtId) {
      debt = debts.find((item) => item.id === closeDebtId) ?? null;
      if (!debt) throw debtNotClosable();
    }
    if (grade) {
      if (!grading) throw gradeNotAllowed();
      gradeData = {
        studentId: booking.studentId,
        provider: academic.name,
        subjectId: booking.subject.id,
        semester: grading.semester,
        controlType: grade.controlType,
        score: grade.score,
        nationalGrade: nationalGrade(grade.score, grade.controlType),
        bookingId,
      };
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Умовне оновлення: одночасний повторний запит не перезапише результат
      const { count } = await tx.booking.updateMany({
        where: { id: bookingId, status: 'CONFIRMED', conductedAt: null },
        data: { conductedAt: new Date(), teacherNote: note || null },
      });
      if (count === 0) throw changedConcurrently();
      if (debt) {
        await tx.debtClosure.create({
          data: {
            studentId: booking.studentId,
            provider: academic.name,
            debtId: debt.id,
            debtTitle: debt.debtType,
            bookingId,
          },
        });
      }
      if (gradeData) await tx.gradeEntry.create({ data: gradeData });
      return tx.booking.findUnique({
        where: { id: bookingId },
        select: { ...bookingSelect, ...bookingResultSelect },
      });
    });
  } catch (err) {
    // Заборгованість уже закрито іншим записом (унікальність studentId + provider + debtId)
    if (err.code === 'P2002') throw debtNotClosable();
    throw err;
  }
}

// FR-21: підтвердження запису викладачем (власником слота)
export const confirmBooking = (user, bookingId) => changeBookingStatus(user, bookingId, 'confirm');

// FR-21: відхилення запису викладачем (власником слота); слот повертається у FREE
export const rejectBooking = (user, bookingId) => changeBookingStatus(user, bookingId, 'reject');

// FR-20, BR-05: скасування активного запису студентом (власником запису)
// або викладачем (власником слота) до початку консультації; слот повертається у FREE
export const cancelBooking = (user, bookingId) => changeBookingStatus(user, bookingId, 'cancel');
