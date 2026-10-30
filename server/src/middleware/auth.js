import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { publicUserSelect } from '../services/auth.service.js';

const unauthorized = () =>
  new AppError(401, 'UNAUTHORIZED', 'Потрібна автентифікація: токен відсутній або недійсний');

// Перевірка JWT із заголовка Authorization: Bearer <token>.
// Користувача завжди читаємо з БД, щоб діяла актуальна роль (її може змінити адміністратор).
export async function auth(req, _res, next) {
  const [scheme, token] = req.get('Authorization')?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    next(unauthorized());
    return;
  }

  let payload;
  try {
    // Прострочений, змінений або підписаний іншим ключем токен відхиляється
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    next(unauthorized());
    return;
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    next(unauthorized());
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    next(unauthorized());
    return;
  }

  req.user = user;
  next();
}

// Перевірка ролі; використовується після auth
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Недостатньо прав для виконання дії'));
      return;
    }
    next();
  };
}
