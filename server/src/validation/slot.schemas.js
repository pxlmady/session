import { z } from 'zod';
import { subjectIdQuery } from './academic.schemas.js';
import { optionalText } from './common.schemas.js';

// Дата й час у форматі ISO 8601 з обов'язковою часовою зоною (Z або зміщення, наприклад +02:00).
// Значення без зони відхиляється, щоб час не залежав від часового поясу сервера;
// у БД зберігається момент часу в UTC (BR-07).
const dateTime = (label) =>
  z.iso
    .datetime({
      offset: true,
      error: (issue) =>
        issue.input === undefined
          ? `Вкажіть ${label}`
          : `${label[0].toUpperCase()}${label.slice(1)}: очікується дата й час у форматі ISO 8601 з часовою зоною`,
    })
    .transform((value) => new Date(value));

const startAt = dateTime('час початку');
const endAt = dateTime('час завершення');
const location = optionalText('Місце проведення', 200);

// Перевірки BR-02: endAt > startAt; новий час слота лише в майбутньому
// (поля з помилкою формату вже мають власне повідомлення, тому тут не перевіряються)
function checkTimes(data, ctx) {
  const startAt = data.startAt instanceof Date ? data.startAt : undefined;
  const endAt = data.endAt instanceof Date ? data.endAt : undefined;
  if (startAt && startAt.getTime() <= Date.now()) {
    ctx.addIssue({
      code: 'custom',
      path: ['startAt'],
      message: 'Час початку має бути в майбутньому',
    });
  }
  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['endAt'],
      message: 'Час завершення має бути пізнішим за час початку',
    });
  }
}

// FR-08: створення слота. teacherId і status визначає сервер, від клієнта вони не приймаються.
export const createSlotSchema = z.object({ startAt, endAt, location }).superRefine(checkTimes);

// FR-10: редагування слота; передаються лише поля, що змінюються
export const updateSlotSchema = z
  .object({ startAt: startAt.optional(), endAt: endAt.optional(), location })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Не передано жодного поля для зміни',
  })
  .superRefine(checkTimes);

// FR-13: пошук викладачів за ПІБ; FR-32: фільтр за дисципліною
export const teacherSearchSchema = z.object({
  subjectId: subjectIdQuery.optional(),
  search: z
    .string({ error: 'Очікується рядок' })
    .trim()
    .max(100, 'Пошуковий запит: не більше 100 символів')
    .optional(),
});
