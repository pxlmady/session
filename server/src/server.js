import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { flushNotifications } from './services/notification.service.js';
import { startReminderJob } from './services/reminder.service.js';

const server = createApp().listen(env.port, () => {
  console.log(`Сервер Session запущено: http://localhost:${env.port}/api/health`);
});

// Нагадування про підтверджені консультації (~за 24 години до початку)
const reminderJob = startReminderJob();

const shutdown = async () => {
  server.close();
  reminderJob.stop();
  await flushNotifications();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
