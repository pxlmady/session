// Дата й час у часовому поясі браузера: «Пн, 10.11.2026» і «10:00–10:30» (UX, розд. 3)

const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const pad = (n) => String(n).padStart(2, '0');

export function formatDate(value) {
  const d = new Date(value);
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatTime(value) {
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTimeRange(startAt, endAt) {
  const sameDay = new Date(startAt).toDateString() === new Date(endAt).toDateString();
  const end = sameDay ? formatTime(endAt) : `${formatDate(endAt)} ${formatTime(endAt)}`;
  return `${formatTime(startAt)}–${end}`;
}

export function formatDateTimeRange(startAt, endAt) {
  return `${formatDate(startAt)}, ${formatTimeRange(startAt, endAt)}`;
}

// Значення для поля <input type="datetime-local"> (локальний час без зони)
export function toLocalInput(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Перетворення значення datetime-local у ISO 8601 з часовою зоною (UTC) для сервера
export function fromLocalInput(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isFuture(value) {
  return new Date(value).getTime() > Date.now();
}
