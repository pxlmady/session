import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { bookingSelect, bookingStudentSelect, slotSelect } from '../lib/selects.js';

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'];

const slotNotFound = () => new AppError(404, 'SLOT_NOT_FOUND', 'Слот не знайдено');
const notSlotOwner = () => new AppError(403, 'FORBIDDEN', 'Слот належить іншому викладачу');
const slotOverlap = () =>
  new AppError(409, 'SLOT_OVERLAP', 'Слот перетинається в часі з іншим вашим слотом');

// Слот, перевірений на існування та належність викладачу (перевірка власника – у сервісі, ТЗ розділ 12)
async function getOwnSlot(teacherId, slotId) {
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, select: slotSelect });
  if (!slot) throw slotNotFound();
  if (slot.teacherId !== teacherId) throw notSlotOwner();
  return slot;
}

// Блокування рядка викладача до кінця транзакції: одночасні створення або зміни слотів
// одного викладача виконуються послідовно, тому перевірка перетину (BR-03) не має гонки.
// Запит параметризований засобами Prisma ($queryRaw із шаблонним рядком).
async function lockTeacher(tx, teacherId) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${teacherId} FOR UPDATE`;
}

// BR-03: слоти викладача, крім скасованих, не перетинаються.
// Інтервали [startAt, endAt) перетинаються, якщо startAt < інший.endAt і endAt > інший.startAt;
// суміжні слоти (кінець одного = початок іншого) дозволені.
async function assertNoOverlap(tx, teacherId, { startAt, endAt }, excludeSlotId) {
  const overlapping = await tx.slot.findFirst({
    where: {
      teacherId,
      status: { not: 'CANCELLED' },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
    },
    select: { id: true },
  });
  if (overlapping) throw slotOverlap();
}

// FR-08, FR-12: створення слота зі статусом FREE
export async function createSlot(teacherId, { startAt, endAt, location }) {
  return prisma.$transaction(async (tx) => {
    await lockTeacher(tx, teacherId);
    await assertNoOverlap(tx, teacherId, { startAt, endAt });
    return tx.slot.create({
      data: { teacherId, startAt, endAt, location: location ?? null },
      select: slotSelect,
    });
  });
}

// FR-09: усі слоти викладача за часом початку з даними про записи
export function listTeacherSlots(teacherId) {
  return prisma.slot.findMany({
    where: { teacherId },
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    select: {
      ...slotSelect,
      bookings: {
        orderBy: { createdAt: 'desc' },
        select: { ...bookingSelect, student: { select: bookingStudentSelect } },
      },
    },
  });
}

// FR-10, BR-02, BR-05: редагування лише власного майбутнього слота зі статусом FREE
export async function updateSlot(teacherId, slotId, changes) {
  const slot = await getOwnSlot(teacherId, slotId);
  if (slot.status !== 'FREE') {
    throw new AppError(409, 'SLOT_NOT_EDITABLE', 'Редагувати можна лише вільний слот');
  }
  if (slot.startAt.getTime() <= Date.now()) {
    throw new AppError(409, 'SLOT_IN_PAST', 'Слот уже розпочався або минув');
  }

  const startAt = changes.startAt ?? slot.startAt;
  const endAt = changes.endAt ?? slot.endAt;
  if (endAt.getTime() <= startAt.getTime()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Помилка валідації даних', [
      { field: 'endAt', message: 'Час завершення має бути пізнішим за час початку' },
    ]);
  }

  const data = { startAt, endAt };
  if (changes.location !== undefined) data.location = changes.location;

  return prisma.$transaction(async (tx) => {
    await lockTeacher(tx, teacherId);
    await assertNoOverlap(tx, teacherId, { startAt, endAt }, slotId);

    // Умовне оновлення: якщо слот тим часом заброньовано, зміна не виконується
    const { count } = await tx.slot.updateMany({
      where: { id: slotId, teacherId, status: 'FREE', startAt: { gt: new Date() } },
      data,
    });
    if (count === 0) {
      throw new AppError(409, 'SLOT_NOT_EDITABLE', 'Редагувати можна лише вільний слот');
    }
    return tx.slot.findUnique({ where: { id: slotId }, select: slotSelect });
  });
}

// FR-11: слот без записів видаляється (повертає null → 204);
// слот із записами переводиться в CANCELLED, активний запис скасовується (повертає слот → 200).
export async function deleteSlot(teacherId, slotId) {
  const slot = await getOwnSlot(teacherId, slotId);
  if (slot.status === 'CANCELLED') {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Слот уже скасовано');
  }

  return prisma.$transaction(async (tx) => {
    // Спочатку слот переводиться в CANCELLED (і блокується): одночасне бронювання
    // вже не зможе змінити його статус на BOOKED (умовне оновлення в booking.service)
    const { count } = await tx.slot.updateMany({
      where: { id: slotId, teacherId, status: { in: ['FREE', 'BOOKED'] } },
      data: { status: 'CANCELLED' },
    });
    if (count === 0) {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Слот уже скасовано');
    }

    const bookingsCount = await tx.booking.count({ where: { slotId } });
    if (bookingsCount === 0) {
      await tx.slot.delete({ where: { id: slotId } });
      return null;
    }

    // BR-05: активний запис скасовується лише до початку консультації
    const hasActiveBooking = await tx.booking.count({
      where: { slotId, status: { in: ACTIVE_BOOKING_STATUSES } },
    });
    if (hasActiveBooking > 0 && slot.startAt.getTime() <= Date.now()) {
      throw new AppError(
        409,
        'SLOT_IN_PAST',
        'Консультація вже розпочалася, скасувати запис на неї неможливо',
      );
    }
    await tx.booking.updateMany({
      where: { slotId, status: { in: ACTIVE_BOOKING_STATUSES } },
      data: { status: 'CANCELLED' },
    });
    return tx.slot.findUnique({ where: { id: slotId }, select: slotSelect });
  });
}
