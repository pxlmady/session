import { Router } from 'express';
import * as teacherController from '../controllers/teacher.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validation/common.schemas.js';
import { teacherSearchSchema } from '../validation/slot.schemas.js';

// Перегляд викладачів, їхніх дисциплін і вільних слотів – автентифіковані користувачі (ТЗ, таблиця 23)
export const teachersRouter = Router();

teachersRouter.use(auth);

teachersRouter.get('/', validate(teacherSearchSchema, 'query'), teacherController.list);
teachersRouter.get('/:id', validate(idParamsSchema, 'params'), teacherController.getById);
teachersRouter.get('/:id/slots', validate(idParamsSchema, 'params'), teacherController.freeSlots);
