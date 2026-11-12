import { test, expect } from '@playwright/test';
import { USERS, storageStatePath } from '../env.js';
import { createSlot, uiDate } from '../helpers.js';

test.use({ storageState: storageStatePath('student2') });

// Сценарій «Бронювання слота» (ТЗ, табл. 7.1; FR-14, FR-15): студент знаходить викладача,
// бронює вільний слот із темою запитання, запис з'являється в «Моїх записах» зі статусом
// «Очікує підтвердження», а слот зникає з вільних.
test('студент бронює вільний слот викладача', async ({ page, request }) => {
  // Вільний слот викладача без накладки із заняттями студента (вечір через 9 діб)
  const location = 'Аудиторія E2E-309';
  const { local } = await createSlot(request, 'teacher1', {
    days: 9,
    hh: '19',
    mm: '30',
    location,
  });
  const topic = 'Питання щодо курсового проєкту (e2e)';

  await page.goto('/teachers');
  await page.getByLabel('Пошук за ПІБ').fill('Перший');
  await page.getByRole('link', { name: new RegExp(USERS.teacher1.fullName) }).click();
  await expect(
    page.getByRole('heading', { name: USERS.teacher1.fullName, level: 1 }),
  ).toBeVisible();

  const row = page.getByRole('row').filter({ hasText: location });
  await expect(row).toContainText(uiDate(local));
  await expect(row).toContainText('Без накладок');
  await row.getByRole('button', { name: 'Забронювати' }).click();

  const dialog = page.getByRole('dialog', { name: 'Бронювання консультації' });
  // Тема запитання обов'язкова
  await dialog.getByRole('button', { name: 'Забронювати' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.Mui-error').first()).toBeVisible();

  await dialog.getByLabel('Тема запитання').fill(topic);
  await dialog.getByRole('button', { name: 'Забронювати' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Запис створено. Очікує підтвердження викладача')).toBeVisible();
  // Заброньований слот більше не показується серед вільних
  await expect(page.getByRole('row').filter({ hasText: location })).toHaveCount(0);

  await page.goto('/my-bookings');
  const booking = page.locator('.MuiCard-root').filter({ hasText: topic });
  await expect(booking).toHaveCount(1);
  await expect(booking).toContainText(USERS.teacher1.fullName);
  await expect(booking).toContainText('Очікує підтвердження');
});
