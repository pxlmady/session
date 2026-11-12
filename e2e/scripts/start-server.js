// Запуск серверної частини для e2e-тестів (webServer у playwright.config.js):
// 1) окрема база *_e2e перестворюється: схема public очищується, застосовуються міграції
//    та сценарій початкового заповнення з тестовими обліковими записами;
// 2) сервер Session запускається в цьому ж процесі на порту SERVER_PORT.
import { execSync } from 'node:child_process';
import {
  ADMIN,
  CLIENT_URL,
  DATABASE_URL,
  DEMO_PASSWORD,
  JWT_SECRET,
  SERVER_DIR,
  SERVER_PORT,
} from '../env.js';

const dbName = new URL(DATABASE_URL).pathname.slice(1);
if (!dbName.endsWith('_e2e')) {
  throw new Error(`База для e2e має закінчуватися на _e2e (отримано ${dbName}).`);
}

Object.assign(process.env, {
  NODE_ENV: 'development',
  PORT: String(SERVER_PORT),
  DATABASE_URL,
  JWT_SECRET,
  CLIENT_URL,
  ADMIN_EMAIL: ADMIN.email,
  ADMIN_PASSWORD: ADMIN.password,
  SEED_DEMO_PASSWORD: DEMO_PASSWORD,
  ACADEMIC_PROVIDER: 'mock',
  // Листи не надсилаються: без SMTP_HOST сервер лише виводить їх у журнал
  SMTP_HOST: '',
});

const run = (command, options = {}) =>
  execSync(command, { cwd: SERVER_DIR, env: process.env, stdio: 'inherit', ...options });

// За першого запуску бази ще немає – її створить prisma migrate deploy
try {
  run('npx prisma db execute --stdin --schema prisma/schema.prisma', {
    input: 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
} catch {
  console.log(`[e2e] Базу ${dbName} буде створено під час застосування міграцій.`);
}
run('npx prisma migrate deploy');
run('npx prisma db seed');

// dotenv у сервері читає server/.env відносно робочого каталогу й не перезаписує змінні вище
process.chdir(SERVER_DIR);
await import('../../server/src/server.js');
