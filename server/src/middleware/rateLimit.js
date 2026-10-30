import { rateLimit } from 'express-rate-limit';
import { sendError } from '../lib/errors.js';

// Обмеження спроб входу й реєстрації з однієї IP-адреси (ТЗ, розділ 12):
// не більше 10 запитів за 15 хвилин
export function authRateLimit({ limit = 10, windowMs = 15 * 60 * 1000 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, 429, 'TOO_MANY_REQUESTS', 'Забагато спроб. Спробуйте пізніше');
    },
  });
}
