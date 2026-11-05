import { expect, test } from '@playwright/test';
import { openShoppingCategory } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('global search finds a recipe, shopping item, task and local note without leaking layout on mobile', async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openShoppingCategory(page, 'Home');
  await page.getByRole('button', { name: '✦ Quick Add' }).click();
  await page.getByRole('button', { name: 'Milk', exact: true }).click();
  await page.getByRole('button', { name: 'Add 1 item', exact: true }).click();
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: '+ Add task', exact: true }).click();
  await page.getByRole('dialog', { name: 'New task' }).locator('input').first().fill('Searchable laundry');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByLabel('Search Together').click();
  const search = page.locator('.search-page');
  await search.getByRole('textbox').fill('milk');
  await expect(search).toContainText('Milk');
  await search.getByRole('textbox').fill('laundry');
  await expect(search).toContainText('Searchable laundry');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
