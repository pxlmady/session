import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validation/user.schemas.js';

// Профіль поточного користувача; перегляд профілю (FR-06) – GET /api/auth/me
export const usersRouter = Router();

usersRouter.use(auth);

// FR-07: редагування власного профілю – автентифіковані користувачі
usersRouter.patch('/me', validate(updateProfileSchema), userController.updateMe);
