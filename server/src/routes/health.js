import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const healthRouter = Router();

// Перевірка працездатності сервера
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// Перевірка підключення до PostgreSQL
healthRouter.get('/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Помилка підключення до бази даних:', err.message);
    res.status(503).json({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'База даних недоступна', details: [] },
    });
  }
});
