import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { auth, requireRole } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { resetDatabase, validStudent, validTeacher } from './helpers.js';

// Ліміт спроб автентифікації піднято, щоб він не впливав на інші перевірки
const app = createApp({ authRateLimit: { limit: 1000 } });

async function registerAndLogin(data) {
  await request(app).post('/api/auth/register').send(data).expect(201);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: data.email, password: data.password })
    .expect(200);
  return res.body.token;
}

function expectErrorFormat(res, status, code) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({
    error: { code, message: expect.any(String), details: expect.any(Array) },
  });
}

beforeEach(resetDatabase);

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('TC-01. Реєстрація (FR-01)', () => {
  test('коректні дані: 201, пароль збережено як bcrypt-хеш, passwordHash не повертається', async () => {
    const res = await request(app).post('/api/auth/register').send(validStudent);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: validStudent.email,
      fullName: validStudent.fullName,
      role: 'STUDENT',
      studentGroup: validStudent.studentGroup,
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const stored = await prisma.user.findUnique({ where: { email: validStudent.email } });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(stored.passwordHash).not.toContain(validStudent.password);
  });

  test('повторна реєстрація з тим самим email: 409', async () => {
    await request(app).post('/api/auth/register').send(validStudent).expect(201);

    // Той самий email з іншим регістром і пробілами також вважається зайнятим
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validTeacher, email: '  STUDENT@Test.Local ' });

    expectErrorFormat(res, 409, 'EMAIL_ALREADY_EXISTS');
  });

  test('роль TEACHER під час реєстрації дозволена', async () => {
    const res = await request(app).post('/api/auth/register').send(validTeacher).expect(201);
    expect(res.body.user.role).toBe('TEACHER');
  });

  test('роль ADMIN під час реєстрації заборонена: 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validStudent, role: 'ADMIN' });

    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'role', message: expect.any(String) }]);
    expect(await prisma.user.count()).toBe(0);
  });

  test('невідомі поля ігноруються, email нормалізується', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validStudent, email: '  Student@TEST.local ', passwordHash: 'x', id: 999 })
      .expect(201);

    expect(res.body.user.email).toBe('student@test.local');
    expect(res.body.user.id).not.toBe(999);
  });

  test('некоректні дані: 400 з переліком полів українською мовою', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'не-email', password: 'abcdefgh', fullName: 'А' });

    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['email', 'fullName', 'password', 'role']);
    for (const detail of res.body.error.details) {
      expect(detail.message).toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
    }
  });

  test.each([
    ['коротший за 8 символів', 'Ab1'],
    ['без цифри', 'Password'],
    ['без літери', '12345678'],
    ['довший за 72 символи', `a1${'x'.repeat(71)}`],
  ])('пароль %s: 400', async (_case, password) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validStudent, password });

    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('password');
  });

  test('некоректний JSON: 400 у єдиному форматі', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expectErrorFormat(res, 400, 'INVALID_JSON');
  });
});

describe('TC-02. Вхід (FR-02)', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validStudent).expect(201);
  });

  test('коректні дані: 200, видається JWT строком на 24 години', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validStudent.email, password: validStudent.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validStudent.email);
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const payload = jwt.decode(res.body.token);
    expect(payload.sub).toBe(String(res.body.user.id));
    expect(payload.role).toBe('STUDENT');
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  test('невірний пароль: 401 із загальним повідомленням', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validStudent.email, password: 'Wrong2026pass' });

    expectErrorFormat(res, 401, 'INVALID_CREDENTIALS');
    expect(res.body).not.toHaveProperty('token');
  });

  test('невідомий email: та сама відповідь, що й для невірного пароля', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: validStudent.email, password: 'Wrong2026pass' });
    const wrongEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.local', password: validStudent.password });

    expect(wrongEmail.status).toBe(401);
    expect(wrongEmail.body).toEqual(wrongPassword.body);
  });

  test('порожні поля: 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
  });
});

describe('TC-03. Доступ до захищених ендпоінтів (FR-03, FR-05)', () => {
  test('GET /api/auth/me без токена: 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expectErrorFormat(res, 401, 'UNAUTHORIZED');
  });

  test('GET /api/auth/me з дійсним токеном: дані користувача без passwordHash', async () => {
    const token = await registerAndLogin(validStudent);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validStudent.email);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('змінений, прострочений або чужий токен: 401', async () => {
    const token = await registerAndLogin(validStudent);
    const { sub } = jwt.decode(token);

    const tampered = `${token.slice(0, -2)}${token.endsWith('aa') ? 'bb' : 'aa'}`;
    const expired = jwt.sign({ role: 'STUDENT' }, process.env.JWT_SECRET, {
      subject: sub,
      expiresIn: -10,
    });
    const foreign = jwt.sign({ role: 'ADMIN' }, 'інший-секрет-інший-секрет-інший-секрет', {
      subject: sub,
    });

    for (const bad of [tampered, expired, foreign, 'not-a-jwt']) {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bad}`);
      expectErrorFormat(res, 401, 'UNAUTHORIZED');
    }
  });

  test('токен видаленого користувача: 401', async () => {
    const token = await registerAndLogin(validStudent);
    await prisma.user.deleteMany();

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expectErrorFormat(res, 401, 'UNAUTHORIZED');
  });

  describe('requireRole', () => {
    // Маршрути зі слотами й бронюваннями з'являться на наступних етапах,
    // тому роль перевіряємо на тестовому маршруті з тими самими middleware
    const roleApp = express();
    roleApp.get('/teacher-only', auth, requireRole('TEACHER'), (req, res) => {
      res.json({ ok: true, role: req.user.role });
    });
    roleApp.use(errorHandler);

    test('без токена: 401', async () => {
      const res = await request(roleApp).get('/teacher-only');
      expectErrorFormat(res, 401, 'UNAUTHORIZED');
    });

    test('з токеном іншої ролі: 403', async () => {
      const token = await registerAndLogin(validStudent);
      const res = await request(roleApp)
        .get('/teacher-only')
        .set('Authorization', `Bearer ${token}`);
      expectErrorFormat(res, 403, 'FORBIDDEN');
    });

    test('з токеном потрібної ролі: 200', async () => {
      const token = await registerAndLogin(validTeacher);
      const res = await request(roleApp)
        .get('/teacher-only')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, role: 'TEACHER' });
    });

    test('роль береться з БД, а не з токена', async () => {
      const token = await registerAndLogin(validStudent);
      // Підроблена роль у токені нічого не дає: діє роль, збережена в БД
      const { sub } = jwt.decode(token);
      const forged = jwt.sign({ role: 'TEACHER' }, process.env.JWT_SECRET, { subject: sub });
      const res = await request(roleApp)
        .get('/teacher-only')
        .set('Authorization', `Bearer ${forged}`);
      expectErrorFormat(res, 403, 'FORBIDDEN');
    });
  });
});
