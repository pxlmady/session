// Перевірка полів форм на клієнті (UX, табл. 3.1; дублює табл. 25 ТЗ).
// Кожна функція повертає текст помилки або порожній рядок; остаточну перевірку виконує сервер.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  const v = value.trim();
  if (!v) return 'Вкажіть email';
  if (v.length > 254 || !EMAIL_RE.test(v)) return 'Некоректний формат email';
  return '';
}

export function validatePassword(value) {
  if (!value) return 'Вкажіть пароль';
  if (value.length < 8 || value.length > 72 || !/\p{L}/u.test(value) || !/\d/.test(value)) {
    return 'Пароль має містити від 8 до 72 символів, літеру та цифру';
  }
  return '';
}

export function validateFullName(value) {
  const v = value.trim();
  if (v.length < 2 || v.length > 100) return 'ПІБ має містити від 2 до 100 символів';
  return '';
}

export function validateOptionalText(value, max) {
  return value.trim().length > max ? `Не більше ${max} символів` : '';
}

export function validateRole(value) {
  return value ? '' : 'Оберіть роль';
}

export function validateTopic(value) {
  const v = value.trim();
  if (v.length < 3 || v.length > 500) return 'Тема має містити від 3 до 500 символів';
  return '';
}

export function validateSlotTimes({ startAt, endAt }) {
  const errors = {};
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (!start || Number.isNaN(start.getTime())) {
    errors.startAt = 'Вкажіть дату й час початку';
  } else if (start.getTime() <= Date.now()) {
    errors.startAt = 'Час початку має бути в майбутньому';
  }
  if (!end || Number.isNaN(end.getTime())) {
    errors.endAt = 'Вкажіть дату й час завершення';
  } else if (start && end.getTime() <= start.getTime()) {
    errors.endAt = 'Час завершення має бути пізнішим за час початку';
  }
  return errors;
}

// Помилки 400 від сервера (масив details) → { поле: повідомлення }
export function detailsToFieldErrors(details = []) {
  const errors = {};
  for (const { field, message } of details) {
    const key = field || '_form';
    if (!errors[key]) errors[key] = message;
  }
  return errors;
}
