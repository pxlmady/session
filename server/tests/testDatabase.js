import 'dotenv/config';

// Тести працюють лише з окремою тестовою БД (ТЗ, розділ 15): вони очищають таблиці.
// Назва бази в TEST_DATABASE_URL має закінчуватися на _test, щоб не зачепити робочу БД.
export function getTestDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('Не задано TEST_DATABASE_URL у server/.env (див. server/.env.example).');
  }
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith('_test') || url === process.env.DATABASE_URL) {
    throw new Error(
      'TEST_DATABASE_URL має вказувати на окрему базу з назвою, що закінчується на _test.',
    );
  }
  return url;
}
