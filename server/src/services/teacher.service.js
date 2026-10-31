import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { slotSelect, teacherSelect } from '../lib/selects.js';

// FR-13: список викладачів з пошуком за ПІБ (без урахування регістру)
export function listTeachers(search) {
  return prisma.user.findMany({
    where: {
      role: 'TEACHER',
      ...(search ? { fullName: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    select: teacherSelect,
  });
}

// FR-14: майбутні вільні слоти викладача, упорядковані за часом початку
export async function listFreeSlots(teacherId) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: 'TEACHER' },
    select: { id: true },
  });
  if (!teacher) {
    throw new AppError(404, 'TEACHER_NOT_FOUND', 'Викладача не знайдено');
  }

  return prisma.slot.findMany({
    where: { teacherId, status: 'FREE', startAt: { gt: new Date() } },
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    select: slotSelect,
  });
}
