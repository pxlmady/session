import 'dotenv/config';

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Відсутні змінні середовища: ${missing.join(', ')}. Створіть server/.env на основі server/.env.example.`,
  );
  process.exit(1);
}

// Короткий секрет легко підібрати, тому вимагаємо щонайменше 32 символи (ТЗ, розділ 12)
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET має містити щонайменше 32 символи. Див. server/.env.example.');
  process.exit(1);
}

// Постачальник академічних даних (ТЗ п. 4.1.5): у прототипі допустимий лише mock
const ACADEMIC_PROVIDERS = ['mock'];
const academicProvider = process.env.ACADEMIC_PROVIDER || 'mock';
if (!ACADEMIC_PROVIDERS.includes(academicProvider)) {
  console.error(
    `Невідомий постачальник академічних даних ACADEMIC_PROVIDER=${academicProvider}. Допустимі значення: ${ACADEMIC_PROVIDERS.join(', ')}.`,
  );
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  // Строк дії токена за ТЗ – 24 години
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  // Адреса клієнтської частини, з якої дозволено запити (CORS)
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Email-сповіщення (Nodemailer). Якщо SMTP_HOST не задано, листи не надсилаються,
  // а виводяться в консоль сервера (режим розробки)
  mail: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Session <no-reply@session.local>',
    // Часовий пояс, у якому дата й час консультації показуються в листах
    timeZone: process.env.MAIL_TIMEZONE || 'Europe/Kyiv',
  },
  // Розклад перевірки нагадувань (node-cron): за замовчуванням кожні 15 хвилин
  reminderCron: process.env.REMINDER_CRON || '*/15 * * * *',
  // Постачальник академічних даних (FR-27 – FR-37)
  academicProvider,
};
