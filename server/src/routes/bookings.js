import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { auth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  completeBookingSchema,
  createBookingSchema,
  myBookingsQuerySchema,
} from '../validation/booking.schemas.js';
import { idParamsSchema } from '../validation/common.schemas.js';

// Роль перевіряє requireRole, належність запису або слота – сервіс (ТЗ, розділ 12)
export const bookingsRouter = Router();

bookingsRouter.use(auth);

// FR-18, FR-19: власні записи студента або записи на слоти викладача
bookingsRouter.get(
  '/my',
  requireRole('STUDENT', 'TEACHER'),
  validate(myBookingsQuerySchema, 'query'),
  bookingController.listMy,
);

// FR-15, FR-16: бронювання – лише студент
bookingsRouter.post(
  '/',
  requireRole('STUDENT'),
  validate(createBookingSchema),
  bookingController.create,
);

// FR-21: підтвердження та відхилення – викладач (власник слота)
bookingsRouter.patch(
  '/:id/confirm',
  requireRole('TEACHER'),
  validate(idParamsSchema, 'params'),
  bookingController.confirm,
);
bookingsRouter.patch(
  '/:id/reject',
  requireRole('TEACHER'),
  validate(idParamsSchema, 'params'),
  bookingController.reject,
);

// Результат консультації (етап 9б): викладач (власник слота), лише після її завершення
bookingsRouter.get(
  '/:id/result-options',
  requireRole('TEACHER'),
  validate(idParamsSchema, 'params'),
  bookingController.resultOptions,
);
bookingsRouter.patch(
  '/:id/complete',
  requireRole('TEACHER'),
  validate(idParamsSchema, 'params'),
  validate(completeBookingSchema),
  bookingController.complete,
);

// FR-20: скасування – студент (власник запису) або викладач (власник слота)
bookingsRouter.patch(
  '/:id/cancel',
  requireRole('STUDENT', 'TEACHER'),
  validate(idParamsSchema, 'params'),
  bookingController.cancel,
);
