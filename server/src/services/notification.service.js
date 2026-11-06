import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

// Email-сповіщення (ТЗ, п. 4.1.4): створення, підтвердження, відхилення та скасування запису,
// скасування слота викладачем і нагадування про консультацію.
// Помилка надсилання не скасовує основну операцію: вона лише записується в журнал.

// Події, про які надсилаються листи
export const NOTIFICATION_EVENTS = {
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_REJECTED: 'BOOKING_REJECTED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  SLOT_CANCELLED: 'SLOT_CANCELLED',
  REMINDER: 'REMINDER',
};

// Без SMTP_HOST використовується jsonTransport: лист формується, але нікуди не надсилається,
// а в режимі розробки його текст виводиться в консоль сервера
const consoleMode = () => !env.mail.smtpHost;

function createDefaultTransport() {
  if (consoleMode()) {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: env.mail.smtpHost,
    port: env.mail.smtpPort,
    secure: env.mail.smtpSecure,
    auth: env.mail.smtpUser ? { user: env.mail.smtpUser, pass: env.mail.smtpPass } : undefined,
    // Недоступний SMTP-сервер не повинен затримувати надсилання надовго
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
}

let transport = createDefaultTransport();

// Підміна транспорту в тестах (без аргументу – повернення типового)
export function setMailTransport(customTransport) {
  transport = customTransport ?? createDefaultTransport();
}

const log = (...args) => {
  if (env.nodeEnv !== 'test') console.log(...args);
};
const logError = (...args) => {
  if (env.nodeEnv !== 'test') console.error(...args);
};

// ---------- Формування листів ----------

function formatDateTime(date) {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: env.mail.timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: env.mail.timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Опис консультації, спільний для всіх листів
function consultationDetails(booking) {
  const { slot, student } = booking;
  const group = student.studentGroup ? ` (${student.studentGroup})` : '';
  return [
    `Викладач: ${slot.teacher.fullName}`,
    `Студент: ${student.fullName}${group}`,
    `Час: ${formatDateTime(slot.startAt)} – ${formatTime(slot.endAt)} (${env.mail.timeZone})`,
    `Місце: ${slot.location || 'не вказано'}`,
    `Тема: ${booking.topic}`,
  ].join('\n');
}

const SIGNATURE =
  '\n\nЦей лист сформовано автоматично сервісом Session, відповідати на нього не потрібно.';

function letter(to, subject, intro, booking) {
  return {
    to: to.email,
    subject: `Session: ${subject}`,
    text: `Вітаємо, ${to.fullName}!\n\n${intro}\n\n${consultationDetails(booking)}${SIGNATURE}`,
  };
}

// Листи для події. booking містить slot (з teacher) і student; options.cancelledBy –
// роль того, хто скасував запис (лист отримує інший учасник консультації).
export function buildEmails(event, booking, options = {}) {
  const teacher = booking.slot.teacher;
  const { student } = booking;

  switch (event) {
    case NOTIFICATION_EVENTS.BOOKING_CREATED:
      return [
        letter(
          teacher,
          'новий запис на консультацію',
          'Студент записався на вашу консультацію. Запис очікує вашого підтвердження.',
          booking,
        ),
        letter(
          student,
          'запис на консультацію створено',
          'Ваш запис на консультацію створено. Він очікує підтвердження викладачем.',
          booking,
        ),
      ];
    case NOTIFICATION_EVENTS.BOOKING_CONFIRMED:
      return [
        letter(
          student,
          'запис підтверджено',
          'Викладач підтвердив ваш запис на консультацію.',
          booking,
        ),
      ];
    case NOTIFICATION_EVENTS.BOOKING_REJECTED:
      return [
        letter(
          student,
          'запис відхилено',
          'Викладач відхилив ваш запис на консультацію. Ви можете обрати інший вільний слот.',
          booking,
        ),
      ];
    case NOTIFICATION_EVENTS.BOOKING_CANCELLED:
      return options.cancelledBy === 'TEACHER'
        ? [
            letter(
              student,
              'запис скасовано викладачем',
              'Викладач скасував ваш запис на консультацію. Ви можете обрати інший вільний слот.',
              booking,
            ),
          ]
        : [
            letter(
              teacher,
              'запис скасовано студентом',
              'Студент скасував запис на вашу консультацію. Слот знову вільний.',
              booking,
            ),
          ];
    case NOTIFICATION_EVENTS.SLOT_CANCELLED:
      return [
        letter(
          student,
          'консультацію скасовано',
          'Викладач скасував слот консультації, тому ваш запис скасовано. Ви можете обрати інший вільний слот.',
          booking,
        ),
      ];
    case NOTIFICATION_EVENTS.REMINDER:
      return [teacher, student].map((recipient) =>
        letter(
          recipient,
          'нагадування про консультацію',
          'Нагадуємо про підтверджену консультацію, яка відбудеться найближчим часом.',
          booking,
        ),
      );
    default:
      throw new Error(`Невідома подія сповіщення: ${event}`);
  }
}

// ---------- Надсилання ----------

const bookingForEmailSelect = {
  id: true,
  topic: true,
  status: true,
  slot: {
    select: {
      startAt: true,
      endAt: true,
      location: true,
      teacher: { select: { fullName: true, email: true } },
    },
  },
  student: { select: { fullName: true, email: true, studentGroup: true } },
};

async function deliver(message) {
  try {
    await transport.sendMail({ from: env.mail.from, ...message });
    if (consoleMode()) {
      log(`\n[email] Кому: ${message.to}\n[email] Тема: ${message.subject}\n${message.text}\n`);
    }
    return true;
  } catch (err) {
    logError(
      `[email] Не вдалося надіслати лист «${message.subject}» на ${message.to}: ${err.message}`,
    );
    return false;
  }
}

// Надсилає листи про подію запису; повертає true, якщо всі листи надіслано.
// Помилки не генеруються назовні.
export async function sendBookingEmails(event, bookingId, options = {}) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: bookingForEmailSelect,
    });
    if (!booking) return false;
    const results = [];
    for (const message of buildEmails(event, booking, options)) {
      results.push(await deliver(message));
    }
    return results.every(Boolean);
  } catch (err) {
    logError(`[email] Помилка формування сповіщення ${event} для запису ${bookingId}:`, err);
    return false;
  }
}

// Незавершені надсилання (щоб тести та зупинка сервера могли дочекатися їх)
const pending = new Set();

// Надсилання у фоні: відповідь API не чекає на SMTP-сервер
export function notifyBookingEvent(event, bookingId, options) {
  const task = sendBookingEmails(event, bookingId, options).finally(() => pending.delete(task));
  pending.add(task);
}

export async function flushNotifications() {
  await Promise.allSettled([...pending]);
}
