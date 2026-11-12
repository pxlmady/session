import { test, expect } from '@playwright/test';

// Сценарій «Реєстрація та вхід» (ТЗ, табл. 7.1; FR-01, FR-02): новий студент реєструється
// через форму, потрапляє на свою стартову сторінку, виходить і входить знову.
test('реєстрація студента, вихід і повторний вхід', async ({ page }) => {
  const email = `e2e.student.${Date.now()}@session.local`;
  const password = 'E2eStudent2026';

  await page.goto('/register');
  await page.getByRole('button', { name: 'Студент' }).click();
  await page.getByLabel('ПІБ').fill('Студент E2E Реєстрація');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByLabel('Академічна група').fill('Група E2E');
  await page.getByRole('button', { name: 'Зареєструватися' }).click();

  // Після реєстрації клієнт виконує вхід і відкриває стартову сторінку студента
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Головна', level: 1 })).toBeVisible();
  await expect(page.getByText('Студент E2E Реєстрація').first()).toBeVisible();

  await page.getByRole('button', { name: 'Вийти' }).first().click();
  await expect(page).toHaveURL(/\/login$/);

  // Захищена сторінка без входу недоступна
  await page.goto('/my-bookings');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Головна', level: 1 })).toBeVisible();
});
