import 'dotenv/config';

const REQUIRED = ['DATABASE_URL'];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Відсутні змінні середовища: ${missing.join(', ')}. Створіть server/.env на основі server/.env.example.`,
  );
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
};
