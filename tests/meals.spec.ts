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
  await page.getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('button', { name: '+ Add meal', exact: true }).first().click();
  await page.getByLabel('Saved recipe').selectOption({ label: 'Synthetic pasta' });
  await page.getByRole('button', { name: 'Save meal', exact: true }).click();
  await expect(page.getByText('Synthetic pasta', { exact: true })).toBeVisible();
  await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Today’s meals' })).toBeVisible();
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('navigation', { name: 'Home sections' }).getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('button', { name: 'Create Shopping List', exact: true }).click();
  await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
  await expect(page.getByText('1 lime', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add 2 ingredients', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('navigation', { name: 'Home sections' }).getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('group', { name: 'Shopping categories' }).getByRole('button', { name: /Home/ }).click();
  await expect(page.getByText('pasta', { exact: true })).toBeVisible();
  await expect(page.getByText('200 g', { exact: true })).toBeVisible();
});

test('phone layout uses English dates and navigates weeks in the local timezone', async ({ browser }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    const context = await browser.newContext({ viewport, locale: 'de-DE', timezoneId: 'Pacific/Auckland', serviceWorkers: 'block' });
    const server = transport(); await server.attach(context);
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-03-29T23:30:00Z'));
    await page.goto('./');
    await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await openShopping(page);
    await page.getByRole('button', { name: 'Meals', exact: true }).click();
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  }
});
