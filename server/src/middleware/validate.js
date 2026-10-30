import { AppError } from '../lib/errors.js';

// Перевірка тіла запиту схемою Zod. Невідомі поля відкидаються схемою,
// у req.body залишаються лише перевірені й нормалізовані значення.
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      next(new AppError(400, 'VALIDATION_ERROR', 'Помилка валідації даних', details));
      return;
    }
    req.body = result.data;
    next();
  };
}
