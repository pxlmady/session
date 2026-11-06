import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { ROLES } from '../validation/admin.schemas.js';
import { publicUserSelect } from './auth.service.js';

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'];

// Лічильники за всіма значеннями переліку, зокрема нульові
function countBy(groups, field, keys) {
  const result = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const group of groups) result[group[field]] = group._count._all;
  return result;
}

// FR-25: базова статистика (ТЗ, п. 4.1.3): користувачі за ролями, кількість слотів,
// записи за статусами і записи в розрізі викладачів (усі статуси).
// У розрізі викладачів показуються поточні викладачі, а також користувачі, які мають
// слоти, але роль яких змінено, щоб записи не зникали зі статистики.
export async function getStats() {
  const [roleGroups, slotsTotal, statusGroups, teachers] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.slot.count(),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.findMany({
      where: { OR: [{ role: 'TEACHER' }, { slots: { some: {} } }] },
      select: {
        id: true,
        fullName: true,
        slots: { select: { _count: { select: { bookings: true } } } },
      },
    }),
  ]);

  const bookingsByTeacher = teachers
    .map((teacher) => ({
      teacherId: teacher.id,
      fullName: teacher.fullName,
      count: teacher.slots.reduce((sum, slot) => sum + slot._count.bookings, 0),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.fullName.localeCompare(b.fullName, 'uk') ||
        a.teacherId - b.teacherId,
    );

  return {
    usersByRole: countBy(roleGroups, 'role', ROLES),
    slotsTotal,
    bookingsByStatus: countBy(statusGroups, 'status', BOOKING_STATUSES),
    bookingsByTeacher,
  };
}

// FR-26: список користувачів без хешу пароля (TC-12)
export function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    select: publicUserSelect,
  });
}

// FR-26: зміна ролі користувача. Адміністратор не може змінити власну роль, тому в системі
// завжди залишається щонайменше один адміністратор. Нова роль діє з наступного запиту
// користувача: middleware auth читає роль із БД.
export async function changeUserRole(admin, userId, role) {
  if (userId === admin.id) {
    throw new AppError(409, 'CANNOT_CHANGE_OWN_ROLE', 'Адміністратор не може змінити власну роль');
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Користувача не знайдено');
  }
  if (user.role === role) return user;

  return prisma.user.update({ where: { id: userId }, data: { role }, select: publicUserSelect });
}
