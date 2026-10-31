import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { auth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBookingSchema } from '../validation/booking.schemas.js';
import { idParamsSchema } from '../validation/common.schemas.js';

export const bookingsRouter = Router();

bookingsRouter.use(auth);

// FR-15, FR-16: бронювання – лише студент
bookingsRouter.post(
  '/',
  requireRole('STUDENT'),
  validate(createBookingSchema),
  bookingController.create,
);

// FR-20: скасування – студент (власник запису) або викладач (власник слота)
bookingsRouter.patch(
  '/:id/cancel',
  requireRole('STUDENT', 'TEACHER'),
  validate(idParamsSchema, 'params'),
  bookingController.cancel,
);
