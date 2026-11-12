import { test, expect } from '@playwright/test';
import { storageStatePath } from '../env.js';
import { kyivDateTime, uiDate } from '../helpers.js';

test.use({ storageState: storageStatePath('teacher1') });

// Сценарій «Створення слота» (ТЗ, табл. 7.1; FR-08): викладач створює слот через форму,
// слот з'являється в списку «Мої слоти» зі статусом «Вільний»; некоректний час відхиляється.
test('викладач створює слот консультації', async ({ page }) => {
  // Вечірній час через 8 діб: не перетинається зі слотами з seed і заняттями демонстраційного розкладу
  const start = kyivDateTime(8, '19', '00');
  const end = kyivDateTime(8, '19', '30');
  const location = 'Аудиторія E2E-208';

  await page.goto('/slots');
  await expect(page.getByRole('heading', { name: 'Мої слоти', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Створити слот' }).click();
  const dialog = page.getByRole('dialog', { name: 'Новий слот' });

  // Завершення раніше за початок – помилка валідації, слот не створюється
  await dialog.getByLabel('Початок').fill(start.local);
  await dialog.getByLabel('Завершення').fill(kyivDateTime(8, '18', '30').local);
  await dialog.getByRole('button', { name: 'Зберегти' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.Mui-error').first()).toBeVisible();

  await dialog.getByLabel('Завершення').fill(end.local);
  await dialog.getByLabel('Місце проведення').fill(location);
  await dialog.getByRole('button', { name: 'Зберегти' }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole('row').filter({ hasText: location });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(uiDate(start.local));
  await expect(row).toContainText('19:00–19:30');
  await expect(row).toContainText('Вільний');
});
