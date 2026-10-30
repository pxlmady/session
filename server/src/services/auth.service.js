import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

// Параметр вартості bcrypt (ТЗ, розділ 12: не менше 10)
const BCRYPT_ROUNDS = 10;

// Поля користувача, які можна повертати через API (без passwordHash)
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  department: true,
  studentGroup: true,
  createdAt: true,
  updatedAt: true,
};

// Хеш для порівняння, коли email не знайдено: час відповіді не видає, чи існує обліковий запис
const DUMMY_HASH = bcrypt.hashSync('session-dummy-password-1', BCRYPT_ROUNDS);

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Невірний email або пароль');

export function signToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

// FR-01: реєстрація; роль приходить лише STUDENT або TEACHER (перевірено схемою)
export async function register({ email, password, fullName, role, department, studentGroup }) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Користувач із таким email уже зареєстрований');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    return await prisma.user.create({
      data: { email, passwordHash, fullName, role, department, studentGroup },
      select: publicUserSelect,
    });
  } catch (err) {
    // Одночасна реєстрація з тим самим email: спрацьовує унікальний індекс
    if (err.code === 'P2002') {
      throw new AppError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'Користувач із таким email уже зареєстрований',
      );
    }
    throw err;
  }
}

// FR-02: вхід; однакова відповідь для невірного email і невірного пароля
export async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    throw invalidCredentials();
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return { token: signToken(publicUser), user: publicUser };
}
