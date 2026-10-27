// Перевірка збереження часткового індексу "Booking_active_slot_unique" (ТЗ розділ 9.4):
// 1) жодна міграція, крім тієї, що його створює, не містить команд його видалення;
// 2) індекс наявний у базі даних і обмежує саме статуси PENDING і CONFIRMED.
import { readdir, readFile } from 'node:fs/promises';
import '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const INDEX = 'Booking_active_slot_unique';
const migrationsDir = new URL('../prisma/migrations/', import.meta.url);

let failed = false;

const folders = (await readdir(migrationsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const folder of folders) {
  const sql = await readFile(new URL(`${folder}/migration.sql`, migrationsDir), 'utf8');
  if (new RegExp(`DROP\\s+INDEX[^;]*"?${INDEX}"?`, 'i').test(sql)) {
    console.error(
      `Міграція ${folder} видаляє індекс ${INDEX}. Приберіть цю команду з migration.sql.`,
    );
    failed = true;
  }
}

try {
  const rows = await prisma.$queryRaw`
    SELECT indexdef FROM pg_indexes WHERE tablename = 'Booking' AND indexname = ${INDEX}`;
  const definition = rows[0]?.indexdef ?? '';
  if (!/UNIQUE/.test(definition) || !/PENDING/.test(definition) || !/CONFIRMED/.test(definition)) {
    console.error(`Індекс ${INDEX} відсутній у базі даних або має неочікуване визначення.`);
    failed = true;
  } else {
    console.log(`Індекс ${INDEX} наявний: ${definition}`);
  }
} catch (err) {
  console.error('Не вдалося перевірити базу даних:', err.message);
  failed = true;
} finally {
  await prisma.$disconnect();
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`Перевірено міграцій: ${folders.length}. Частковий індекс збережено.`);
}
