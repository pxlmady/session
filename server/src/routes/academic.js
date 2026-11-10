import { Router } from 'express';
import * as academicController from '../controllers/academic.controller.js';
import { auth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  debtsQuerySchema,
  recordsQuerySchema,
  scheduleQuerySchema,
} from '../validation/academic.schemas.js';

// Академічна інтеграція (ТЗ п. 4.1.5, таблиця 4.6). Академічні дані доступні лише самому
// студенту за зіставленням AcademicDataMapping; викладач і адміністратор отримують 403 (TC-15).
export const academicRouter = Router();

academicRouter.use(auth);

// Стан джерела даних і зіставлення поточного користувача – усі автентифіковані
academicRouter.get('/status', academicController.status);

academicRouter.use('/me', requireRole('STUDENT'));
academicRouter.get('/me/profile', academicController.profile);
academicRouter.get(
  '/me/records',
  validate(recordsQuerySchema, 'query'),
  academicController.records,
);
academicRouter.get('/me/debts', validate(debtsQuerySchema, 'query'), academicController.debts);
academicRouter.get(
  '/me/schedule',
  validate(scheduleQuerySchema, 'query'),
  academicController.schedule,
);
