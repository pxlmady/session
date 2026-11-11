// Українські мітки статусів (ТЗ, п. 13.3) і ролей; колір – лише додаткова ознака (UX, табл. 5.1)

export const BOOKING_STATUS = {
  PENDING: { label: 'Очікує підтвердження', color: 'warning' },
  CONFIRMED: { label: 'Підтверджено', color: 'success' },
  CANCELLED: { label: 'Скасовано', color: 'default' },
};

export const SLOT_STATUS = {
  FREE: { label: 'Вільний', color: 'success' },
  BOOKED: { label: 'Заброньований', color: 'info' },
  CANCELLED: { label: 'Скасований', color: 'default' },
};

export const ROLE_LABELS = {
  STUDENT: 'Студент',
  TEACHER: 'Викладач',
  ADMIN: 'Адміністратор',
};

// Активні записи: на слот може існувати не більше одного такого запису
export const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'];

// Статус академічної заборгованості (FR-30)
export const DEBT_STATUS = {
  open: { label: 'Відкрита', color: 'warning' },
  closed: { label: 'Закрита', color: 'default' },
};

// Мінімальний позитивний бал (100-бальна шкала): нижчий бал – незадовільна оцінка
export const PASSING_SCORE = 60;

// Назва постачальника академічних даних для інтерфейсу
export function providerLabel(provider) {
  if (provider === 'mock') return 'демонстраційний постачальник (mock)';
  return provider || '—';
}
