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
