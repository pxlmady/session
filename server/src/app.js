import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createAcademicService } from './academic/academic.service.js';
import { createAcademicProvider } from './academic/index.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { academicRouter } from './routes/academic.js';
import { adminRouter } from './routes/admin.js';
import { createAuthRouter } from './routes/auth.js';
import { bookingsRouter } from './routes/bookings.js';
import { healthRouter } from './routes/health.js';
import { slotsRouter } from './routes/slots.js';
import { subjectsRouter } from './routes/subjects.js';
import { teachersRouter } from './routes/teachers.js';
import { usersRouter } from './routes/users.js';

// options.authRateLimit дозволяє тестам задати власний ліміт спроб автентифікації.
// options.academicProvider підміняє постачальника академічних даних (за замовчуванням –
// з ACADEMIC_PROVIDER), options.academicTimeoutMs – час очікування його відповіді.
export function createApp(options = {}) {
  const app = express();

  // Сервіс академічної інтеграції доступний обробникам через req.app.locals.academic
  app.locals.academic = createAcademicService({
    provider: options.academicProvider ?? createAcademicProvider(env.academicProvider),
    timeoutMs: options.academicTimeoutMs,
  });

  // HTTP-заголовки безпеки; CORS лише для адреси клієнтської частини (ТЗ, розділ 12)
  app.use(helmet());
  app.use(cors({ origin: env.clientUrl }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter({ rateLimit: options.authRateLimit }));
  app.use('/api/users', usersRouter);
  app.use('/api/teachers', teachersRouter);
  app.use('/api/slots', slotsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/academic', academicRouter);
  app.use('/api/subjects', subjectsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
