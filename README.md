# Session

Навчальний прототип вебсервісу для запису студентів на консультації з викладачами.

Стек: React + Vite + Material UI (клієнт), Node.js + Express (сервер), PostgreSQL + Prisma ORM (дані).
Запуск лише локальний; PostgreSQL працює в Docker-контейнері, яким керує PyCharm.

## Структура

```
client/              клієнтська частина (React, Vite, MUI)
server/              серверна частина (Express, Prisma)
  prisma/            схема бази даних Prisma
  scripts/           службові скрипти (перевірка підключення до БД)
  src/               код API
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
5. Запустіть сервер: `npm run dev:server` → http://localhost:3000/api/health
6. Запустіть клієнт: `npm run dev:client` → http://localhost:5173

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
