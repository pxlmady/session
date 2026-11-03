import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { bookingSelect, bookingStudentSelect, teacherSelect } from '../lib/selects.js';

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
export async function createBooking(studentId, { slotId, topic }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const { count } = await tx.slot.updateMany({
        where: { id: slotId, status: 'FREE', startAt: { gt: new Date() } },
        data: { status: 'BOOKED' },
      });
      if (count === 0) {
        throw await bookingFailure(tx, slotId);
      }
      return tx.booking.create({
        data: { slotId, studentId, topic },
        select: bookingSelect,
      });
    });
  } catch (err) {
    // Порушення часткового унікального індексу: на слот уже є активний запис
    if (err.code === 'P2002') throw slotAlreadyBooked();
    throw err;
  }
}

// Дані запису для списку «Мої записи» (FR-18, FR-19): слот із викладачем і студент.
// Студент отримує лише власні записи, викладач – лише записи на власні слоти.
const myBookingSelect = {
  ...bookingSelect,
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
// Усі дії можливі лише до початку консультації (BR-05).
const TRANSITIONS = {
  confirm: {
    from: ['PENDING'],
    to: 'CONFIRMED',
    releaseSlot: false,
    roles: ['TEACHER'],
    invalidMessage: 'Підтвердити можна лише запис, що очікує підтвердження',
    startedMessage: 'Консультація вже розпочалася, підтвердити запис неможливо',
  },
  reject: {
    from: ['PENDING'],
    to: 'CANCELLED',
    releaseSlot: true,
    roles: ['TEACHER'],
    invalidMessage: 'Відхилити можна лише запис, що очікує підтвердження',
    startedMessage: 'Консультація вже розпочалася, відхилити запис неможливо',
  },
  cancel: {
    from: ACTIVE_BOOKING_STATUSES,
    to: 'CANCELLED',
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

  return prisma.$transaction(async (tx) => {
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
}

// FR-21: підтвердження запису викладачем (власником слота)
export const confirmBooking = (user, bookingId) => changeBookingStatus(user, bookingId, 'confirm');

// FR-21: відхилення запису викладачем (власником слота); слот повертається у FREE
export const rejectBooking = (user, bookingId) => changeBookingStatus(user, bookingId, 'reject');

// FR-20, BR-05: скасування активного запису студентом (власником запису)
// або викладачем (власником слота) до початку консультації; слот повертається у FREE
export const cancelBooking = (user, bookingId) => changeBookingStatus(user, bookingId, 'cancel');
