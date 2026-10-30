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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  // Строк дії токена за ТЗ – 24 години
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  // Адреса клієнтської частини, з якої дозволено запити (CORS)
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
