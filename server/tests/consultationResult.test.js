import request from 'supertest';
import { MockAcademicProvider } from '../src/academic/index.js';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import {
  createUserWithToken,
  expectErrorFormat,
  futureRange,
  minutesFromNow,
  resetDatabase,
} from './helpers.js';

// Етап 9б. Результат консультації і закриття заборгованості викладачем:
// GET /api/bookings/:id/result-options, PATCH /api/bookings/:id/complete

const app = createApp();
const mock = new MockAcademicProvider();
const TOPIC = 'Вебпрограмування: незахищена лабораторна робота';
// Відкриті заборгованості DEMO-S-1001: D1001-02 (Вебпрограмування), D1001-01 (Бази даних);
// D1001-03 (Вища математика) закрита в джерелі
const WEB_DEBT = 'D1001-02';
const DB_DEBT = 'D1001-01';

let teacher;
let otherTeacher;
let student; // зіставлений з DEMO-S-1001
let unlinkedStudent;
let admin;
let subjects; // externalId → id
let slot;

beforeEach(async () => {
  await resetDatabase();
  subjects = {};
  for (const { externalId, name } of await mock.listSubjects()) {
    subjects[externalId] = (await prisma.subject.create({ data: { externalId, name } })).id;
  }
  teacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher@test.local',
    fullName: 'Викладач Перший',
  });
  otherTeacher = await createUserWithToken({ role: 'TEACHER', email: 'teacher2@test.local' });
  student = await createUserWithToken({ role: 'STUDENT', email: 'student@test.local' });
  unlinkedStudent = await createUserWithToken({ role: 'STUDENT', email: 'student2@test.local' });
  admin = await createUserWithToken({ role: 'ADMIN', email: 'admin@test.local' });
  await prisma.academicDataMapping.create({
    data: { userId: student.user.id, provider: 'mock', externalId: 'DEMO-S-1001' },
  });
  slot = await newSlot(3);
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const WEB = () => subjects['DEMO-SUBJ-WEB'];

// Слот о 20:00 UTC (22:00 за Києвом) не перетинається із заняттями демонстраційного розкладу
async function newSlot(dayOffset) {
  const res = await request(app)
    .post('/api/slots')
    .set(teacher.auth)
    .send(futureRange(dayOffset, 20))
    .expect(201);
  return res.body;
}
const book = async ({ who = student, subjectId = WEB(), slotId = slot.id } = {}) =>
  (
    await request(app)
      .post('/api/bookings')
      .set(who.auth)
      .send({ slotId, topic: TOPIC, ...(subjectId ? { subjectId } : {}) })
      .expect(201)
  ).body;
const confirm = (id) =>
  request(app).patch(`/api/bookings/${id}/confirm`).set(teacher.auth).expect(200);
const complete = (who, id, body, appInstance = app) =>
  request(appInstance).patch(`/api/bookings/${id}/complete`).set(who.auth).send(body);
const closable = (who, id, appInstance = app) =>
  request(appInstance).get(`/api/bookings/${id}/result-options`).set(who.auth);
const myDebts = (who, query = '') =>
  request(app).get(`/api/academic/me/debts${query}`).set(who.auth).expect(200);
// Перенесення слота в минуле: консультація завершилася 30 хвилин тому
const finishSlot = (slotId = slot.id) =>
  prisma.slot.update({
    where: { id: slotId },
    data: { startAt: minutesFromNow(-60), endAt: minutesFromNow(-30) },
  });
const stored = (id) =>
  prisma.booking.findUnique({
    where: { id },
    select: {
      status: true,
      conductedAt: true,
      teacherNote: true,
      debtClosure: { select: { debtId: true } },
      gradeEntry: { select: { score: true } },
    },
  });

async function finishedConfirmedBooking(options) {
  const booking = await book(options);
  await confirm(booking.id);
  await finishSlot(booking.slotId);
  return booking;
}

// Постачальник, що імітує збій джерела
const failingApp = () => {
  const provider = new MockAcademicProvider();
  provider.getStudentDebts = async () => {
    throw new Error('збій');
  };
  return createApp({ academicProvider: provider });
};

describe('Результат консультації після її завершення', () => {
  test('викладач позначає консультацію проведеною з рекомендацією: 200', async () => {
    const booking = await finishedConfirmedBooking();
    const res = await complete(teacher, booking.id, {
      note: '  Повторіть тему REST API  ',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: booking.id,
      slotId: slot.id,
      studentId: student.user.id,
      subjectId: WEB(),
      topic: TOPIC,
      status: 'CONFIRMED',
      conductedAt: expect.any(String),
      teacherNote: 'Повторіть тему REST API',
      debtClosure: null,
      gradeEntry: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect((await prisma.slot.findUnique({ where: { id: slot.id } })).status).toBe('BOOKED');
    // Без закриття заборгованості відкриті заборгованості студента не змінюються
    expect((await myDebts(student)).body.data.map((debt) => debt.id)).toEqual([WEB_DEBT, DB_DEBT]);
  });

  test('без тіла запиту: рекомендації та закриття немає', async () => {
    const booking = await finishedConfirmedBooking();
    await complete(teacher, booking.id).expect(200);
    expect(await stored(booking.id)).toEqual({
      status: 'CONFIRMED',
      conductedAt: expect.any(Date),
      teacherNote: null,
      debtClosure: null,
      gradeEntry: null,
    });
  });

  test('до завершення консультації: 409 BOOKING_NOT_FINISHED, запис не змінюється', async () => {
    const booking = await book();
    await confirm(booking.id);
    expectErrorFormat(await complete(teacher, booking.id, {}), 409, 'BOOKING_NOT_FINISHED');
    expectErrorFormat(await closable(teacher, booking.id), 409, 'BOOKING_NOT_FINISHED');
    // Консультація триває (почалася, але не завершилася) – теж зарано
    await prisma.slot.update({
      where: { id: slot.id },
      data: { startAt: minutesFromNow(-10), endAt: minutesFromNow(20) },
    });
    expectErrorFormat(
      await complete(teacher, booking.id, { closeDebtId: WEB_DEBT }),
      409,
      'BOOKING_NOT_FINISHED',
    );
    expect(await stored(booking.id)).toMatchObject({ conductedAt: null, debtClosure: null });
  });

  test('непідтверджений або скасований запис: 409 INVALID_STATUS_TRANSITION', async () => {
    const pending = await book();
    await finishSlot();
    expectErrorFormat(await complete(teacher, pending.id, {}), 409, 'INVALID_STATUS_TRANSITION');
    expectErrorFormat(await closable(teacher, pending.id), 409, 'INVALID_STATUS_TRANSITION');
    await prisma.booking.update({ where: { id: pending.id }, data: { status: 'CANCELLED' } });
    expectErrorFormat(await complete(teacher, pending.id, {}), 409, 'INVALID_STATUS_TRANSITION');
    expect((await stored(pending.id)).conductedAt).toBeNull();
  });

  test('повторна фіксація: 409 BOOKING_ALREADY_COMPLETED, результат не перезаписується', async () => {
    const booking = await finishedConfirmedBooking();
    await complete(teacher, booking.id, { note: 'Перша рекомендація' }).expect(200);
    expectErrorFormat(
      await complete(teacher, booking.id, { note: 'Друга', closeDebtId: WEB_DEBT }),
      409,
      'BOOKING_ALREADY_COMPLETED',
    );
    expectErrorFormat(await closable(teacher, booking.id), 409, 'BOOKING_ALREADY_COMPLETED');
    expect(await stored(booking.id)).toMatchObject({
      teacherNote: 'Перша рекомендація',
      debtClosure: null,
    });
  });

  test('чужий викладач, студент і адміністратор: 403', async () => {
    const booking = await finishedConfirmedBooking();
    for (const who of [otherTeacher, student, admin]) {
      expectErrorFormat(await complete(who, booking.id, {}), 403, 'FORBIDDEN');
      expectErrorFormat(await closable(who, booking.id), 403, 'FORBIDDEN');
    }
    expect((await stored(booking.id)).conductedAt).toBeNull();
  });

  test('без токена: 401; неіснуючий запис: 404', async () => {
    const booking = await finishedConfirmedBooking();
    expectErrorFormat(
      await request(app).patch(`/api/bookings/${booking.id}/complete`),
      401,
      'UNAUTHORIZED',
    );
    expectErrorFormat(
      await request(app).get(`/api/bookings/${booking.id}/result-options`),
      401,
      'UNAUTHORIZED',
    );
    expectErrorFormat(await complete(teacher, booking.id + 1000, {}), 404, 'BOOKING_NOT_FOUND');
    expectErrorFormat(await closable(teacher, booking.id + 1000), 404, 'BOOKING_NOT_FOUND');
  });

  test('перевірка даних: рекомендація понад 500 символів, нерядковий closeDebtId – 400', async () => {
    const booking = await finishedConfirmedBooking();
    expectErrorFormat(
      await complete(teacher, booking.id, { note: 'а'.repeat(501) }),
      400,
      'VALIDATION_ERROR',
    );
    expectErrorFormat(
      await complete(teacher, booking.id, { closeDebtId: 7 }),
      400,
      'VALIDATION_ERROR',
    );
    expect((await stored(booking.id)).conductedAt).toBeNull();
  });
});

describe('Закриття заборгованості викладачем', () => {
  test('викладач бачить лише відкриті заборгованості з дисципліни запису', async () => {
    const booking = await finishedConfirmedBooking();
    const res = await closable(teacher, booking.id).expect(200);
    expect(res.body).toEqual({
      subject: { id: WEB(), name: expect.any(String) },
      available: true,
      debts: [
        {
          id: WEB_DEBT,
          debtType: expect.any(String),
          description: expect.any(String),
          deadline: '2026-11-28',
        },
      ],
      grading: {
        semester: 5,
        controlTypes: expect.arrayContaining(['Екзамен', 'Залік', 'Лабораторна робота']),
        passingScore: 60,
      },
    });
  });

  test('запис без дисципліни або незіставлений студент: список порожній', async () => {
    const noSubject = await finishedConfirmedBooking({ subjectId: null });
    expect((await closable(teacher, noSubject.id).expect(200)).body).toEqual({
      subject: null,
      available: true,
      debts: [],
      grading: null,
    });

    const second = await newSlot(4);
    const unlinked = await finishedConfirmedBooking({ who: unlinkedStudent, slotId: second.id });
    expect((await closable(teacher, unlinked.id).expect(200)).body).toMatchObject({
      available: false,
      debts: [],
      grading: null,
    });
  });

  test('закриття: 200, заборгованість стає закритою для студента', async () => {
    const booking = await finishedConfirmedBooking();
    const res = await complete(teacher, booking.id, { closeDebtId: WEB_DEBT }).expect(200);
    expect(res.body.debtClosure).toEqual({
      debtId: WEB_DEBT,
      debtTitle: expect.any(String),
      createdAt: expect.any(String),
    });

    expect((await myDebts(student)).body.data.map((debt) => debt.id)).toEqual([DB_DEBT]);
    const all = (await myDebts(student, '?status=all')).body.data;
    expect(all).toHaveLength(3);
    expect(all.find((debt) => debt.id === WEB_DEBT)).toMatchObject({
      status: 'closed',
      closedInSession: {
        closedAt: expect.any(String),
        bookingId: booking.id,
        teacherName: 'Викладач Перший',
      },
    });
    // Заборгованість, закрита в самому джерелі, позначки Session не має
    expect(all.find((debt) => debt.id === 'D1001-03')).toMatchObject({
      status: 'closed',
      closedInSession: null,
    });
  });

  test('закриття видно в «Моїх записах» студента й викладача', async () => {
    const booking = await finishedConfirmedBooking();
    await complete(teacher, booking.id, { note: 'Рекомендація', closeDebtId: WEB_DEBT });
    for (const who of [student, teacher]) {
      const res = await request(app).get('/api/bookings/my?period=past').set(who.auth).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: booking.id,
        status: 'CONFIRMED',
        conductedAt: expect.any(String),
        teacherNote: 'Рекомендація',
        debtClosure: { debtId: WEB_DEBT, debtTitle: expect.any(String) },
      });
    }
  });

  test('заборгованість з іншої дисципліни, закрита в джерелі або неіснуюча: 409 DEBT_NOT_CLOSABLE', async () => {
    const booking = await finishedConfirmedBooking();
    for (const closeDebtId of [DB_DEBT, 'D1001-03', 'D-НЕМАЄ', 'D1002-01']) {
      expectErrorFormat(
        await complete(teacher, booking.id, { closeDebtId }),
        409,
        'DEBT_NOT_CLOSABLE',
      );
    }
    // Результат не зафіксовано частково: запис і заборгованості без змін
    expect(await stored(booking.id)).toMatchObject({ conductedAt: null, debtClosure: null });
    expect((await myDebts(student)).body.data).toHaveLength(2);
  });

  test('запис без дисципліни: закрити заборгованість не можна (409)', async () => {
    const booking = await finishedConfirmedBooking({ subjectId: null });
    expectErrorFormat(
      await complete(teacher, booking.id, { closeDebtId: WEB_DEBT }),
      409,
      'DEBT_NOT_CLOSABLE',
    );
  });

  test('уже закриту заборгованість не можна закрити другим записом', async () => {
    const first = await finishedConfirmedBooking();
    await complete(teacher, first.id, { closeDebtId: WEB_DEBT }).expect(200);

    const secondSlot = await newSlot(4);
    const second = await finishedConfirmedBooking({ slotId: secondSlot.id });
    expect((await closable(teacher, second.id).expect(200)).body.debts).toEqual([]);
    expectErrorFormat(
      await complete(teacher, second.id, { closeDebtId: WEB_DEBT }),
      409,
      'DEBT_NOT_CLOSABLE',
    );
    expect(await prisma.debtClosure.count()).toBe(1);
  });

  test('джерело недоступне: список порожній (available = false), закриття – 503, без закриття – 200', async () => {
    const booking = await finishedConfirmedBooking();
    const broken = failingApp();
    expect((await closable(teacher, booking.id, broken).expect(200)).body).toMatchObject({
      available: false,
      debts: [],
      grading: null,
    });
    expectErrorFormat(
      await complete(teacher, booking.id, { closeDebtId: WEB_DEBT }, broken),
      503,
      'ACADEMIC_PROVIDER_UNAVAILABLE',
    );
    expect((await stored(booking.id)).conductedAt).toBeNull();
    await complete(teacher, booking.id, { note: 'Без закриття' }, broken).expect(200);
  });

  test('викладач не отримує інших академічних даних студента', async () => {
    for (const path of ['profile', 'records', 'debts']) {
      expectErrorFormat(
        await request(app).get(`/api/academic/me/${path}`).set(teacher.auth),
        403,
        'FORBIDDEN',
      );
    }
  });
});

describe('Оцінка від викладача після консультації', () => {
  const myRecords = (who, query = '') =>
    request(app).get(`/api/academic/me/records${query}`).set(who.auth).expect(200);

  test('оцінка: 200, з’являється в успішності студента поточного семестру', async () => {
    const booking = await finishedConfirmedBooking();
    const res = await complete(teacher, booking.id, {
      grade: { controlType: 'Лабораторна робота', score: 82 },
    }).expect(200);
    expect(res.body.gradeEntry).toEqual({
      semester: 5,
      controlType: 'Лабораторна робота',
      score: 82,
      nationalGrade: 'Добре',
      createdAt: expect.any(String),
    });

    const records = (await myRecords(student, '?semester=5')).body.data;
    expect(records).toEqual([
      {
        id: expect.stringMatching(/^SESSION-\d+$/),
        subject: { id: WEB(), name: expect.any(String) },
        semester: 5,
        controlType: 'Лабораторна робота',
        score: 82,
        nationalGrade: 'Добре',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        setInSession: { bookingId: booking.id, teacherName: 'Викладач Перший' },
      },
    ]);
    // Оцінки з джерела залишаються без змін
    expect((await myRecords(student)).body.data).toHaveLength(7);
    expect((await myRecords(student, '?semester=4')).body.data).toHaveLength(3);
  });

  test('оцінка разом із закриттям заборгованості та рекомендацією', async () => {
    const booking = await finishedConfirmedBooking();
    const res = await complete(teacher, booking.id, {
      note: 'Добре',
      closeDebtId: WEB_DEBT,
      grade: { controlType: 'Залік', score: 65 },
    }).expect(200);
    expect(res.body).toMatchObject({
      teacherNote: 'Добре',
      debtClosure: { debtId: WEB_DEBT },
      gradeEntry: { controlType: 'Залік', score: 65, nationalGrade: 'Зараховано' },
    });
    const mine = await request(app).get('/api/bookings/my?period=past').set(student.auth);
    expect(mine.body[0].gradeEntry).toMatchObject({ score: 65, nationalGrade: 'Зараховано' });
  });

  test('національна шкала: межі 90 / 74 / 60 і незадовільна оцінка', async () => {
    const cases = [
      [90, 'Екзамен', 'Відмінно'],
      [74, 'Екзамен', 'Добре'],
      [60, 'Диференційований залік', 'Задовільно'],
      [59, 'Екзамен', 'Незадовільно'],
      [40, 'Залік', 'Не зараховано'],
    ];
    for (const [index, [score, controlType, expected]] of cases.entries()) {
      const nextSlot = await newSlot(4 + index);
      const booking = await finishedConfirmedBooking({ slotId: nextSlot.id });
      const res = await complete(teacher, booking.id, { grade: { controlType, score } });
      expect(res.status).toBe(200);
      expect(res.body.gradeEntry.nationalGrade).toBe(expected);
    }
  });

  test('перевірка даних оцінки: 400, результат не фіксується', async () => {
    const booking = await finishedConfirmedBooking();
    for (const grade of [
      { controlType: 'Екзамен', score: 101 },
      { controlType: 'Екзамен', score: -1 },
      { controlType: 'Екзамен', score: 70.5 },
      { controlType: 'Екзамен', score: '70' },
      { controlType: 'Іспит', score: 70 },
      { score: 70 },
      'Добре',
    ]) {
      expectErrorFormat(await complete(teacher, booking.id, { grade }), 400, 'VALIDATION_ERROR');
    }
    expect(await stored(booking.id)).toMatchObject({ conductedAt: null, gradeEntry: null });
  });

  test('запис без дисципліни або незіставлений студент: 409 GRADE_NOT_ALLOWED', async () => {
    const grade = { controlType: 'Екзамен', score: 75 };
    const noSubject = await finishedConfirmedBooking({ subjectId: null });
    expectErrorFormat(await complete(teacher, noSubject.id, { grade }), 409, 'GRADE_NOT_ALLOWED');

    const second = await newSlot(4);
    const unlinked = await finishedConfirmedBooking({ who: unlinkedStudent, slotId: second.id });
    expectErrorFormat(await complete(teacher, unlinked.id, { grade }), 409, 'GRADE_NOT_ALLOWED');
    expect(await prisma.gradeEntry.count()).toBe(0);
  });

  test('джерело недоступне: оцінка – 503, нічого не зберігається', async () => {
    const booking = await finishedConfirmedBooking();
    expectErrorFormat(
      await complete(
        teacher,
        booking.id,
        { grade: { controlType: 'Екзамен', score: 75 } },
        failingApp(),
      ),
      503,
      'ACADEMIC_PROVIDER_UNAVAILABLE',
    );
    expect(await stored(booking.id)).toMatchObject({ conductedAt: null, gradeEntry: null });
  });

  test('повторно виставити оцінку за той самий запис не можна', async () => {
    const booking = await finishedConfirmedBooking();
    await complete(teacher, booking.id, { grade: { controlType: 'Екзамен', score: 75 } }).expect(
      200,
    );
    expectErrorFormat(
      await complete(teacher, booking.id, { grade: { controlType: 'Екзамен', score: 95 } }),
      409,
      'BOOKING_ALREADY_COMPLETED',
    );
    expect(await prisma.gradeEntry.count()).toBe(1);
  });
});
