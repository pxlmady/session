# Session

Навчальний прототип вебсервісу для запису студентів на консультації з викладачами.

Стек: React + Vite + Material UI (клієнт), Node.js + Express (сервер), PostgreSQL + Prisma ORM (дані).
Запуск лише локальний; PostgreSQL працює в Docker-контейнері, яким керує PyCharm.

## Структура

```
client/              клієнтська частина (React, Vite, MUI)
server/              серверна частина (Express, Prisma)
  prisma/            схема БД (schema.prisma), міграції (migrations/), початкові дані (seed.js)
  scripts/           службові скрипти (перевірка підключення, міграцій та обмежень БД)
  src/               код API: routes → middleware → controllers → services → Prisma
  tests/             інтеграційні тести API (Jest, Supertest)
docker-compose.yml   контейнер PostgreSQL для розробки
.env.example         змінні для контейнера PostgreSQL
server/.env.example  змінні серверної частини (DATABASE_URL тощо)
```

## Вимоги

- Node.js LTS 22.12+ (або 24);
- Docker Desktop (Docker Engine), запущений;
- PyCharm Professional з плагінами Docker і Database Tools.

## Перший запуск

1. Скопіюйте `.env.example` → `.env` і `server/.env.example` → `server/.env`, задайте пароль
   (однаковий у `POSTGRES_PASSWORD` і в `DATABASE_URL`).
2. Установіть залежності (термінал PyCharm, корінь проєкту): `npm run install:all`.
3. Запустіть PostgreSQL: відкрийте `docker-compose.yml` у PyCharm і натисніть ▶ біля `services:`
   (або вікно **Services** → Docker → Docker Compose).
4. Перевірте підключення сервера до БД: `npm --prefix server run db:check`.
5. Застосуйте міграції: `npm --prefix server run prisma:migrate`.
6. Задайте `JWT_SECRET` (щонайменше 32 символи), `ADMIN_EMAIL` і `ADMIN_PASSWORD` у `server/.env`
   (за бажанням `SEED_DEMO_PASSWORD`; див. `server/.env.example`)
   і створіть початкові дані: `npm --prefix server run db:seed`.
7. Запустіть сервер: `npm run dev:server` → http://localhost:3000/api/health
8. Запустіть клієнт: `npm run dev:client` → http://localhost:5173

## База даних

Сутності `User`, `Slot`, `Booking` описано в `server/prisma/schema.prisma` (ТЗ, розділ 9).
Структура БД змінюється лише через міграції Prisma:

- `npm --prefix server run prisma:migrate` — створити й застосувати міграцію після зміни схеми;
- `npm --prefix server run prisma:status` — стан міграцій;
- `npm --prefix server run db:seed` — адміністратор і (якщо задано `SEED_DEMO_PASSWORD`) тестові
  викладачі `teacher1/2@session.local`, студенти `student1/2@session.local` та вільні слоти;
- `npm --prefix server run db:check-migrations` — частковий індекс `Booking_active_slot_unique` є в БД
  і жодна міграція його не видаляє;
- `npm --prefix server run db:check-constraints` — перевірка унікальності email, одного активного
  запису на слот і заборони видалення пов'язаних записів (у транзакції з відкатом, дані не змінюються).

Частковий унікальний індекс `Booking_active_slot_unique` (не більше одного запису `PENDING` або
`CONFIRMED` на слот) додано вручну до SQL міграції `init`, бо Prisma не описує такі індекси в схемі.
Після створення кожної нової міграції (`prisma migrate dev --create-only` для перегляду SQL)
переконайтеся, що вона не містить `DROP INDEX "Booking_active_slot_unique"`, і запустіть
`db:check-migrations`.

## Автентифікація та безпека

| Метод та шлях             | Призначення                               | Доступ          |
| ------------------------- | ----------------------------------------- | --------------- |
| `POST /api/auth/register` | Реєстрація (роль `STUDENT` або `TEACHER`) | Публічний       |
| `POST /api/auth/login`    | Вхід, отримання JWT (`{ token, user }`)   | Публічний       |
| `GET /api/auth/me`        | Дані поточного користувача                | Автентифіковані |

- Захищені запити містять заголовок `Authorization: Bearer <token>`; строк дії токена — 24 години.
- Middleware `auth` перевіряє токен і завантажує користувача з БД, `requireRole(...)` перевіряє роль.
- Паролі зберігаються лише як bcrypt-хеш (вартість 10); відповіді API не містять `passwordHash`.
- Вхідні дані перевіряються схемами Zod (`server/src/validation`), невідомі поля відкидаються.
- Помилки мають єдиний формат `{ "error": { "code", "message", "details": [] } }`.
- helmet (заголовки безпеки), CORS лише для `CLIENT_URL`, не більше 10 спроб реєстрації/входу
  за 15 хвилин з однієї IP-адреси (429).

## Тести

`npm --prefix server test` запускає інтеграційні тести на окремій БД з `TEST_DATABASE_URL`
(контейнер PostgreSQL має бути запущений; міграції до тестової БД застосовуються автоматично).

## Перевірки працездатності

| Адреса                | Очікувана відповідь                                                  |
| --------------------- | -------------------------------------------------------------------- |
| `GET /api/health`     | `{"status":"ok", ...}`                                               |
| `GET /api/health/db`  | `{"status":"ok","database":"connected"}` або 503, якщо БД недоступна |
| http://localhost:5173 | сторінка зі станом клієнта, сервера та бази даних                    |

## Якість коду

- `npm run lint` — ESLint для сервера й клієнта;
- `npm run format` / `npm run format:check` — Prettier для всього проєкту.

Файли `.env` до репозиторію не додаються (див. `.gitignore`).
