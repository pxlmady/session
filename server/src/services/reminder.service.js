import cron from 'node-cron';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { NOTIFICATION_EVENTS, sendBookingEmails } from './notification.service.js';

// Нагадування учасникам підтвердженої консультації орієнтовно за 24 години до початку
// (ТЗ, п. 4.1.4). Поле reminderSentAt не дає надіслати нагадування повторно.
export const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

// Надсилає нагадування для підтверджених записів, консультація яких починається протягом
// наступних 24 годин, і повертає кількість записів, для яких надіслано нагадування
export async function sendDueReminders(now = new Date()) {
  const due = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      slot: { startAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) } },
    },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  let sent = 0;
  for (const { id } of due) {
    // Спочатку запис позначається (умовне оновлення), потім надсилається лист:
    // навіть за одночасного запуску перевірки нагадування не дублюється
    const { count } = await prisma.booking.updateMany({
      where: { id, status: 'CONFIRMED', reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (count === 0) continue;
    if (await sendBookingEmails(NOTIFICATION_EVENTS.REMINDER, id)) sent += 1;
  }
  return sent;
}

// Періодична перевірка нагадувань (node-cron); запускається лише з server.js
export function startReminderJob() {
  if (!cron.validate(env.reminderCron)) {
    throw new Error(`REMINDER_CRON: некоректний cron-вираз «${env.reminderCron}»`);
  }
  return cron.schedule(
    env.reminderCron,
    async () => {
      try {
        const sent = await sendDueReminders();
        if (sent > 0) console.log(`[reminders] Надіслано нагадувань: ${sent}`);
      } catch (err) {
        console.error('[reminders] Помилка перевірки нагадувань:', err);
      }
    },
    { name: 'booking-reminders', noOverlap: true },
  );
}
