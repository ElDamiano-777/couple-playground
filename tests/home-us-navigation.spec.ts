import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('Home starts the app and Us opens the couple space on a phone', async ({ page, context }) => {
  const server = transport(); server.seedTask('Shared task', null, 'normal');
  await server.attach(context); await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home.' })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Home sections' })).toHaveCount(0);
  await expect(page.locator('.home-dashboard')).toContainText('Shared task');
  const nav = mainNavigation(page);
  await expect(nav.getByRole('button')).toHaveText(['Home', 'Shopping', 'Us', 'Places', 'More']);
  await expect(nav.getByRole('button', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('button', { name: 'Us', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Us.' })).toBeVisible();
  await expect(page.locator('.couple-page')).toContainText('Love Notes');
  await expect(page.locator('.couple-page')).toContainText('Shared Memories');
  await expect(page.locator('.home-dashboard')).toHaveCount(0);
  await page.getByRole('button', { name: /Wishlist/ }).click();
  await expect(page.getByRole('heading', { name: 'Wishlist.' })).toBeVisible();
  await nav.getByRole('button', { name: 'Us', exact: true }).click();
  await page.getByRole('button', { name: /Pets/ }).click();
  await expect(page.getByRole('heading', { name: 'Pets.' })).toBeVisible();
  await nav.getByRole('button', { name: 'Shopping', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shopping.' })).toBeVisible();
  await nav.getByRole('button', { name: 'More', exact: true }).click();
  for (const name of ['Recipes', 'Meals', 'Tasks', 'Expenses', 'Wishlist']) {
    await expect(page.locator('.more-shortcuts').getByRole('button', { name, exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Home.' })).toBeVisible();
});
