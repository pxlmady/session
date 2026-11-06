import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { auth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { changeRoleSchema } from '../validation/admin.schemas.js';
import { idParamsSchema } from '../validation/common.schemas.js';

// Адміністрування (ТЗ, п. 4.1.3, таблиця 4.6) – лише адміністратор; іншим ролям 403 (TC-13)
export const adminRouter = Router();

adminRouter.use(auth, requireRole('ADMIN'));

adminRouter.get('/stats', adminController.stats);
adminRouter.get('/users', adminController.listUsers);
adminRouter.patch(
  '/users/:id/role',
  validate(idParamsSchema, 'params'),
  validate(changeRoleSchema),
  adminController.changeRole,
);
