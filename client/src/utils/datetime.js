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

// Календарні дати (розклад, строки заборгованостей) у форматі YYYY-MM-DD за місцевим часом
export function toDateKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toDateKey(d) === key ? d : null;
}

export function addDays(value, days) {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}

// Понеділок тижня, до якого належить дата (00:00 місцевого часу)
export function startOfWeek(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return addDays(d, -((d.getDay() + 6) % 7));
}

// «15.12.2026» для дати YYYY-MM-DD (без зсуву часового поясу)
export function formatDateKey(key) {
  const d = parseDateKey(key);
  return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '—';
}

// «09.11 – 15.11.2026»
export function formatDateRange(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  return `${pad(a.getDate())}.${pad(a.getMonth() + 1)} – ${pad(b.getDate())}.${pad(b.getMonth() + 1)}.${b.getFullYear()}`;
}
