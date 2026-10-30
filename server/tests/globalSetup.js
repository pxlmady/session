import { execSync } from 'node:child_process';
import { getTestDatabaseUrl } from './testDatabase.js';

// Перед запуском тестів застосовуємо міграції до тестової БД (за потреби Prisma створює базу)
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: getTestDatabaseUrl() },
    stdio: 'inherit',
  });
}
