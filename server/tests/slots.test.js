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

let teacher;
let otherTeacher;
let student;

beforeEach(async () => {
  await resetDatabase();
  teacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher@test.local',
    fullName: 'Петренко Ольга Іванівна',
    department: 'Кафедра ТЦР',
  });
  otherTeacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher2@test.local',
    fullName: 'Коваленко Андрій Петрович',
    department: 'Кафедра ІПЗ',
  });
  student = await createUserWithToken({
    role: 'STUDENT',
    email: 'student@test.local',
    fullName: 'Студент Тестовий',
  });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const createSlot = (who, body) => request(app).post('/api/slots').set(who.auth).send(body);

describe('FR-08. Створення слота', () => {
  test('коректні дані: 201, статус FREE, час у UTC, teacherId визначає сервер', async () => {
    const range = futureRange(3);
    const res = await createSlot(teacher, {
      ...range,
      location: '  ауд. 305 ',
      teacherId: otherTeacher.user.id,
      status: 'BOOKED',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      teacherId: teacher.user.id,
      startAt: range.startAt,
      endAt: range.endAt,
      location: 'ауд. 305',
      status: 'FREE',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  test('час із часовим зміщенням зберігається як той самий момент у UTC (BR-07)', async () => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 5);
    const date = day.toISOString().slice(0, 10);

    const res = await createSlot(teacher, {
      startAt: `${date}T12:00:00+02:00`,
      endAt: `${date}T12:30:00+02:00`,
    });

    expect(res.status).toBe(201);
    expect(res.body.startAt).toBe(`${date}T10:00:00.000Z`);
    expect(res.body.endAt).toBe(`${date}T10:30:00.000Z`);
    expect(res.body.location).toBeNull();
  });

  test('студент не може створити слот: 403; без токена: 401 (TC-03)', async () => {
    expectErrorFormat(await createSlot(student, futureRange(3)), 403, 'FORBIDDEN');
    const res = await request(app).post('/api/slots').send(futureRange(3));
    expectErrorFormat(res, 401, 'UNAUTHORIZED');
    expect(await prisma.slot.count()).toBe(0);
  });
});

describe('TC-04. Некоректний час слота (FR-08, BR-02)', () => {
  test('endAt дорівнює startAt: 400', async () => {
    const { startAt } = futureRange(3);
    const res = await createSlot(teacher, { startAt, endAt: startAt });
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'endAt', message: expect.any(String) }]);
  });

  test('endAt раніше за startAt: 400', async () => {
    const { startAt, endAt } = futureRange(3);
    const res = await createSlot(teacher, { startAt: endAt, endAt: startAt });
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'endAt', message: expect.any(String) }]);
  });

  test('слот у минулому: 400', async () => {
    const res = await createSlot(teacher, {
      startAt: minutesFromNow(-60).toISOString(),
      endAt: minutesFromNow(-30).toISOString(),
    });
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details).toContainEqual({
      field: 'startAt',
      message: 'Час початку має бути в майбутньому',
    });
  });

  test('відсутній час, некоректна дата або дата без часової зони: 400', async () => {
    const { startAt, endAt } = futureRange(3);
    const cases = [
      {},
      { startAt },
      { startAt: 'завтра о 10:00', endAt },
      { startAt: startAt.replace('Z', ''), endAt: endAt.replace('Z', '') },
      { startAt: 1700000000000, endAt },
      { ...futureRange(3), location: 'x'.repeat(201) },
    ];
    for (const body of cases) {
      expectErrorFormat(await createSlot(teacher, body), 400, 'VALIDATION_ERROR');
    }
    expect(await prisma.slot.count()).toBe(0);
  });
});

describe('TC-05. Перетин слотів одного викладача (FR-12, BR-03)', () => {
  beforeEach(async () => {
    // Наявний слот 10:00–11:00 через 3 дні
    await createSlot(teacher, futureRange(3, 10, 60)).expect(201);
  });

  test('слот, що перетинається з наявним: 409', async () => {
    const overlapping = [
      futureRange(3, 10, 60), // той самий час
      futureRange(3, 9, 90), // 9:00–10:30
      { ...futureRange(3, 10, 30), startAt: futureRange(3, 10, 0).startAt }, // всередині
      futureRange(3, 9, 180), // охоплює наявний
    ];
    // Початок о 10:30 – всередині наявного слота
    const inner = futureRange(3, 10, 0);
    const innerStart = new Date(new Date(inner.startAt).getTime() + 30 * 60 * 1000);
    overlapping.push({
      startAt: innerStart.toISOString(),
      endAt: new Date(innerStart.getTime() + 60 * 60 * 1000).toISOString(),
    });

    for (const range of overlapping) {
      expectErrorFormat(await createSlot(teacher, range), 409, 'SLOT_OVERLAP');
    }
    expect(await prisma.slot.count()).toBe(1);
  });

  test('суміжний слот (11:00–11:30) дозволено', async () => {
    await createSlot(teacher, futureRange(3, 11, 30)).expect(201);
  });

  test('інший викладач може створити слот на той самий час', async () => {
    await createSlot(otherTeacher, futureRange(3, 10, 60)).expect(201);
  });

  test('скасований слот не заважає створенню нового на той самий час', async () => {
    await prisma.slot.updateMany({ data: { status: 'CANCELLED' } });
    await createSlot(teacher, futureRange(3, 10, 60)).expect(201);
  });

  test('одночасні запити на створення однакових слотів: створюється лише один', async () => {
    const range = futureRange(4, 14, 30);
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => createSlot(teacher, range)),
    );
    const statuses = responses.map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
  });
});

describe('FR-09. Перегляд власних слотів', () => {
  test('лише власні слоти, упорядковані за часом, з даними про записи', async () => {
    const later = (await createSlot(teacher, futureRange(5)).expect(201)).body;
    const earlier = (await createSlot(teacher, futureRange(2)).expect(201)).body;
    await createSlot(otherTeacher, futureRange(1)).expect(201);
    await prisma.booking.create({
      data: { slotId: later.id, studentId: student.user.id, topic: 'Курсова робота' },
    });

    const res = await request(app).get('/api/slots/my').set(teacher.auth);

    expect(res.status).toBe(200);
    expect(res.body.map((slot) => slot.id)).toEqual([earlier.id, later.id]);
    expect(res.body[0].bookings).toEqual([]);
    expect(res.body[1].bookings).toEqual([
      expect.objectContaining({
        topic: 'Курсова робота',
        status: 'PENDING',
        student: {
          id: student.user.id,
          fullName: student.user.fullName,
          email: student.user.email,
          studentGroup: null,
        },
      }),
    ]);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  test('студент не має доступу: 403', async () => {
    const res = await request(app).get('/api/slots/my').set(student.auth);
    expectErrorFormat(res, 403, 'FORBIDDEN');
  });
});

describe('FR-10. Редагування слота', () => {
  let slot;
  beforeEach(async () => {
    slot = (await createSlot(teacher, { ...futureRange(3, 10, 30), location: 'ауд. 1' })).body;
  });

  const patch = (who, id, body) => request(app).patch(`/api/slots/${id}`).set(who.auth).send(body);

  test('зміна часу й місця вільного слота: 200', async () => {
    const range = futureRange(4, 12, 45);
    const res = await patch(teacher, slot.id, { ...range, location: 'https://meet.example/abc' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: slot.id,
      ...range,
      location: 'https://meet.example/abc',
      status: 'FREE',
    });
  });

  test('зміна лише місця залишає час без змін; порожнє місце зберігається як null', async () => {
    const res = await patch(teacher, slot.id, { location: '' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ startAt: slot.startAt, endAt: slot.endAt, location: null });
  });

  test('новий час у минулому або endAt ≤ startAt: 400 (BR-02)', async () => {
    expectErrorFormat(
      await patch(teacher, slot.id, { startAt: minutesFromNow(-10).toISOString() }),
      400,
      'VALIDATION_ERROR',
    );
    // Новий кінець раніше за наявний початок
    expectErrorFormat(
      await patch(teacher, slot.id, { endAt: futureRange(2).endAt }),
      400,
      'VALIDATION_ERROR',
    );
    expectErrorFormat(await patch(teacher, slot.id, {}), 400, 'VALIDATION_ERROR');
  });

  test('перетин з іншим слотом після зміни часу: 409', async () => {
    await createSlot(teacher, futureRange(3, 11, 30)).expect(201);
    const res = await patch(teacher, slot.id, futureRange(3, 11, 30));
    expectErrorFormat(res, 409, 'SLOT_OVERLAP');
  });

  test('заброньований слот редагувати не можна: 409 (BR-05)', async () => {
    await prisma.slot.update({ where: { id: slot.id }, data: { status: 'BOOKED' } });
    const res = await patch(teacher, slot.id, { location: 'ауд. 2' });
    expectErrorFormat(res, 409, 'SLOT_NOT_EDITABLE');
  });

  test('неіснуючий слот: 404; некоректний id: 400', async () => {
    expectErrorFormat(await patch(teacher, 999999, { location: 'x' }), 404, 'SLOT_NOT_FOUND');
    expectErrorFormat(await patch(teacher, 'abc', { location: 'x' }), 400, 'VALIDATION_ERROR');
    expectErrorFormat(await patch(teacher, 0, { location: 'x' }), 400, 'VALIDATION_ERROR');
  });
});

describe('FR-11. Видалення слота', () => {
  test('слот без записів видаляється: 204', async () => {
    const slot = (await createSlot(teacher, futureRange(3))).body;
    const res = await request(app).delete(`/api/slots/${slot.id}`).set(teacher.auth);
    expect(res.status).toBe(204);
    expect(await prisma.slot.findUnique({ where: { id: slot.id } })).toBeNull();
  });

  test('слот із записом переходить у CANCELLED, активний запис скасовується: 200', async () => {
    const slot = (await createSlot(teacher, futureRange(3))).body;
    await prisma.slot.update({ where: { id: slot.id }, data: { status: 'BOOKED' } });
    const booking = await prisma.booking.create({
      data: { slotId: slot.id, studentId: student.user.id, topic: 'Тема' },
    });

    const res = await request(app).delete(`/api/slots/${slot.id}`).set(teacher.auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: slot.id, status: 'CANCELLED' });
    const stored = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(stored.status).toBe('CANCELLED');

    // Повторне видалення скасованого слота – недопустимий перехід статусу
    const again = await request(app).delete(`/api/slots/${slot.id}`).set(teacher.auth);
    expectErrorFormat(again, 409, 'INVALID_STATUS_TRANSITION');
  });

  test('неіснуючий слот: 404', async () => {
    const res = await request(app).delete('/api/slots/999999').set(teacher.auth);
    expectErrorFormat(res, 404, 'SLOT_NOT_FOUND');
  });
});

describe('TC-10. Викладач не може змінити чужий слот (FR-05)', () => {
  test('редагування та видалення чужого слота: 403, слот не змінюється', async () => {
    const slot = (await createSlot(teacher, { ...futureRange(3), location: 'ауд. 1' })).body;

    const patchRes = await request(app)
      .patch(`/api/slots/${slot.id}`)
      .set(otherTeacher.auth)
      .send({ location: 'чужа зміна' });
    expectErrorFormat(patchRes, 403, 'FORBIDDEN');

    const deleteRes = await request(app).delete(`/api/slots/${slot.id}`).set(otherTeacher.auth);
    expectErrorFormat(deleteRes, 403, 'FORBIDDEN');

    const stored = await prisma.slot.findUnique({ where: { id: slot.id } });
    expect(stored).toMatchObject({ location: 'ауд. 1', status: 'FREE' });
  });

  test('студент не може редагувати або видаляти слот: 403', async () => {
    const slot = (await createSlot(teacher, futureRange(3))).body;
    const patchRes = await request(app)
      .patch(`/api/slots/${slot.id}`)
      .set(student.auth)
      .send({ location: 'x' });
    expectErrorFormat(patchRes, 403, 'FORBIDDEN');
    const deleteRes = await request(app).delete(`/api/slots/${slot.id}`).set(student.auth);
    expectErrorFormat(deleteRes, 403, 'FORBIDDEN');
  });
});

describe('FR-13. Список викладачів', () => {
  test('лише викладачі (ПІБ, кафедра), упорядковані за ПІБ, без email і passwordHash', async () => {
    const res = await request(app).get('/api/teachers').set(student.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: otherTeacher.user.id,
        fullName: 'Коваленко Андрій Петрович',
        department: 'Кафедра ІПЗ',
      },
      { id: teacher.user.id, fullName: 'Петренко Ольга Іванівна', department: 'Кафедра ТЦР' },
    ]);
  });

  test('пошук за частиною ПІБ без урахування регістру', async () => {
    const res = await request(app)
      .get('/api/teachers')
      .query({ search: ' пЕтРеН ' })
      .set(student.auth);
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.id)).toEqual([teacher.user.id]);
  });

  test('без токена: 401', async () => {
    expectErrorFormat(await request(app).get('/api/teachers'), 401, 'UNAUTHORIZED');
  });
});

describe('FR-14. Вільні слоти викладача', () => {
  test('лише майбутні вільні слоти обраного викладача, упорядковані за часом', async () => {
    const later = (await createSlot(teacher, futureRange(5))).body;
    const earlier = (await createSlot(teacher, futureRange(2))).body;
    const booked = (await createSlot(teacher, futureRange(3))).body;
    const cancelled = (await createSlot(teacher, futureRange(4))).body;
    await prisma.slot.update({ where: { id: booked.id }, data: { status: 'BOOKED' } });
    await prisma.slot.update({ where: { id: cancelled.id }, data: { status: 'CANCELLED' } });
    // Минулий вільний слот (створюється безпосередньо в БД)
    await prisma.slot.create({
      data: {
        teacherId: teacher.user.id,
        startAt: minutesFromNow(-120),
        endAt: minutesFromNow(-90),
      },
    });
    await createSlot(otherTeacher, futureRange(2)).expect(201);

    const res = await request(app).get(`/api/teachers/${teacher.user.id}/slots`).set(student.auth);

    expect(res.status).toBe(200);
    expect(res.body.map((slot) => slot.id)).toEqual([earlier.id, later.id]);
    expect(res.body.every((slot) => slot.status === 'FREE')).toBe(true);
  });

  test('неіснуючий викладач або користувач не викладач: 404; некоректний id: 400', async () => {
    const missing = await request(app).get('/api/teachers/999999/slots').set(student.auth);
    expectErrorFormat(missing, 404, 'TEACHER_NOT_FOUND');
    const notTeacher = await request(app)
      .get(`/api/teachers/${student.user.id}/slots`)
      .set(student.auth);
    expectErrorFormat(notTeacher, 404, 'TEACHER_NOT_FOUND');
    const invalid = await request(app).get('/api/teachers/-1/slots').set(student.auth);
    expectErrorFormat(invalid, 400, 'VALIDATION_ERROR');
  });
});
