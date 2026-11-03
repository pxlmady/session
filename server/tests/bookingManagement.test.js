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
let admin;
let slot;

beforeEach(async () => {
  await resetDatabase();
  teacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher@test.local',
    fullName: 'Викладач Тестовий',
    department: 'Кафедра ТЦР',
  });
  otherTeacher = await createUserWithToken({ role: 'TEACHER', email: 'teacher2@test.local' });
  student = await createUserWithToken({
    role: 'STUDENT',
    email: 'student@test.local',
    fullName: 'Студент Тестовий',
    studentGroup: 'ТЦР-41',
  });
  otherStudent = await createUserWithToken({ role: 'STUDENT', email: 'student2@test.local' });
  admin = await createUserWithToken({ role: 'ADMIN', email: 'admin@test.local' });
  slot = (await request(app).post('/api/slots').set(teacher.auth).send(futureRange(3)).expect(201))
    .body;
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const book = async (who, slotId = slot.id) =>
  (
    await request(app)
      .post('/api/bookings')
      .set(who.auth)
      .send({ slotId, topic: TOPIC })
      .expect(201)
  ).body;
const action = (name, who, id) => request(app).patch(`/api/bookings/${id}/${name}`).set(who.auth);
const confirm = (who, id) => action('confirm', who, id);
const reject = (who, id) => action('reject', who, id);
const cancel = (who, id) => action('cancel', who, id);
const myBookings = (who, query = '') => request(app).get(`/api/bookings/my${query}`).set(who.auth);
const bookingStatus = async (id) => (await prisma.booking.findUnique({ where: { id } })).status;
const slotStatus = async (id) => (await prisma.slot.findUnique({ where: { id } })).status;

// Запис на слот, який уже розпочався або минув (через API такий запис створити не можна)
async function startedBooking({ startMinutes = -30, endMinutes = 0, status = 'PENDING' } = {}) {
  const past = await prisma.slot.create({
    data: {
      teacherId: teacher.user.id,
      startAt: minutesFromNow(startMinutes),
      endAt: minutesFromNow(endMinutes),
      status: 'BOOKED',
    },
  });
  return prisma.booking.create({
    data: { slotId: past.id, studentId: student.user.id, topic: TOPIC, status },
  });
}

describe('TC-11. Підтвердження запису (FR-21)', () => {
  test('PENDING → CONFIRMED: 200, слот залишається BOOKED', async () => {
    const booking = await book(student);
    const res = await confirm(teacher, booking.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: booking.id,
      slotId: slot.id,
      studentId: student.user.id,
      topic: TOPIC,
      status: 'CONFIRMED',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(await bookingStatus(booking.id)).toBe('CONFIRMED');
    expect(await slotStatus(slot.id)).toBe('BOOKED');
  });

  test('підтвердження скасованого запису: 409, статус не змінюється', async () => {
    const booking = await book(student);
    await cancel(student, booking.id).expect(200);
    expectErrorFormat(await confirm(teacher, booking.id), 409, 'INVALID_STATUS_TRANSITION');
    expect(await bookingStatus(booking.id)).toBe('CANCELLED');
    expect(await slotStatus(slot.id)).toBe('FREE');
  });

  test('повторне підтвердження CONFIRMED: 409', async () => {
    const booking = await book(student);
    await confirm(teacher, booking.id).expect(200);
    expectErrorFormat(await confirm(teacher, booking.id), 409, 'INVALID_STATUS_TRANSITION');
  });

  test('після початку консультації: 409 BOOKING_STARTED', async () => {
    const booking = await startedBooking();
    expectErrorFormat(await confirm(teacher, booking.id), 409, 'BOOKING_STARTED');
    expect(await bookingStatus(booking.id)).toBe('PENDING');
  });

  test('чужий викладач: 403; студент і адміністратор: 403; неіснуючий запис: 404', async () => {
    const booking = await book(student);
    expectErrorFormat(await confirm(otherTeacher, booking.id), 403, 'FORBIDDEN');
    expectErrorFormat(await confirm(student, booking.id), 403, 'FORBIDDEN');
    expectErrorFormat(await confirm(admin, booking.id), 403, 'FORBIDDEN');
    expect(await bookingStatus(booking.id)).toBe('PENDING');
    expectErrorFormat(await confirm(teacher, 999999), 404, 'BOOKING_NOT_FOUND');
    expectErrorFormat(await confirm(teacher, 'abc'), 400, 'VALIDATION_ERROR');
  });
});

describe('FR-21. Відхилення запису', () => {
  test('PENDING → CANCELLED, слот повертається у FREE і доступний для бронювання', async () => {
    const booking = await book(student);
    const res = await reject(teacher, booking.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: booking.id, status: 'CANCELLED' });
    expect(await slotStatus(slot.id)).toBe('FREE');

    const free = await request(app).get(`/api/teachers/${teacher.user.id}/slots`).set(student.auth);
    expect(free.body.map((s) => s.id)).toEqual([slot.id]);
    await book(otherStudent);
  });

  test('відхилити підтверджений або скасований запис неможливо: 409', async () => {
    const booking = await book(student);
    await confirm(teacher, booking.id).expect(200);
    expectErrorFormat(await reject(teacher, booking.id), 409, 'INVALID_STATUS_TRANSITION');
    expect(await bookingStatus(booking.id)).toBe('CONFIRMED');
    expect(await slotStatus(slot.id)).toBe('BOOKED');

    await cancel(teacher, booking.id).expect(200);
    expectErrorFormat(await reject(teacher, booking.id), 409, 'INVALID_STATUS_TRANSITION');
  });

  test('чужий викладач і студент: 403, запис і слот не змінюються', async () => {
    const booking = await book(student);
    expectErrorFormat(await reject(otherTeacher, booking.id), 403, 'FORBIDDEN');
    expectErrorFormat(await reject(student, booking.id), 403, 'FORBIDDEN');
    expect(await bookingStatus(booking.id)).toBe('PENDING');
    expect(await slotStatus(slot.id)).toBe('BOOKED');
  });

  test('після початку консультації: 409 BOOKING_STARTED', async () => {
    const booking = await startedBooking();
    expectErrorFormat(await reject(teacher, booking.id), 409, 'BOOKING_STARTED');
    expect(await bookingStatus(booking.id)).toBe('PENDING');
  });
});

describe('FR-20. Скасування підтвердженого запису', () => {
  test('студент скасовує CONFIRMED: CANCELLED, слот FREE', async () => {
    const booking = await book(student);
    await confirm(teacher, booking.id).expect(200);
    const res = await cancel(student, booking.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(await slotStatus(slot.id)).toBe('FREE');
  });

  test('підтверджений запис після початку консультації: 409, статуси не змінюються', async () => {
    const booking = await startedBooking({ status: 'CONFIRMED' });
    expectErrorFormat(await cancel(student, booking.id), 409, 'BOOKING_STARTED');
    expectErrorFormat(await cancel(teacher, booking.id), 409, 'BOOKING_STARTED');
    expect(await bookingStatus(booking.id)).toBe('CONFIRMED');
    expect(await slotStatus(booking.slotId)).toBe('BOOKED');
  });

  test('адміністратор не скасовує записи: 403', async () => {
    const booking = await book(student);
    expectErrorFormat(await cancel(admin, booking.id), 403, 'FORBIDDEN');
  });
});

describe('Цілісність переходів статусів', () => {
  test('одночасні підтвердження і скасування: запис і слот в узгодженому стані', async () => {
    for (let i = 0; i < 5; i += 1) {
      const booking = await book(student);
      const [c, x] = await Promise.all([confirm(teacher, booking.id), cancel(student, booking.id)]);
      expect(x.status).toBe(200);
      expect([200, 409]).toContain(c.status);
      expect(await bookingStatus(booking.id)).toBe('CANCELLED');
      expect(await slotStatus(slot.id)).toBe('FREE');
    }
  });

  test('одночасні відхилення і скасування: успішна лише одна дія', async () => {
    const booking = await book(student);
    const results = await Promise.all([reject(teacher, booking.id), cancel(student, booking.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await bookingStatus(booking.id)).toBe('CANCELLED');
    expect(await slotStatus(slot.id)).toBe('FREE');
  });

  test('якщо слот тим часом заброньовано повторно, старий запис не змінює новий: 409', async () => {
    const first = await book(student);
    await cancel(student, first.id).expect(200);
    const second = await book(otherStudent);
    expectErrorFormat(await cancel(student, first.id), 409, 'INVALID_STATUS_TRANSITION');
    expectErrorFormat(await reject(teacher, first.id), 409, 'INVALID_STATUS_TRANSITION');
    expect(await bookingStatus(second.id)).toBe('PENDING');
    expect(await slotStatus(slot.id)).toBe('BOOKED');
  });
});

describe('FR-18, FR-19. Мої записи (GET /api/bookings/my)', () => {
  test('студент бачить лише власні записи з викладачем, часом, місцем, темою та статусом', async () => {
    const own = await book(student);
    const otherSlot = (
      await request(app).post('/api/slots').set(teacher.auth).send(futureRange(4)).expect(201)
    ).body;
    await book(otherStudent, otherSlot.id);

    const res = await myBookings(student);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: own.id,
        slotId: slot.id,
        studentId: student.user.id,
        topic: TOPIC,
        status: 'PENDING',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        slot: {
          id: slot.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          location: null,
          status: 'BOOKED',
          teacher: {
            id: teacher.user.id,
            fullName: 'Викладач Тестовий',
            department: 'Кафедра ТЦР',
          },
        },
        student: {
          id: student.user.id,
          fullName: 'Студент Тестовий',
          email: 'student@test.local',
          studentGroup: 'ТЦР-41',
        },
      },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  test('викладач бачить лише записи на власні слоти, разом зі скасованими', async () => {
    const a = await book(student);
    await reject(teacher, a.id).expect(200);
    const b = await book(otherStudent);
    const foreignSlot = (
      await request(app).post('/api/slots').set(otherTeacher.auth).send(futureRange(3)).expect(201)
    ).body;
    await book(student, foreignSlot.id);

    const res = await myBookings(teacher).expect(200);
    expect(res.body.map((x) => [x.id, x.status])).toEqual([
      [a.id, 'CANCELLED'],
      [b.id, 'PENDING'],
    ]);
    expect(res.body[1].student.email).toBe('student2@test.local');

    expect((await myBookings(otherTeacher).expect(200)).body).toHaveLength(1);
  });

  test('сортування за часом початку слота; майбутні (upcoming) і минулі (past)', async () => {
    const later = (
      await request(app).post('/api/slots').set(teacher.auth).send(futureRange(5)).expect(201)
    ).body;
    const earlier = (
      await request(app).post('/api/slots').set(teacher.auth).send(futureRange(1)).expect(201)
    ).body;
    // Бронювання в порядку, відмінному від часу консультацій
    const bLater = await book(student, later.id);
    const bMiddle = await book(student, slot.id);
    const bEarlier = await book(student, earlier.id);
    const finished = await startedBooking({ startMinutes: -120, endMinutes: -60 });
    const inProgress = await startedBooking({ startMinutes: -10, endMinutes: 20 });

    const all = (await myBookings(student).expect(200)).body.map((x) => x.id);
    expect(all).toEqual([finished.id, inProgress.id, bEarlier.id, bMiddle.id, bLater.id]);

    // Консультація, що триває, ще не минула
    const upcoming = (await myBookings(student, '?period=upcoming').expect(200)).body;
    expect(upcoming.map((x) => x.id)).toEqual([inProgress.id, bEarlier.id, bMiddle.id, bLater.id]);
    const past = (await myBookings(student, '?period=past').expect(200)).body;
    expect(past.map((x) => x.id)).toEqual([finished.id]);

    const teacherPast = (await myBookings(teacher, '?period=past').expect(200)).body;
    expect(teacherPast.map((x) => x.id)).toEqual([finished.id]);
  });

  test('некоректний period: 400; адміністратор: 403; без токена: 401', async () => {
    expectErrorFormat(await myBookings(student, '?period=soon'), 400, 'VALIDATION_ERROR');
    expectErrorFormat(await myBookings(admin), 403, 'FORBIDDEN');
    expectErrorFormat(await request(app).get('/api/bookings/my'), 401, 'UNAUTHORIZED');
  });

  test('немає записів: порожній масив', async () => {
    expect((await myBookings(otherStudent).expect(200)).body).toEqual([]);
  });
});
