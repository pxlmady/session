// Налаштування e2e-тестів: адреси окремо запущених сервера й клієнта, окрема база даних
// і тестові облікові записи. Спільний модуль для playwright.config.js, підготовки БД і тестів.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
export const SERVER_DIR = fileURLToPath(new URL('../server', import.meta.url));
export const CLIENT_DIR = fileURLToPath(new URL('../client', import.meta.url));

// Локально рядок підключення береться з server/.env; у CI змінні задає workflow.
// Наявні змінні середовища process.loadEnvFile не перезаписує.
const serverEnvFile = fileURLToPath(new URL('../server/.env', import.meta.url));
if (existsSync(serverEnvFile)) process.loadEnvFile(serverEnvFile);

// Окрема БД для e2e: E2E_DATABASE_URL або база робочого DATABASE_URL з суфіксом _e2e.
// Перед запуском тестів база повністю перестворюється, тому назва має закінчуватися на _e2e.
function e2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  if (!process.env.DATABASE_URL) {
    throw new Error('Задайте E2E_DATABASE_URL або DATABASE_URL у server/.env (див. README).');
  }
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `${url.pathname.replace(/_e2e$/, '')}_e2e`;
  return url.toString();
}

export const DATABASE_URL = e2eDatabaseUrl();

// Порти відрізняються від портів розробки (3000, 5173), щоб тести не потрапили на робочий сервер
export const SERVER_PORT = Number(process.env.E2E_SERVER_PORT || 3100);
export const CLIENT_PORT = Number(process.env.E2E_CLIENT_PORT || 5174);
export const SERVER_URL = `http://localhost:${SERVER_PORT}`;
export const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;

// Тестові облікові записи, які створює prisma/seed.js в e2e-базі. Значення діють лише для
// тимчасової локальної бази e2e і не є секретами; за потреби їх можна перевизначити.
export const ADMIN = {
  email: 'admin@session.local',
  password: process.env.E2E_ADMIN_PASSWORD || 'E2eAdmin2026',
};
export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || 'E2eDemo2026';
export const USERS = {
  teacher1: { email: 'teacher1@session.local', fullName: 'Викладач Тестовий Перший' },
  teacher2: { email: 'teacher2@session.local', fullName: 'Викладач Тестовий Другий' },
  // Зіставлено з демонстраційним профілем DEMO-S-1001 (Група 1, відкриті заборгованості)
  student1: { email: 'student1@session.local', fullName: 'Студент Тестовий Перший' },
  // Зіставлено з демонстраційним профілем DEMO-S-1002 (Група 2)
  student2: { email: 'student2@session.local', fullName: 'Студент Тестовий Другий' },
};

// Секрет JWT для сервера e2e: з середовища або випадковий на кожен запуск
export const JWT_SECRET =
  process.env.E2E_JWT_SECRET || process.env.JWT_SECRET || randomBytes(48).toString('hex');

// Збережений стан браузера (токен у localStorage) для кожного тестового користувача
export const storageStatePath = (name) =>
  fileURLToPath(new URL(`./.auth/${name}.json`, import.meta.url));
