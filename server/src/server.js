import { env } from './config/env.js';
import { app } from './app.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(env.port, () => {
  console.log(`Сервер Session запущено: http://localhost:${env.port}/api/health`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
