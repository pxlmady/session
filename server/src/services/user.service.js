import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { publicUserSelect } from './auth.service.js';

// Поле профілю, яке відповідає ролі (FR-06, FR-07): кафедра – викладача, група – студента.
// Адміністратор має лише ПІБ.
const ROLE_FIELDS = {
  STUDENT: ['studentGroup'],
  TEACHER: ['department'],
  ADMIN: [],
};

const FIELD_ERRORS = {
  department: 'Кафедру вказує лише викладач',
  studentGroup: 'Групу вказує лише студент',
};

// FR-07: користувач змінює ПІБ і кафедру або групу; email і роль не змінюються.
// Змінюється лише профіль поточного користувача (id з токена), тому чужий профіль недоступний.
export async function updateProfile(user, changes) {
  const allowed = ROLE_FIELDS[user.role] ?? [];
  const details = Object.keys(FIELD_ERRORS)
    .filter((field) => changes[field] !== undefined && !allowed.includes(field))
    .map((field) => ({ field, message: FIELD_ERRORS[field] }));
  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Помилка валідації даних', details);
  }

  const data = {};
  for (const field of ['fullName', ...allowed]) {
    if (changes[field] !== undefined) data[field] = changes[field];
  }

  return prisma.user.update({ where: { id: user.id }, data, select: publicUserSelect });
}
