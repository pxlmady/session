import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers.js';

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('Базові заходи безпеки (ТЗ, розділ 12)', () => {
  const app = createApp({ authRateLimit: { limit: 1000 } });

  test('helmet встановлює заголовки безпеки', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('CORS дозволяє лише адресу CLIENT_URL', async () => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const allowed = await request(app).get('/api/health').set('Origin', clientUrl);
    expect(allowed.headers['access-control-allow-origin']).toBe(clientUrl);

    const other = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(other.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });

  test('невідомий маршрут: 404 у єдиному форматі', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.any(String), details: [] },
    });
  });

  test('перевищення частоти запитів до автентифікації: 429', async () => {
    const limitedApp = createApp({ authRateLimit: { limit: 3 } });
    const body = { email: 'nobody@test.local', password: 'Wrong2026pass' };

    for (let i = 0; i < 3; i += 1) {
      await request(limitedApp).post('/api/auth/login').send(body).expect(401);
    }
    const res = await request(limitedApp).post('/api/auth/login').send(body);

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: expect.any(String), details: [] },
    });
  });
});
