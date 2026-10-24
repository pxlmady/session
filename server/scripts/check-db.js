// Перевірка підключення серверної частини до PostgreSQL через DATABASE_URL.
import '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

try {
  const [row] = await prisma.$queryRaw`SELECT current_database() AS db, version() AS version`;
  console.log(`Підключення успішне. База даних: ${row.db}`);
  console.log(row.version);
} catch (err) {
  console.error('Не вдалося підключитися до PostgreSQL:', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
