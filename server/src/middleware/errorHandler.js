import { AppError, sendError } from '../lib/errors.js';

// Невідомий маршрут
export function notFound(_req, res) {
  sendError(res, 404, 'NOT_FOUND', 'Ресурс не знайдено');
}

// Єдиний обробник помилок: відповідь у форматі { error: { code, message, details } }
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  // Помилки express.json(): некоректний JSON або завеликий запит
  if (err.type === 'entity.parse.failed') {
    sendError(res, 400, 'INVALID_JSON', 'Тіло запиту містить некоректний JSON');
    return;
  }
  if (err.type === 'entity.too.large') {
    sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Завеликий розмір запиту');
    return;
  }

  // Внутрішні деталі записуються в журнал і не передаються клієнту
  console.error(err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Внутрішня помилка сервера');
}
