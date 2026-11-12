import { test, expect } from '@playwright/test';
import { USERS, storageStatePath } from '../env.js';
import { createSlot } from '../helpers.js';

// Демонстраційний студент student1 (DEMO-S-1001) має відкриту заборгованість з дисципліни
// «Бази даних», яку викладає teacher1; seed створює для teacher1 слот із накладкою на заняття.
test.use({ storageState: storageStatePath('student1') });

const SUBJECT = 'Бази даних';
const DEMO_LABEL = 'Демонстраційні дані.';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  // Гарантований слот без накладки (вечір через 6 діб) незалежно від дня тижня запуску
  await createSlot(request, 'teacher1', {
    days: 6,
    hh: '19',
    mm: '30',
    location: 'Аудиторія E2E-406',
  });
});

// TC-25: від картки заборгованості на «Головній» до створеного запису з попередньо заповненою
// темою – не більше 4 дій; конфліктні слоти приховано за замовчуванням (FR-33, FR-35, FR-38)
test('TC-25: запис на консультацію від заборгованості не більше ніж за 4 дії', async ({ page }) => {
  let actions = 0;
  const act = async (locator) => {
    actions += 1;
    await locator.click();
  };

  await page.goto('/dashboard');
  await expect(page.getByText(DEMO_LABEL)).toBeVisible();
  const debtCard = page.locator('.MuiCard-root').filter({
    has: page.getByRole('heading', { name: SUBJECT }),
  });
  await expect(debtCard).toContainText('Відкрита');

  // Дія 1: «Записатися на консультацію» на картці заборгованості → сторінка дисципліни
  await act(debtCard.getByRole('link', { name: 'Записатися на консультацію' }));
  await expect(page.getByRole('heading', { name: SUBJECT, level: 1 })).toBeVisible();
  await expect(page.getByText(DEMO_LABEL)).toBeVisible();

  // Дія 2: «Обрати час» у картці викладача дисципліни → вільні слоти викладача
  const teacherCard = page.locator('.MuiCard-root').filter({ hasText: USERS.teacher1.fullName });
  await act(teacherCard.getByRole('link', { name: 'Обрати час' }));
  await expect(
    page.getByRole('heading', { name: USERS.teacher1.fullName, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(`Запис щодо дисципліни «${SUBJECT}»`)).toBeVisible();

  // Конфліктні слоти приховано за замовчуванням
  await expect(page.getByRole('switch', { name: 'Лише без накладок' })).toBeChecked();
  await expect(page.getByText(/Приховано \d+ слот/)).toBeVisible();
  await expect(page.getByText('Накладка із заняттям')).toHaveCount(0);
  const slotRows = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'Забронювати' }) });
  await expect(slotRows.first()).toContainText('Без накладок');

  // Дія 3: «Забронювати» у найближчому слоті без накладки → форма з заповненою темою
  await act(slotRows.first().getByRole('button', { name: 'Забронювати' }));
  const dialog = page.getByRole('dialog', { name: 'Бронювання консультації' });
  await expect(dialog).toContainText(`Дисципліна: ${SUBJECT}`);
  const topicField = dialog.getByLabel('Тема запитання');
  await expect(topicField).toHaveValue(new RegExp(`^${SUBJECT}: .+ \\(заборгованість\\)$`));
  const topic = await topicField.inputValue();

  // Дія 4: «Забронювати» у формі → запис створено
  await act(dialog.getByRole('button', { name: 'Забронювати' }));
  await expect(page.getByText('Запис створено. Очікує підтвердження викладача')).toBeVisible();
  expect(actions).toBeLessThanOrEqual(4);

  // Запис із дисципліною та темою видно в «Моїх записах»
  await page.goto('/my-bookings');
  const booking = page.locator('.MuiCard-root').filter({ hasText: topic });
  await expect(booking).toHaveCount(1);
  await expect(booking).toContainText(SUBJECT);
  await expect(booking).toContainText('Очікує підтвердження');
});

// Перевірка накладок (FR-34, FR-35): слот, що перетинається із заняттям, позначено;
// бронювання можливе лише після явного підтвердження накладки
test('бронювання слота з накладкою потребує підтвердження', async ({ page }) => {
  await page.goto('/teachers');
  await page.getByRole('link', { name: new RegExp(USERS.teacher1.fullName) }).click();
  await expect(
    page.getByRole('heading', { name: USERS.teacher1.fullName, level: 1 }),
  ).toBeVisible();

  await page.getByRole('switch', { name: 'Лише без накладок' }).uncheck();
  const conflictRow = page.getByRole('row').filter({ hasText: 'Накладка із заняттям' }).first();
  await expect(conflictRow).toBeVisible();
  await conflictRow.getByRole('button', { name: 'Забронювати' }).click();

  const dialog = page.getByRole('dialog', { name: 'Бронювання консультації' });
  await expect(dialog.getByText('Консультація перетинається із заняттям')).toBeVisible();
  await dialog.getByLabel('Тема запитання').fill('Консультація попри заняття (e2e)');
  const submit = dialog.getByRole('button', { name: 'Забронювати' });
  await expect(submit).toBeDisabled();

  await dialog.getByRole('checkbox').check();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Запис створено. Очікує підтвердження викладача')).toBeVisible();
});

// Прозорість демонстраційних даних (FR-37; ТЗ, табл. 3.1): позначка є на всіх академічних сторінках
test('позначка «Демонстраційні дані» на всіх академічних сторінках', async ({ page }) => {
  const pages = [
    { path: '/dashboard', heading: 'Головна' },
    { path: '/schedule', heading: 'Розклад' },
    { path: '/academic', heading: 'Успішність' },
  ];
  for (const { path, heading } of pages) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await expect(page.getByText(DEMO_LABEL), `сторінка ${path}`).toBeVisible();
  }

  // Сторінка дисципліни – перехід з картки заборгованості на «Успішності»
  await page.goto('/academic?tab=debts');
  await page
    .locator('.MuiCard-root')
    .filter({ has: page.getByRole('heading', { name: SUBJECT }) })
    .getByRole('link', { name: 'Записатися на консультацію' })
    .click();
  await expect(page.getByRole('heading', { name: SUBJECT, level: 1 })).toBeVisible();
  await expect(page.getByText(DEMO_LABEL)).toBeVisible();
});
