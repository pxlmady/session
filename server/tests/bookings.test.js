import http from 'node:http';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import {
  createUserWithToken,
  expectErrorFormat,
  futureRange,
  minutesFromNow,
  resetDatabase,
} from './helpers.js';

const app = createApp();
const TOPIC = 'Питання щодо структури курсової роботи';

let teacher;
let otherTeacher;
let student;
let otherStudent;
let slot;

beforeEach(async () => {
  await resetDatabase();
  teacher = await createUserWithToken({ role: 'TEACHER', email: 'teacher@test.local' });
  otherTeacher = await createUserWithToken({ role: 'TEACHER', email: 'teacher2@test.local' });
  student = await createUserWithToken({ role: 'STUDENT', email: 'student@test.local' });
  otherStudent = await createUserWithToken({ role: 'STUDENT', email: 'student2@test.local' });
  slot = (await request(app).post('/api/slots').set(teacher.auth).send(futureRange(3)).expect(201))
    .body;
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const book = (who, body) => request(app).post('/api/bookings').set(who.auth).send(body);
const cancel = (who, id) => request(app).patch(`/api/bookings/${id}/cancel`).set(who.auth);
const slotStatus = async (id) => (await prisma.slot.findUnique({ where: { id } })).status;

describe('TC-06. Бронювання вільного слота (FR-15)', () => {
  test('201, запис PENDING у форматі п. 10.4, слот отримує статус BOOKED', async () => {
    const res = await book(student, {
      slotId: slot.id,
      topic: `  ${TOPIC} `,
      // Поля, які визначає сервер, від клієнта не приймаються
      studentId: otherStudent.user.id,
      status: 'CONFIRMED',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      slotId: slot.id,
      studentId: student.user.id,
      subjectId: null,
      topic: TOPIC,
      status: 'PENDING',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      // Етап 8 (FR-36): студент без зіставлення – бронювання без перевірки накладок
      scheduleCheck: 'UNAVAILABLE',
    });
    expect(await slotStatus(slot.id)).toBe('BOOKED');

    // Слот зникає зі списку вільних слотів викладача
    const free = await request(app).get(`/api/teachers/${teacher.user.id}/slots`).set(student.auth);
    expect(free.body).toEqual([]);
  });

  test('бронювання вже зайнятого слота: 409 «Слот уже зайнято»', async () => {
    await book(student, { slotId: slot.id, topic: TOPIC }).expect(201);
    const res = await book(otherStudent, { slotId: slot.id, topic: TOPIC });
    expectErrorFormat(res, 409, 'SLOT_ALREADY_BOOKED');
    expect(res.body.error.message).toBe('Слот уже зайнято');
  });

  test('викладач не може бронювати слоти: 403', async () => {
    expectErrorFormat(await book(teacher, { slotId: slot.id, topic: TOPIC }), 403, 'FORBIDDEN');
    expect(await slotStatus(slot.id)).toBe('FREE');
  });

  test('неіснуючий слот: 404; скасований слот: 409', async () => {
    expectErrorFormat(await book(student, { slotId: 999999, topic: TOPIC }), 404, 'SLOT_NOT_FOUND');
    await prisma.slot.update({ where: { id: slot.id }, data: { status: 'CANCELLED' } });
    expectErrorFormat(
      await book(student, { slotId: slot.id, topic: TOPIC }),
      409,
      'SLOT_NOT_AVAILABLE',
    );
  });
});

describe('FR-17. Бронювання слота, час початку якого настав', () => {
  test('минулий слот: 409, запис не створюється', async () => {
    const past = await prisma.slot.create({
      data: { teacherId: teacher.user.id, startAt: minutesFromNow(-30), endAt: minutesFromNow(0) },
    });
    const res = await book(student, { slotId: past.id, topic: TOPIC });
    expectErrorFormat(res, 409, 'SLOT_IN_PAST');
    expect(await prisma.booking.count()).toBe(0);
    expect(await slotStatus(past.id)).toBe('FREE');
  });
});

describe('TC-07. Одночасні запити на бронювання одного слота (FR-16, BR-04)', () => {
  test('10 одночасних запитів: рівно один 201, решта 409; у БД один активний запис', async () => {
    const students = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createUserWithToken({ role: 'STUDENT', email: `concurrent${i}@test.local` }),
      ),
    );

    // Справжній HTTP-сервер: запити надходять паралельно через окремі з'єднання
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const responses = await Promise.all(
        students.map((s) =>
          request(server).post('/api/bookings').set(s.auth).send({ slotId: slot.id, topic: TOPIC }),
        ),
      );

      const created = responses.filter((res) => res.status === 201);
      const conflicts = responses.filter((res) => res.status === 409);
      expect(created).toHaveLength(1);
      expect(conflicts).toHaveLength(9);
      for (const res of conflicts) {
        expect(res.body.error.code).toBe('SLOT_ALREADY_BOOKED');
      }

      const active = await prisma.booking.findMany({
        where: { slotId: slot.id, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(created[0].body.id);
      expect(await prisma.booking.count()).toBe(1);
      expect(await slotStatus(slot.id)).toBe('BOOKED');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('частковий унікальний індекс БД відхиляє другий активний запис', async () => {
    await book(student, { slotId: slot.id, topic: TOPIC }).expect(201);

    // Пряме створення другого активного запису в обхід сервісу відхиляє сама БД
    await expect(
      prisma.booking.create({
        data: { slotId: slot.id, studentId: otherStudent.user.id, topic: TOPIC },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    // Навіть якщо статус слота помилково повернуто у FREE, індекс не допускає подвійного запису,
    // а API повертає 409
    await prisma.slot.update({ where: { id: slot.id }, data: { status: 'FREE' } });
    const res = await book(otherStudent, { slotId: slot.id, topic: TOPIC });
    expectErrorFormat(res, 409, 'SLOT_ALREADY_BOOKED');
    expect(await prisma.booking.count()).toBe(1);
    // Транзакцію відкочено: умовне оновлення слота не збережено
    expect(await slotStatus(slot.id)).toBe('FREE');
  });
});

describe('TC-08. Валідація бронювання (FR-15)', () => {
  test('без теми: 400 з помилкою поля topic, слот залишається вільним', async () => {
    const res = await book(student, { slotId: slot.id });
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'topic', message: 'Вкажіть тему запитання' }]);
    expect(await slotStatus(slot.id)).toBe('FREE');
  });

  test('тема з пробілів, закоротка або задовга: 400', async () => {
    for (const topic of ['   ', 'ab', 'x'.repeat(501), 42]) {
      const res = await book(student, { slotId: slot.id, topic });
      expectErrorFormat(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.details[0].field).toBe('topic');
    }
  });

  test('відсутній або некоректний slotId: 400', async () => {
    for (const slotId of [undefined, 'abc', '1', -1, 0, 1.5, 2 ** 31]) {
      const res = await book(student, { slotId, topic: TOPIC });
      expectErrorFormat(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.details[0].field).toBe('slotId');
    }
    expect(await prisma.booking.count()).toBe(0);
  });
});

describe('TC-09. Скасування запису (FR-20)', () => {
  test('студент скасовує запис: CANCELLED, слот FREE, повторне бронювання можливе', async () => {
    const booking = (await book(student, { slotId: slot.id, topic: TOPIC }).expect(201)).body;

    const res = await cancel(student, booking.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: booking.id, status: 'CANCELLED' });
    expect(await slotStatus(slot.id)).toBe('FREE');

    const rebooked = await book(otherStudent, { slotId: slot.id, topic: 'Інше питання' });
    expect(rebooked.status).toBe(201);
    expect(await slotStatus(slot.id)).toBe('BOOKED');
  });

  test('викладач скасовує запис на власний слот', async () => {
    const booking = (await book(student, { slotId: slot.id, topic: TOPIC }).expect(201)).body;
    const res = await cancel(teacher, booking.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(await slotStatus(slot.id)).toBe('FREE');
  });

  test('повторне скасування: 409; неіснуючий запис: 404', async () => {
    const booking = (await book(student, { slotId: slot.id, topic: TOPIC }).expect(201)).body;
    await cancel(student, booking.id).expect(200);
    expectErrorFormat(await cancel(student, booking.id), 409, 'INVALID_STATUS_TRANSITION');
    expectErrorFormat(await cancel(student, 999999), 404, 'BOOKING_NOT_FOUND');
  });

  test('після початку консультації скасування заборонене: 409 (BR-05)', async () => {
    const past = await prisma.slot.create({
      data: {
        teacherId: teacher.user.id,
        startAt: minutesFromNow(-30),
        endAt: minutesFromNow(0),
        status: 'BOOKED',
      },
    });
    const booking = await prisma.booking.create({
      data: { slotId: past.id, studentId: student.user.id, topic: TOPIC },
    });
    expectErrorFormat(await cancel(student, booking.id), 409, 'BOOKING_STARTED');
    expect((await prisma.booking.findUnique({ where: { id: booking.id } })).status).toBe('PENDING');
  });
});

describe('TC-10. Скасування чужого запису (FR-05, FR-20)', () => {
  test('інший студент або інший викладач: 403, запис і слот не змінюються', async () => {
    const booking = (await book(student, { slotId: slot.id, topic: TOPIC }).expect(201)).body;

    expectErrorFormat(await cancel(otherStudent, booking.id), 403, 'FORBIDDEN');
    expectErrorFormat(await cancel(otherTeacher, booking.id), 403, 'FORBIDDEN');

    expect((await prisma.booking.findUnique({ where: { id: booking.id } })).status).toBe('PENDING');
    expect(await slotStatus(slot.id)).toBe('BOOKED');
  });

  test('без токена: 401', async () => {
    const booking = (await book(student, { slotId: slot.id, topic: TOPIC }).expect(201)).body;
    const res = await request(app).patch(`/api/bookings/${booking.id}/cancel`);
    expectErrorFormat(res, 401, 'UNAUTHORIZED');
  });
});
