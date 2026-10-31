import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { bookingSelect } from '../lib/selects.js';

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

// FR-20, BR-05: скасування активного запису студентом (власником запису)
// або викладачем (власником слота) до початку консультації; слот повертається у FREE
export async function cancelBooking(user, bookingId) {
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
    (user.role === 'STUDENT' && booking.studentId === user.id) ||
    (user.role === 'TEACHER' && booking.slot.teacherId === user.id);
  if (!isOwner) {
    throw new AppError(403, 'FORBIDDEN', 'Недостатньо прав для скасування цього запису');
  }
  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Запис уже скасовано');
  }
  if (booking.slot.startAt.getTime() <= Date.now()) {
    throw new AppError(
      409,
      'BOOKING_STARTED',
      'Консультація вже розпочалася, скасувати запис неможливо',
    );
  }

  return prisma.$transaction(async (tx) => {
    // Порядок блокувань (спочатку слот, потім запис) такий самий, як під час видалення слота,
    // щоб одночасні операції не блокували одна одну взаємно
    const slotUpdate = await tx.slot.updateMany({
      where: { id: booking.slotId, status: 'BOOKED', startAt: { gt: new Date() } },
      data: { status: 'FREE' },
    });
    const bookingUpdate = await tx.booking.updateMany({
      where: { id: bookingId, status: { in: ACTIVE_BOOKING_STATUSES } },
      data: { status: 'CANCELLED' },
    });
    // Стан змінився між перевіркою і транзакцією (наприклад, запис уже скасовано)
    if (slotUpdate.count === 0 || bookingUpdate.count === 0) {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Запис уже скасовано або змінено');
    }
    return tx.booking.findUnique({ where: { id: bookingId }, select: bookingSelect });
  });
}
