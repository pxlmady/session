import { z } from 'zod';
import { daysInclusive } from '../academic/time.js';
import { MAX_DB_INT } from './common.schemas.js';

// Правила перевірки параметрів академічних ендпоінтів (ТЗ таблиця 4.8)

const MAX_SCHEDULE_DAYS = 31;

// FR-29: семестр – ціле число від 1 до 12, необов'язковий
export const recordsQuerySchema = z.object({
  semester: z
    .string({ error: 'Семестр: очікується ціле число від 1 до 12' })
    .regex(/^\d{1,2}$/, 'Семестр: очікується ціле число від 1 до 12')
    .transform(Number)
    .pipe(z.number().int().min(1, 'Семестр: від 1 до 12').max(12, 'Семестр: від 1 до 12'))
    .optional(),
});

// FR-30: open – лише відкриті заборгованості (за замовчуванням), all – усі
export const debtsQuerySchema = z.object({
  status: z.enum(['open', 'all'], { error: 'Статус: очікується open або all' }).default('open'),
});

// Календарна дата YYYY-MM-DD, що реально існує (наприклад, не 2026-02-30)
const calendarDate = (label) =>
  z
    .string({
      error: (issue) => (issue.input === undefined ? `Вкажіть ${label}` : 'Очікується рядок'),
    })
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      `${label[0].toUpperCase()}${label.slice(1)}: очікується дата у форматі YYYY-MM-DD`,
    )
    .refine(
      (value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
      },
      { message: `${label[0].toUpperCase()}${label.slice(1)}: такої дати не існує` },
    );

// FR-31: from не пізніше to, період не більше 31 доби (включно з обома датами)
export const scheduleQuerySchema = z
  .object({ from: calendarDate('початкову дату'), to: calendarDate('кінцеву дату') })
  .superRefine((data, ctx) => {
    if (data.to < data.from) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Кінцева дата не може бути раніше за початкову',
      });
    } else if (daysInclusive(data.from, data.to) > MAX_SCHEDULE_DAYS) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: `Період розкладу: не більше ${MAX_SCHEDULE_DAYS} доби`,
      });
    }
  });

// Ідентифікатор дисципліни в рядку запиту (фільтр викладачів, FR-32)
export const subjectIdQuery = z
  .string({ error: 'Дисципліна: очікується ціле додатне число' })
  .regex(/^\d+$/, 'Дисципліна: очікується ціле додатне число')
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .min(1, 'Дисципліна: очікується ціле додатне число')
      .max(MAX_DB_INT, 'Дисципліну не знайдено'),
  );

// FR-32: пошук дисциплін за назвою
export const subjectSearchSchema = z.object({
  search: z
    .string({ error: 'Очікується рядок' })
    .trim()
    .max(100, 'Пошуковий запит: не більше 100 символів')
    .optional(),
});
