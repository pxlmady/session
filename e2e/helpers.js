import { readFileSync } from 'node:fs';
import { SERVER_URL, storageStatePath } from './env.js';

// Токен тестового користувача, збережений у tests/auth.setup.js
export function tokenOf(name) {
  const state = JSON.parse(readFileSync(storageStatePath(name), 'utf8'));
  return state.origins[0].localStorage.find((item) => item.name === 'session.token').value;
}

// Запит до API від імені тестового користувача (підготовка даних для сценарію)
export async function apiAs(request, name, method, path, data) {
  const response = await request.fetch(`${SERVER_URL}${path}`, {
    method,
    data,
    headers: { Authorization: `Bearer ${tokenOf(name)}` },
  });
  if (!response.ok()) {
    throw new Error(`${method} ${path}: ${response.status()} ${await response.text()}`);
  }
  return response.status() === 204 ? null : response.json();
}

// Момент через days діб о hh:mm за київським часом (часовий пояс тестового браузера).
// Повертає Date і значення для поля datetime-local.
export function kyivDateTime(days, hh, mm) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
      .map((part) => [part.type, part.value]),
  );
  const local = `${parts.year}-${parts.month}-${parts.day}T${hh}:${mm}`;
  // Зміщення Києва відносно UTC у цей день (+02:00 взимку, +03:00 влітку)
  const guess = new Date(`${local}:00Z`);
  const kyivHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Kyiv',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(guess),
  );
  const offsetHours = (kyivHour - guess.getUTCHours() + 24) % 24;
  const date = new Date(guess.getTime() - offsetHours * 60 * 60 * 1000);
  return { date, local };
}

const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Дата у форматі інтерфейсу «Пт, 20.11.2026» (client/src/utils/datetime.js) для дати local
export function uiDate(local) {
  const [year, month, day] = local.slice(0, 10).split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${local.slice(8, 10)}.${local.slice(5, 7)}.${year}`;
}

// Слот викладача через API: через days діб з hh:mm до hh:mm+30 за київським часом
export async function createSlot(request, teacher, { days, hh, mm = '00', location }) {
  const start = kyivDateTime(days, hh, mm);
  const slot = await apiAs(request, teacher, 'POST', '/api/slots', {
    startAt: start.date.toISOString(),
    endAt: new Date(start.date.getTime() + 30 * 60 * 1000).toISOString(),
    location,
  });
  return { slot, local: start.local };
}
