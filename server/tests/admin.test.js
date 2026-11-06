import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createUserWithToken, expectErrorFormat, futureRange, resetDatabase } from './helpers.js';

const app = createApp();
const TOPIC = 'Питання щодо структури курсової роботи';

let admin;
let teacher;
let otherTeacher;
let student;
let otherStudent;

beforeEach(async () => {
  await resetDatabase();
  admin = await createUserWithToken({
    role: 'ADMIN',
    email: 'admin@test.local',
    fullName: 'Адмін',
  });
  teacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher@test.local',
    fullName: 'Викладач Перший',
    department: 'Кафедра ТЦР',
  });
  otherTeacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher2@test.local',
    fullName: 'Викладач Другий',
  });
  student = await createUserWithToken({
    role: 'STUDENT',
    email: 'student@test.local',
    fullName: 'Студент Перший',
    studentGroup: 'ТЦР-41',
  });
  otherStudent = await createUserWithToken({
    role: 'STUDENT',
    email: 'student2@test.local',
    fullName: 'Студент Другий',
  });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const createSlot = async (who, dayOffset) =>
  (await request(app).post('/api/slots').set(who.auth).send(futureRange(dayOffset)).expect(201))
    .body;
const book = async (who, slotId) =>
  (
    await request(app)
      .post('/api/bookings')
      .set(who.auth)
      .send({ slotId, topic: TOPIC })
      .expect(201)
  ).body;

describe('TC-13: доступ до API адміністрування', () => {
  const endpoints = [
    ['get', '/api/admin/stats'],
    ['get', '/api/admin/users'],
    ['patch', '/api/admin/users/1/role'],
  ];

  test.each(endpoints)('%s %s без токена → 401', async (method, path) => {
    const res = await request(app)[method](path).send({ role: 'TEACHER' });
    expectErrorFormat(res, 401, 'UNAUTHORIZED');
  });

  test.each(endpoints)('%s %s для студента і викладача → 403', async (method, path) => {
    for (const who of [student, teacher]) {
      const res = await request(app)[method](path).set(who.auth).send({ role: 'ADMIN' });
      expectErrorFormat(res, 403, 'FORBIDDEN');
    }
    // Спроба самопризначення не змінила роль студента
    const me = await request(app).get('/api/auth/me').set(student.auth).expect(200);
    expect(me.body.user.role).toBe('STUDENT');
  });

  test('статистика доступна адміністратору (200)', async () => {
    await request(app).get('/api/admin/stats').set(admin.auth).expect(200);
  });
});

describe('GET /api/admin/stats', () => {
  test('порожні лічильники мають нульові значення', async () => {
    await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } });
    const res = await request(app).get('/api/admin/stats').set(admin.auth).expect(200);
    expect(res.body).toEqual({
      usersByRole: { STUDENT: 0, TEACHER: 0, ADMIN: 1 },
      slotsTotal: 0,
      bookingsByStatus: { PENDING: 0, CONFIRMED: 0, CANCELLED: 0 },
      bookingsByTeacher: [],
    });
  });

  test('користувачі за ролями, слоти, записи за статусами і за викладачами', async () => {
    const slot1 = await createSlot(teacher, 2);
    const slot2 = await createSlot(teacher, 3);
    const slot3 = await createSlot(teacher, 4);
    await createSlot(otherTeacher, 2);

    await book(student, slot1.id);
    const confirmed = await book(otherStudent, slot2.id);
    await request(app).patch(`/api/bookings/${confirmed.id}/confirm`).set(teacher.auth).expect(200);
    const cancelled = await book(student, slot3.id);
    await request(app).patch(`/api/bookings/${cancelled.id}/cancel`).set(student.auth).expect(200);

    const res = await request(app).get('/api/admin/stats').set(admin.auth).expect(200);
    expect(res.body).toEqual({
      usersByRole: { STUDENT: 2, TEACHER: 2, ADMIN: 1 },
      slotsTotal: 4,
      bookingsByStatus: { PENDING: 1, CONFIRMED: 1, CANCELLED: 1 },
      bookingsByTeacher: [
        { teacherId: teacher.user.id, fullName: 'Викладач Перший', count: 3 },
        { teacherId: otherTeacher.user.id, fullName: 'Викладач Другий', count: 0 },
      ],
    });
  });

  test('записи викладача, роль якого змінено, залишаються в статистиці', async () => {
    const slot = await createSlot(teacher, 2);
    await book(student, slot.id);
    await request(app)
      .patch(`/api/admin/users/${teacher.user.id}/role`)
      .set(admin.auth)
      .send({ role: 'STUDENT' })
      .expect(200);

    const res = await request(app).get('/api/admin/stats').set(admin.auth).expect(200);
    expect(res.body.usersByRole).toEqual({ STUDENT: 3, TEACHER: 1, ADMIN: 1 });
    expect(res.body.bookingsByTeacher).toContainEqual({
      teacherId: teacher.user.id,
      fullName: 'Викладач Перший',
      count: 1,
    });
  });
});

describe('GET /api/admin/users', () => {
  test('повертає всіх користувачів без хешу пароля (TC-12)', async () => {
    const res = await request(app).get('/api/admin/users').set(admin.auth).expect(200);
    expect(res.body).toHaveLength(5);
    expect(res.body.map((u) => u.email).sort()).toEqual([
      'admin@test.local',
      'student2@test.local',
      'student@test.local',
      'teacher2@test.local',
      'teacher@test.local',
    ]);
    const expectedKeys = [
      'createdAt',
      'department',
      'email',
      'fullName',
      'id',
      'role',
      'studentGroup',
      'updatedAt',
    ];
    for (const user of res.body) {
      expect(Object.keys(user).sort()).toEqual(expectedKeys);
    }
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.body.find((u) => u.id === teacher.user.id)).toMatchObject({
      fullName: 'Викладач Перший',
      role: 'TEACHER',
      department: 'Кафедра ТЦР',
    });
  });
});

describe('PATCH /api/admin/users/:id/role', () => {
  const changeRole = (id, body, who = admin) =>
    request(app).patch(`/api/admin/users/${id}/role`).set(who.auth).send(body);

  test('змінює роль; нова роль діє з наступного запиту користувача', async () => {
    const res = await changeRole(student.user.id, { role: 'TEACHER' }).expect(200);
    expect(res.body).toEqual({
      user: expect.objectContaining({ id: student.user.id, role: 'TEACHER' }),
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    // Токен виданий до зміни, але роль читається з БД: тепер користувач створює слоти
    const me = await request(app).get('/api/auth/me').set(student.auth).expect(200);
    expect(me.body.user.role).toBe('TEACHER');
    const slot = await createSlot(student, 2);
    await request(app)
      .post('/api/bookings')
      .set(student.auth)
      .send({ slotId: slot.id, topic: TOPIC })
      .expect(403);
  });

  test('призначення адміністратором відкриває доступ до /api/admin', async () => {
    await changeRole(teacher.user.id, { role: 'ADMIN' }).expect(200);
    await request(app).get('/api/admin/stats').set(teacher.auth).expect(200);
  });

  test('та сама роль – 200 без змін', async () => {
    const res = await changeRole(student.user.id, { role: 'STUDENT' }).expect(200);
    expect(res.body.user.role).toBe('STUDENT');
  });

  test('адміністратор не може змінити власну роль (409)', async () => {
    const res = await changeRole(admin.user.id, { role: 'STUDENT' });
    expectErrorFormat(res, 409, 'CANNOT_CHANGE_OWN_ROLE');
    const me = await request(app).get('/api/auth/me').set(admin.auth).expect(200);
    expect(me.body.user.role).toBe('ADMIN');
  });

  test('роль поза переліком або відсутня – 400', async () => {
    for (const body of [{ role: 'SUPERADMIN' }, { role: 'student' }, {}, { role: 1 }]) {
      const res = await changeRole(student.user.id, body);
      expectErrorFormat(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.details[0].field).toBe('role');
    }
  });

  test('неіснуючий користувач – 404, некоректний id – 400', async () => {
    expectErrorFormat(await changeRole(999999, { role: 'TEACHER' }), 404, 'USER_NOT_FOUND');
    expectErrorFormat(await changeRole('abc', { role: 'TEACHER' }), 400, 'VALIDATION_ERROR');
  });
});
