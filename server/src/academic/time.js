// Перетворення дат і часу занять між часовим поясом розкладу (Europe/Kyiv) і UTC
// засобами Intl, без додаткових бібліотек (ТЗ п. 4.1.5: час занять задається в Europe/Kyiv).

export const SCHEDULE_TIME_ZONE = 'Europe/Kyiv';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatters = new Map();
function partsFormatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
  return formatters.get(timeZone);
}

// Зміщення часового поясу відносно UTC (мс) у заданий момент часу
function offsetMs(date, timeZone) {
  const values = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Місцеві дата (YYYY-MM-DD) і час (HH:MM) у часовому поясі → момент часу UTC.
// Друга ітерація враховує перехід на літній або зимовий час.
export function zonedTimeToUtc(dateString, timeString, timeZone = SCHEDULE_TIME_ZONE) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = offsetMs(new Date(guess), timeZone);
  let result = guess - firstOffset;
  const secondOffset = offsetMs(new Date(result), timeZone);
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return new Date(result);
}

// Календарна дата (YYYY-MM-DD) моменту часу в часовому поясі
export function zonedDateString(date, timeZone = SCHEDULE_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Календарна дата, зсунута на days діб
export function addDays(dateString, days) {
  return new Date(Date.parse(`${dateString}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// День тижня за ISO 8601: 1 – понеділок, …, 7 – неділя
export function isoWeekday(dateString) {
  return new Date(`${dateString}T00:00:00Z`).getUTCDay() || 7;
}

// Кількість календарних діб від from до to включно
export function daysInclusive(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}
