import { PrismaClient } from '@prisma/client';

// Інтерактивні транзакції (бронювання, створення та зміна слотів) за одночасних запитів
// чекають на блокування рядків і вільне з'єднання пулу. Стандартних 2 с очікування початку
// транзакції може не вистачити (наприклад, PostgreSQL у Docker Desktop на Windows),
// тому ліміти збільшено.
export const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 10000 },
});
