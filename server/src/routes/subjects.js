import { Router } from 'express';
import * as subjectController from '../controllers/subject.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { subjectSearchSchema } from '../validation/academic.schemas.js';
import { idParamsSchema } from '../validation/common.schemas.js';

// Довідник дисциплін (FR-32) – автентифіковані користувачі
export const subjectsRouter = Router();

subjectsRouter.use(auth);

subjectsRouter.get('/', validate(subjectSearchSchema, 'query'), subjectController.list);
subjectsRouter.get('/:id', validate(idParamsSchema, 'params'), subjectController.getById);
