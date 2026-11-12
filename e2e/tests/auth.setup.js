import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { CLIENT_URL, DEMO_PASSWORD, SERVER_URL, USERS, storageStatePath } from '../env.js';

// Вхід тестових користувачів через API (POST /api/auth/login) і збереження токена у форматі
// storageState: клієнт читає його з localStorage (ключ session.token). Так сценарії не витрачають
// ліміт спроб входу (10 за 15 хвилин з однієї IP-адреси) на кожен тест.
for (const name of ['teacher1', 'student1', 'student2']) {
  setup(`вхід: ${name}`, async ({ request }) => {
    const response = await request.post(`${SERVER_URL}/api/auth/login`, {
      data: { email: USERS[name].email, password: DEMO_PASSWORD },
    });
    expect(response.status()).toBe(200);
    const { token } = await response.json();

    const path = storageStatePath(name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      JSON.stringify({
        cookies: [],
        origins: [{ origin: CLIENT_URL, localStorage: [{ name: 'session.token', value: token }] }],
      }),
    );
  });
}
