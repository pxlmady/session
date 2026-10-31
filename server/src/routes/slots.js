import { Router } from 'express';
import * as slotController from '../controllers/slot.controller.js';
import { auth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validation/common.schemas.js';
import { createSlotSchema, updateSlotSchema } from '../validation/slot.schemas.js';

// Керування слотами – лише викладач; власника слота перевіряє сервіс (ТЗ, розділ 12)
export const slotsRouter = Router();

slotsRouter.use(auth, requireRole('TEACHER'));

slotsRouter.get('/my', slotController.listMy);
slotsRouter.post('/', validate(createSlotSchema), slotController.create);
slotsRouter.patch(
  '/:id',
  validate(idParamsSchema, 'params'),
  validate(updateSlotSchema),
  slotController.update,
);
slotsRouter.delete('/:id', validate(idParamsSchema, 'params'), slotController.remove);
