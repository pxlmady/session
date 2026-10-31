import { z } from 'zod';

// Найбільше значення типу Int у PostgreSQL (первинні ключі таблиць)
export const MAX_DB_INT = 2147483647;

// Параметр шляху :id – ціле додатне число (ТЗ, таблиця 25)
export const idParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Ідентифікатор має бути цілим додатним числом')
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(1, 'Ідентифікатор має бути цілим додатним числом')
        .max(MAX_DB_INT, 'Ресурс не знайдено'),
    ),
});

// Обов'язковий рядок із власним повідомленням, якщо поле відсутнє
export const requiredString = (message) =>
  z.string({ error: (issue) => (issue.input === undefined ? message : 'Очікується рядок') });

// Необов'язковий текст: пробіли обрізаються, порожній рядок зберігається як null
export const optionalText = (label, max) =>
  z
    .string({ error: 'Очікується рядок' })
    .trim()
    .max(max, `${label}: не більше ${max} символів`)
    .transform((value) => value || null)
    .nullish();
