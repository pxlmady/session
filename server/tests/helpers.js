import { prisma } from '../src/lib/prisma.js';

// Очищення таблиць тестової БД (порядок враховує зовнішні ключі)
export async function resetDatabase() {
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.user.deleteMany();
}

export const validStudent = {
  email: 'student@test.local',
  password: 'Student2026',
  fullName: 'Студент Тестовий',
  role: 'STUDENT',
  studentGroup: 'ТЦР-41',
};

export const validTeacher = {
  email: 'teacher@test.local',
  password: 'Teacher2026',
  fullName: 'Викладач Тестовий',
  role: 'TEACHER',
  department: 'Кафедра ТЦР',
};
