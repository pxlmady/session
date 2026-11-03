import { z } from 'zod';
import { optionalText } from './common.schemas.js';

// FR-07: редагування профілю (ТЗ, таблиця 25). Передаються лише поля, що змінюються.
// email і role схема не містить: z.object відкидає їх, тому самостійно вони не змінюються.
export const updateProfileSchema = z
  .object({
    fullName: z
      .string({ error: 'Очікується рядок' })
      .trim()
      .min(2, 'ПІБ має містити від 2 до 100 символів')
      .max(100, 'ПІБ має містити від 2 до 100 символів')
      .optional(),
    // Порожній рядок або null очищає поле
    department: optionalText('Кафедра', 100),
    studentGroup: optionalText('Група', 100),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Не передано жодного поля для зміни',
  });
