import express from 'express';
import { healthRouter } from './routes/health.js';

export const app = express();

app.use(express.json());

app.use('/api/health', healthRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ресурс не знайдено', details: [] },
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Внутрішня помилка сервера', details: [] },
  });
});
