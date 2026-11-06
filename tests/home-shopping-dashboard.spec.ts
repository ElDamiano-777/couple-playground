import { expect, test } from '@playwright/test';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('Home shows active shopping items with independent purchase controls', async ({ page, context }) => {
  const server = transport();
  server.seedShopping('Dashboard milk', 'Brand: Example · Quantity: 1 l');
  await server.attach(context);
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.us-shopping-list')).toContainText('Dashboard milk');
  await expect(page.getByLabel('Mark Dashboard milk as purchased')).toBeVisible();
  await page.locator('.us-shopping-open').filter({ hasText: 'Dashboard milk' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard milk' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByLabel('Mark Dashboard milk as purchased').click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
});
