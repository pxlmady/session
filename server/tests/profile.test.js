import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createUserWithToken, expectErrorFormat, resetDatabase } from './helpers.js';

const app = createApp();

let student;
let teacher;
let admin;

beforeEach(async () => {
  await resetDatabase();
  student = await createUserWithToken({
    role: 'STUDENT',
    email: 'student@test.local',
    fullName: 'Студент Тестовий',
    studentGroup: 'ТЦР-41',
  });
  teacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher@test.local',
    fullName: 'Викладач Тестовий',
    department: 'Кафедра ТЦР',
  });
  admin = await createUserWithToken({ role: 'ADMIN', email: 'admin@test.local' });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const me = (who) => request(app).get('/api/auth/me').set(who.auth);
const patchMe = (who, body) => request(app).patch('/api/users/me').set(who.auth).send(body);

describe('FR-06. Перегляд власного профілю', () => {
  test('студент бачить ПІБ, email, роль і групу; викладач – кафедру; без passwordHash', async () => {
    const s = await me(student).expect(200);
    expect(s.body.user).toMatchObject({
      email: 'student@test.local',
      fullName: 'Студент Тестовий',
      role: 'STUDENT',
      studentGroup: 'ТЦР-41',
    });
    const t = await me(teacher).expect(200);
    expect(t.body.user).toMatchObject({ role: 'TEACHER', department: 'Кафедра ТЦР' });
    expect(s.body.user).not.toHaveProperty('passwordHash');
    expect(t.body.user).not.toHaveProperty('passwordHash');
  });
});

describe('FR-07. Редагування профілю (PATCH /api/users/me)', () => {
  test('студент змінює ПІБ і групу; пробіли обрізаються; відповідь як у /auth/me', async () => {
    const res = await patchMe(student, { fullName: '  Нове ПІБ  ', studentGroup: ' ТЦР-42 ' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: student.user.id,
      fullName: 'Нове ПІБ',
      studentGroup: 'ТЦР-42',
      email: 'student@test.local',
      role: 'STUDENT',
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect((await me(student)).body.user.fullName).toBe('Нове ПІБ');
  });

  test('викладач змінює кафедру; порожній рядок очищає поле', async () => {
    const res = await patchMe(teacher, { department: 'Кафедра ІПЗ' }).expect(200);
    expect(res.body.user.department).toBe('Кафедра ІПЗ');
    const cleared = await patchMe(teacher, { department: '  ' }).expect(200);
    expect(cleared.body.user.department).toBeNull();
  });

  test('email і роль самостійно не змінюються (поля відкидаються)', async () => {
    const res = await patchMe(student, {
      fullName: 'Студент Змінений',
      email: 'hacker@test.local',
      role: 'ADMIN',
      passwordHash: 'x',
    });
    expect(res.status).toBe(200);
    const stored = await prisma.user.findUnique({ where: { id: student.user.id } });
    expect(stored).toMatchObject({
      email: 'student@test.local',
      role: 'STUDENT',
      passwordHash: 'not-used-in-tests',
    });
  });

  test('лише email або роль у запиті: 400, нічого не змінюється', async () => {
    expectErrorFormat(await patchMe(student, { role: 'TEACHER' }), 400, 'VALIDATION_ERROR');
    expectErrorFormat(await patchMe(student, {}), 400, 'VALIDATION_ERROR');
    expect((await prisma.user.findUnique({ where: { id: student.user.id } })).role).toBe('STUDENT');
  });

  test('поле іншої ролі: студент – кафедра, викладач – група, адміністратор – обидва: 400', async () => {
    const s = await patchMe(student, { department: 'Кафедра' });
    expectErrorFormat(s, 400, 'VALIDATION_ERROR');
    expect(s.body.error.details).toEqual([{ field: 'department', message: expect.any(String) }]);

    const t = await patchMe(teacher, { fullName: 'Нове ПІБ', studentGroup: 'ТЦР-41' });
    expectErrorFormat(t, 400, 'VALIDATION_ERROR');
    expect(t.body.error.details).toEqual([{ field: 'studentGroup', message: expect.any(String) }]);
    // Запит з помилкою не змінює жодного поля
    expect((await prisma.user.findUnique({ where: { id: teacher.user.id } })).fullName).toBe(
      'Викладач Тестовий',
    );

    expectErrorFormat(await patchMe(admin, { department: 'Кафедра' }), 400, 'VALIDATION_ERROR');
    const a = await patchMe(admin, { fullName: 'Адміністратор Session' });
    expect(a.status).toBe(200);
    expect(a.body.user.fullName).toBe('Адміністратор Session');
  });

  test.each([
    ['закоротке ПІБ', { fullName: 'А' }, 'fullName'],
    ['задовге ПІБ', { fullName: 'А'.repeat(101) }, 'fullName'],
    ['ПІБ з пробілів', { fullName: '   ' }, 'fullName'],
    ['ПІБ не рядок', { fullName: 42 }, 'fullName'],
    ['задовга група', { studentGroup: 'Г'.repeat(101) }, 'studentGroup'],
  ])('%s: 400 з помилкою поля', async (_case, body, field) => {
    const res = await patchMe(student, body);
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  test('без токена: 401', async () => {
    const res = await request(app).patch('/api/users/me').send({ fullName: 'Хтось Інший' });
    expectErrorFormat(res, 401, 'UNAUTHORIZED');
  });
});
