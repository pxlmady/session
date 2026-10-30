import { getTestDatabaseUrl } from './testDatabase.js';

// Виконується до імпорту коду застосунку: Prisma Client підключається до тестової БД
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = getTestDatabaseUrl();
