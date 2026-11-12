import { expect, test } from '@playwright/test';
import { mainNavigation, openShopping } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('meal planner selects a recipe and reviews its quantities before adding to shared Shopping', async ({ page, context }) => {
  const server = transport(); server.seedRecipe('Synthetic pasta', '200 g pasta\n1 lime');
  await server.attach(context);
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openShopping(page);
  await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click(); await page.locator('.more-shortcuts').getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('button', { name: '+ Add meal', exact: true }).first().click();
  await page.getByLabel('Saved recipe').selectOption({ label: 'Synthetic pasta' });
  await page.getByRole('button', { name: 'Save meal', exact: true }).click();
  await expect(page.getByText('Synthetic pasta', { exact: true })).toBeVisible();
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: /Tonight’s dinner/ })).toBeVisible();
  await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'More', exact: true }).click();
  await page.locator('.more-shortcuts').getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('button', { name: 'Create Shopping List', exact: true }).click();
  await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
  await expect(page.getByText('1 lime', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add 2 ingredients', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('group', { name: 'Shopping categories' }).getByRole('button', { name: /Home/ }).click();
  await expect(page.getByText('pasta', { exact: true })).toBeVisible();
  await expect(page.getByText('200 g', { exact: true })).toBeVisible();
});

test('phone layout uses English dates and navigates weeks in the local timezone', async ({ browser }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    const context = await browser.newContext({ viewport, locale: 'de-DE', timezoneId: 'Pacific/Auckland', serviceWorkers: 'block' });
    const server = transport();
    const longName = 'A very long dinner recipe with roasted vegetables and herbs and a wonderful sauce for the whole family to enjoy together';
    server.seedRecipe(longName, '200 g pasta', { instructions: 'Cook the pasta.' });
    await server.attach(context);
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-03-29T23:30:00Z'));
    await page.goto('./');
    await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await openShopping(page);
    await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click(); await page.locator('.more-shortcuts').getByRole('button', { name: 'Meals', exact: true }).click();
    await expect(page.locator('.meal-day h2').first()).toHaveText('Monday 30 Mar');
    const first = await page.locator('.meal-day').nth(0).boundingBox();
    const second = await page.locator('.meal-day').nth(1).boundingBox();
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.locator('.meal-day h2').first()).toHaveText('Monday 6 Apr');
    await page.getByRole('button', { name: 'Previous week' }).click();
    await page.getByRole('button', { name: '+ Add meal', exact: true }).first().click();
    await page.getByLabel('Custom meal name').fill('Toast');
    await page.getByRole('button', { name: 'Save meal' }).click();
    await expect(page.getByText('Toast', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '+ Add meal' }).nth(0).click();
    await page.getByLabel('Saved recipe').selectOption({ label: longName });
    await page.getByRole('button', { name: 'Save meal' }).click();
    const longCard = page.locator('.meal-card').filter({ hasText: longName });
    const titleSize = await longCard.locator('strong').evaluate(element => {
      const style = getComputedStyle(element);
      return { height: element.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight), clamp: style.webkitLineClamp, clipped: element.scrollHeight > element.clientHeight };
    });
    expect(titleSize.clamp).toBe('2');
    expect(titleSize.height).toBeLessThanOrEqual(titleSize.lineHeight * 2 + 1);
    expect(titleSize.clipped).toBe(true);
    expect((await page.locator('.meal-day').first().boundingBox())!.height).toBeLessThan(110);
    await longCard.click();
    await page.getByRole('button', { name: 'View recipe' }).click();
    await expect(page.locator('.recipe-detail h1')).toHaveText(longName);
    await expect(page.locator('.recipe-detail')).toContainText('Cook the pasta.');
    await page.getByRole('button', { name: '← Meals' }).click();
    const shopping = page.getByRole('button', { name: 'Create Shopping List' });
    await shopping.scrollIntoViewIfNeeded();
    const shoppingBox = await shopping.boundingBox();
    const navBox = await mainNavigation(page).boundingBox();
    expect(shoppingBox!.y + shoppingBox!.height).toBeLessThanOrEqual(navBox!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  }
});


test('dinner details, editing, moving and removal preserve other meal data', async ({ page, context }) => {
  const server = transport();
  server.seedRecipe('Synthetic pasta', '200 g pasta', { instructions: 'Boil pasta.', photo: 'https://example.com/pasta.jpg' });
  server.seedRecipe('Synthetic soup', '1 carrot');
  server.seedMeal('2026-03-30', 'Breakfast', 'Existing breakfast');
  server.seedMeal('2026-03-30', 'Lunch', 'Existing lunch');
  await server.attach(context);
  await page.clock.setFixedTime(new Date('2026-03-30T12:00:00Z'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openShopping(page);
  await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click(); await page.locator('.more-shortcuts').getByRole('button', { name: 'Meals', exact: true }).click();
  await expect(page.locator('.meal-day')).toHaveCount(7);
  await expect(page.locator('.meal-slot')).toHaveCount(7);
  await expect(page.getByText('Existing breakfast')).toHaveCount(0);
  await expect(page.getByText('Existing lunch')).toHaveCount(0);
  await page.getByRole('button', { name: '+ Add meal' }).first().click();
  await expect(page.getByLabel('Meal', { exact: true })).toHaveCount(0);
  await page.getByLabel('Saved recipe').selectOption({ label: 'Synthetic pasta' });
  await page.getByRole('button', { name: 'Save meal' }).click();
  const before = server.meals();
  await page.getByRole('button', { name: /Synthetic pasta/ }).click();
  await page.getByRole('button', { name: 'View recipe' }).click();
  await expect(page.locator('.recipe-detail')).toContainText('200 g pasta');
  await expect(page.locator('.recipe-detail')).toContainText('Boil pasta.');
  await expect(page.locator('.recipe-detail img')).toHaveAttribute('src', 'https://example.com/pasta.jpg');
  expect(server.meals()).toEqual(before);
  await page.getByRole('button', { name: 'Edit dinner' }).click();
  await page.getByLabel('Day').selectOption('1');
  await page.getByLabel('Saved recipe').selectOption({ label: 'Synthetic soup' });
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.locator('.meal-day').nth(1)).toContainText('Synthetic soup');
  await page.getByRole('button', { name: /Synthetic soup/ }).click();
  await page.getByRole('button', { name: 'View recipe' }).click();
  await expect(page.locator('.recipe-detail')).toContainText('1 carrot');
  await page.getByRole('button', { name: 'Edit dinner' }).click();
  await page.getByLabel('Saved recipe').selectOption('');
  await page.getByLabel('Custom meal name').fill('A very long custom dinner name for our family');
  await page.getByRole('button', { name: 'Save meal' }).click();
  await page.getByRole('button', { name: /A very long custom dinner/ }).click();
  await expect(page.getByRole('dialog', { name: 'Dinner options' })).toContainText('A very long custom dinner name');
  await expect(page.getByRole('button', { name: 'View recipe' })).toBeDisabled();
  await page.getByRole('button', { name: 'Change dinner' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('button', { name: /A very long custom dinner/ })).toHaveCount(0);
  expect(server.meals().map(item => item.title).sort()).toEqual(['Existing breakfast', 'Existing lunch']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'More', exact: true }).click();
  await page.locator('.more-shortcuts').getByRole('button', { name: 'Recipes', exact: true }).click();
  await expect(page.getByText('Synthetic pasta', { exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic soup', { exact: true })).toBeVisible();
});


test('planned dinner ingredients offer duplicate choices and sync to the other phone', async ({ browser }) => {
  const server = transport();
  server.seedRecipe('Dinner with rice', '200 g pasta\n1 cup rice\n2 limes');
  server.seedShopping('pasta', 'Brand: Favourite · whole wheat');
  server.seedShopping('rice', 'Brand: Favourite · Size: 1 kg');
  server.seedShopping('limes', 'Old purchase', true);
  const first = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const second = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block' });
  await server.attach(first); await server.attach(second);
  const a = await first.newPage(), b = await second.newPage();
  try {
    for (const [page, name] of [[a, 'Masha'], [b, 'Damian']] as const) {
      await page.goto('./'); await page.getByRole('button', { name, exact: true }).click();
      await page.getByLabel('Password', { exact: true }).fill(pocPassword);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    }
    await openShopping(a); await mainNavigation(a).getByRole('button', { name: 'More', exact: true }).click(); await a.locator('.more-shortcuts').getByRole('button', { name: 'Meals', exact: true }).click();
    await a.getByRole('button', { name: '+ Add meal' }).first().click();
    await a.getByLabel('Saved recipe').selectOption({ label: 'Dinner with rice' });
    await a.getByRole('button', { name: 'Save meal' }).click();
    await a.getByRole('button', { name: /Dinner with rice/ }).click();
    await a.getByRole('button', { name: 'View recipe' }).click();
    await a.getByRole('button', { name: '+ Add ingredients to Shopping' }).click();
    const dialog = a.getByRole('dialog', { name: 'Add to Shopping' });
    await expect(dialog.getByLabel('For rice')).toBeVisible();
    await expect(dialog.getByLabel('For pasta')).toHaveValue('skip');
    await dialog.getByRole('button', { name: 'Deselect all' }).click();
    await expect(dialog.getByRole('checkbox', { checked: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Select all', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { checked: true })).toHaveCount(3);
    await dialog.getByLabel('For rice').selectOption('update');
    await dialog.getByRole('button', { name: 'Add 3 items' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(a.getByRole('status')).toContainText('1 ingredient added · 1 quantity updated · 1 skipped');
    await mainNavigation(b).getByRole('button', { name: 'Home', exact: true }).click();
    await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    const rice = b.locator('.us-shopping-item').filter({ hasText: 'rice' });
    await expect(rice).toContainText('Brand: Favourite · Size: 1 kg');
    await expect(rice).toContainText('Recipe quantity: 1 cup');
    await expect(b.locator('.us-shopping-item').filter({ hasText: 'pasta' })).toContainText('whole wheat');
    await expect(b.locator('.us-shopping-item:not(.is-bought)').filter({ hasText: 'limes' })).toContainText('2');
    expect(await b.locator('.us-shopping-item').filter({ hasText: 'pasta' }).count()).toBe(1);
    expect(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await first.close(); await second.close(); }
});


test('dinner menu changes and removes the plan without deleting the shared recipe', async ({ browser }) => {
  const server = transport(); server.seedRecipe('Roast vegetables', '2 carrots', { instructions: 'Roast until tender.' });
  server.seedRecipe('Lentil soup', '1 cup lentils');
  const first = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const second = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block' });
  await server.attach(first); await server.attach(second);
  const a = await first.newPage(), b = await second.newPage();
  try {
    for (const [page, name] of [[a, 'Masha'], [b, 'Damian']] as const) {
      await page.goto('./'); await page.getByRole('button', { name, exact: true }).click();
      await page.getByLabel('Password', { exact: true }).fill(pocPassword);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await openShopping(page); await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click(); await page.locator('.more-shortcuts').getByRole('button', { name: 'Meals', exact: true }).click();
    }
    await a.locator('.meal-day').first().getByRole('button', { name: '+ Add meal' }).click();
    await a.getByLabel('Saved recipe').selectOption({ label: 'Roast vegetables' });
    await a.getByRole('button', { name: 'Save meal' }).click();
    await a.getByRole('button', { name: /Roast vegetables/ }).click();
    const menu = a.getByRole('dialog', { name: 'Dinner options' });
    await expect(menu.getByRole('button', { name: 'View recipe' })).toBeEnabled();
    await menu.getByRole('button', { name: 'View recipe' }).click();
    await expect(a.locator('.recipe-detail')).toContainText('Roast until tender.');
    await a.getByRole('button', { name: '← Meals' }).click();
    await a.getByRole('button', { name: /Roast vegetables/ }).click();
    await menu.getByRole('button', { name: 'Change dinner' }).click();
    await expect(a.getByLabel('Day')).toHaveValue('0');
    await a.getByLabel('Saved recipe').selectOption({ label: 'Lentil soup' });
    await a.getByRole('button', { name: 'Save meal' }).click();
    await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(b.getByRole('button', { name: /Lentil soup/ })).toBeVisible();
    await a.getByRole('button', { name: /Lentil soup/ }).click();
    await menu.getByRole('button', { name: 'Remove from plan' }).click();
    await expect(a.locator('.meal-day').first().getByRole('button', { name: '+ Add meal' })).toBeVisible();
    await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(b.locator('.meal-day').first().getByRole('button', { name: '+ Add meal' })).toBeVisible();
    await a.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'More', exact: true }).click();
  await a.locator('.more-shortcuts').getByRole('button', { name: 'Recipes', exact: true }).click();
    await expect(a.locator('.recipe-card').filter({ hasText: 'Roast vegetables' })).toBeVisible();
    await expect(a.locator('.recipe-card').filter({ hasText: 'Lentil soup' })).toBeVisible();
  } finally { await first.close(); await second.close(); }
});
