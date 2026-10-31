import { AppError } from '../lib/errors.js';

// Перевірка вхідних даних схемою Zod (ТЗ, розділ 11).
// source: 'body' (тіло запиту), 'params' (параметри шляху) або 'query' (рядок запиту).
// Невідомі поля відкидаються схемою. Перевірене тіло записується в req.body,
// а перевірені параметри шляху й рядка запиту – у req.validated.params / req.validated.query
// (у Express 5 req.query доступний лише для читання).
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      next(new AppError(400, 'VALIDATION_ERROR', 'Помилка валідації даних', details));
      return;
    }
    if (source === 'body') {
      req.body = result.data;
    } else {
      req.validated = { ...req.validated, [source]: result.data };
    }
    next();
  };
}
