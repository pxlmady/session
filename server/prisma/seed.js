// Початкове заповнення бази даних Session (ТЗ розділ 9.5).
// Створює адміністратора з ADMIN_EMAIL і ADMIN_PASSWORD. Якщо задано SEED_DEMO_PASSWORD,
// додатково створює тестових викладачів, студентів і майбутні вільні слоти (вигадані дані).
// Академічна інтеграція (ТЗ п. 4.1.5): довідник дисциплін заповнюється з постачальника
// ACADEMIC_PROVIDER (у прототипі – mock) завжди; для тестових облікових записів додатково
// створюються зіставлення AcademicDataMapping, зв'язки викладач – дисципліна і слот,
// що перетинається із заняттям демонстраційного студента (для показу перевірки накладок).
// Повторний запуск безпечний: наявні записи не дублюються.
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { createAcademicProvider } from '../src/academic/index.js';

const BCRYPT_ROUNDS = 10;
const prisma = new PrismaClient();

// Правила email і пароля відповідають таблиці валідації ТЗ (розділ 11)
function normalizeEmail(value, name) {
  const email = value?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${name}: потрібен коректний email (не більше 254 символів).`);
  }
  return email;
}

function checkPassword(value, name) {
  if (
    !value ||
    value.length < 8 ||
    value.length > 72 ||
    !/\p{L}/u.test(value) ||
    !/\d/.test(value)
  ) {
    throw new Error(
      `${name}: пароль має містити 8–72 символи, щонайменше одну літеру та одну цифру.`,
    );
  }
  return value;
}

async function seedAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL, 'ADMIN_EMAIL');
  const password = checkPassword(process.env.ADMIN_PASSWORD, 'ADMIN_PASSWORD');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', passwordHash },
    create: { email, passwordHash, fullName: 'Адміністратор Session', role: 'ADMIN' },
  });
  console.log(`Адміністратор: ${admin.email} (id ${admin.id})`);
}

const DEMO_TEACHERS = [
  {
    email: 'teacher1@session.local',
    fullName: 'Викладач Тестовий Перший',
    department: 'Кафедра 1',
  },
  {
    email: 'teacher2@session.local',
    fullName: 'Викладач Тестовий Другий',
    department: 'Кафедра 2',
  },
];

const DEMO_STUDENTS = [
  { email: 'student1@session.local', fullName: 'Студент Тестовий Перший', studentGroup: 'Група 1' },
  { email: 'student2@session.local', fullName: 'Студент Тестовий Другий', studentGroup: 'Група 2' },
];

// Слоти тривалістю 30 хв на наступні три дні о 10:00 і 14:00 UTC
function demoSlotTimes() {
  const times = [];
  for (let day = 1; day <= 3; day += 1) {
    for (const hour of [10, 14]) {
      const startAt = new Date();
      startAt.setUTCDate(startAt.getUTCDate() + day);
      startAt.setUTCHours(hour, 0, 0, 0);
      times.push({ startAt, endAt: new Date(startAt.getTime() + 30 * 60 * 1000) });
    }
  }
  return times;
}

async function seedDemo(password) {
  const passwordHash = await bcrypt.hash(
    checkPassword(password, 'SEED_DEMO_PASSWORD'),
    BCRYPT_ROUNDS,
  );

  for (const student of DEMO_STUDENTS) {
    await prisma.user.upsert({
      where: { email: student.email },
      update: {},
      create: { ...student, passwordHash, role: 'STUDENT' },
    });
  }

  for (const [index, data] of DEMO_TEACHERS.entries()) {
    const teacher = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: { ...data, passwordHash, role: 'TEACHER' },
    });

    // Слоти створюються лише для викладача, який ще не має слотів
    const existing = await prisma.slot.count({ where: { teacherId: teacher.id } });
    if (existing === 0) {
      await prisma.slot.createMany({
        data: demoSlotTimes().map((time) => ({
          ...time,
          teacherId: teacher.id,
          location: index === 0 ? 'Аудиторія 101' : 'https://meet.example.com/session-demo',
        })),
      });
    }
  }

  const accounts = [...DEMO_TEACHERS, ...DEMO_STUDENTS].map((user) => user.email).join(', ');
  console.log(`Тестові облікові записи (пароль із SEED_DEMO_PASSWORD): ${accounts}`);
}

// Зіставлення тестових облікових записів із профілями демонстраційного постачальника.
// Зовнішній ідентифікатор задає лише цей сценарій (FR-27, таблиця 4.9).
const DEMO_ACADEMIC_MAPPING = {
  'student1@session.local': 'DEMO-S-1001',
  'student2@session.local': 'DEMO-S-1002',
  'teacher1@session.local': 'DEMO-T-01',
  'teacher2@session.local': 'DEMO-T-02',
};

// Довідник дисциплін Session з даних постачальника
async function seedSubjects(provider) {
  const subjects = await provider.listSubjects();
  for (const { externalId, name } of subjects) {
    await prisma.subject.upsert({
      where: { externalId },
      update: { name },
      create: { externalId, name },
    });
  }
  console.log(`Дисципліни (${provider.name}): ${subjects.length}`);
}

async function seedDemoAcademic(provider) {
  const users = await prisma.user.findMany({
    where: { email: { in: Object.keys(DEMO_ACADEMIC_MAPPING) } },
    select: { id: true, email: true, role: true },
  });

  for (const user of users) {
    const externalId = DEMO_ACADEMIC_MAPPING[user.email];
    await prisma.academicDataMapping.upsert({
      where: { userId: user.id },
      update: { provider: provider.name, externalId },
      create: { userId: user.id, provider: provider.name, externalId },
    });

    if (user.role === 'TEACHER') {
      const subjectExternalIds = await provider.getTeacherSubjects(externalId);
      const subjects = await prisma.subject.findMany({
        where: { externalId: { in: subjectExternalIds } },
        select: { id: true },
      });
      await prisma.teacherSubject.createMany({
        data: subjects.map((subject) => ({ teacherId: user.id, subjectId: subject.id })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`Зіставлено з демонстраційними профілями: ${users.map((u) => u.email).join(', ')}`);

  await seedConflictSlot(provider, users);
}

// Слот першого викладача, що перетинається з найближчим заняттям першого студента.
// Створюється, лише якщо такого вільного слота ще немає.
async function seedConflictSlot(provider, users) {
  const teacher = users.find((user) => user.email === 'teacher1@session.local');
  const student = users.find((user) => user.email === 'student1@session.local');
  if (!teacher || !student) return;

  const now = new Date();
  const from = new Date(now.getTime() + 60 * 60 * 1000);
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const classes = (
    await provider.getStudentSchedule(DEMO_ACADEMIC_MAPPING[student.email], { from, to })
  )
    .map((entry) => ({ ...entry, startAt: new Date(entry.startAt), endAt: new Date(entry.endAt) }))
    .filter((entry) => entry.startAt > from);
  if (classes.length === 0) return;

  const freeSlots = await prisma.slot.findMany({
    where: { teacherId: teacher.id, status: 'FREE', startAt: { gt: now } },
    select: { startAt: true, endAt: true },
  });
  const hasConflict = freeSlots.some((slot) =>
    classes.some((entry) => slot.startAt < entry.endAt && entry.startAt < slot.endAt),
  );
  if (hasConflict) return;

  const startAt = new Date(classes[0].startAt.getTime() + 20 * 60 * 1000);
  await prisma.slot.create({
    data: {
      teacherId: teacher.id,
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
      location: 'Аудиторія 101',
    },
  });
  console.log(
    `Створено слот із накладкою на заняття демонстраційного студента: ${startAt.toISOString()}`,
  );
}

try {
  await seedAdmin();
  const academicProvider = createAcademicProvider(process.env.ACADEMIC_PROVIDER || 'mock');
  await seedSubjects(academicProvider);
  if (process.env.SEED_DEMO_PASSWORD) {
    await seedDemo(process.env.SEED_DEMO_PASSWORD);
    await seedDemoAcademic(academicProvider);
  } else {
    console.log('SEED_DEMO_PASSWORD не задано: тестові дані не створюються.');
  }
} catch (err) {
  console.error('Помилка початкового заповнення:', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
