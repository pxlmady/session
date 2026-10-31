import { prisma } from '../src/lib/prisma.js';
import { publicUserSelect, signToken } from '../src/services/auth.service.js';

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

// Користувач, створений безпосередньо в БД, і його токен (без виклику API реєстрації).
// Хеш пароля тут не перевіряється, тому використовується фіктивне значення.
export async function createUserWithToken({ role, email, fullName, department, studentGroup }) {
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'not-used-in-tests',
      fullName: fullName ?? email,
      role,
      department,
      studentGroup,
    },
    select: publicUserSelect,
  });
  const token = signToken(user);
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

// Момент часу, зміщений від поточного на задану кількість хвилин
export function minutesFromNow(minutes) {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  date.setUTCSeconds(0, 0);
  return date;
}

// Слот у майбутньому: через dayOffset днів, тривалістю durationMinutes
export function futureRange(dayOffset, startHourUtc = 10, durationMinutes = 30) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + dayOffset);
  start.setUTCHours(startHourUtc, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function expectErrorFormat(res, status, code) {
  expect({ status: res.status, body: res.body }).toEqual({
    status,
    body: { error: { code, message: expect.any(String), details: expect.any(Array) } },
  });
}
