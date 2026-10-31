import { z } from 'zod';
import { MAX_DB_INT, requiredString } from './common.schemas.js';

// FR-15: бронювання слота. studentId і status визначає сервер, від клієнта вони не приймаються.
export const createBookingSchema = z.object({
  slotId: z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'Вкажіть слот' : 'Ідентифікатор слота має бути числом',
    })
    .int('Ідентифікатор слота має бути цілим додатним числом')
    .min(1, 'Ідентифікатор слота має бути цілим додатним числом')
    .max(MAX_DB_INT, 'Ідентифікатор слота має бути цілим додатним числом'),
  topic: requiredString('Вкажіть тему запитання')
    .trim()
    .min(3, 'Тема запитання має містити від 3 до 500 символів')
    .max(500, 'Тема запитання має містити від 3 до 500 символів'),
});
