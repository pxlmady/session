import { z } from 'zod';

// Правила валідації полів за таблицею 25 ТЗ (розділ 11).
// z.object відкидає невідомі поля, тому passwordHash, id тощо від клієнта не приймаються.

const requiredString = (message) =>
  z.string({ error: (issue) => (issue.input === undefined ? message : 'Очікується рядок') });

const email = requiredString('Вкажіть email')
  .trim()
  .toLowerCase()
  .min(1, 'Вкажіть email')
  .max(254, 'Email не може бути довшим за 254 символи')
  .pipe(z.email('Некоректний формат email'));

const optionalText = (label) =>
  z
    .string({ error: 'Очікується рядок' })
    .trim()
    .max(100, `${label}: не більше 100 символів`)
    .transform((value) => value || null)
    .nullish();

export const registerSchema = z.object({
  email,
  password: requiredString('Вкажіть пароль')
    .min(8, 'Пароль має містити щонайменше 8 символів')
    .max(72, 'Пароль не може бути довшим за 72 символи')
    .regex(/\p{L}/u, 'Пароль має містити щонайменше одну літеру')
    .regex(/\d/, 'Пароль має містити щонайменше одну цифру'),
  fullName: requiredString('Вкажіть ПІБ')
    .trim()
    .min(2, 'ПІБ має містити від 2 до 100 символів')
    .max(100, 'ПІБ має містити від 2 до 100 символів'),
  // Роль ADMIN під час реєстрації не допускається (ТЗ, п. 4.1)
  role: z.enum(['STUDENT', 'TEACHER'], { error: 'Оберіть роль: STUDENT або TEACHER' }),
  department: optionalText('Кафедра'),
  studentGroup: optionalText('Група'),
});

export const loginSchema = z.object({
  email,
  password: requiredString('Вкажіть пароль').min(1, 'Вкажіть пароль'),
});
