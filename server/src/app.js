import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';

// options.authRateLimit дозволяє тестам задати власний ліміт спроб автентифікації
export function createApp(options = {}) {
  const app = express();

  // HTTP-заголовки безпеки; CORS лише для адреси клієнтської частини (ТЗ, розділ 12)
  app.use(helmet());
  app.use(cors({ origin: env.clientUrl }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter({ rateLimit: options.authRateLimit }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
