import { defineConfig, devices } from '@playwright/test';
import { CLIENT_DIR, CLIENT_PORT, CLIENT_URL, SERVER_URL } from './env.js';

// Наскрізні тести Session (ТЗ, табл. 7.1): реєстрація та вхід, створення слота, бронювання
// слота, запис на консультацію від академічної заборгованості з перевіркою накладок (TC-25).
// Сервер і клієнт запускаються окремо від середовища розробки на інших портах з базою *_e2e.
export default defineConfig({
  testDir: './tests',
  // Тести спільно використовують одну базу й одного викладача, тому виконуються послідовно
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: CLIENT_URL,
    // Розклад демонстраційного постачальника задано в Europe/Kyiv, інтерфейс – українською
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Вхід тестових користувачів через API і збереження токена (e2e/.auth/*.json)
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'node scripts/start-server.js',
      url: `${SERVER_URL}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      // Журнал сервера (зокрема тексти листів) не виводиться; помилки – у stderr
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npm run dev -- --port ${CLIENT_PORT} --strictPort`,
      cwd: CLIENT_DIR,
      url: CLIENT_URL,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { VITE_API_PROXY: SERVER_URL },
    },
  ],
});
