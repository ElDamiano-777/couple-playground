import { expect, test } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
test('catalog groups contain specific items without removing saved generic favorites', async ({ page, context }) => {
  const server = transport();
  server.seedFavorite('Bread', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5X0QAAAABJRU5ErkJggg==');
  await server.attach(context);
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).tap();
  await page.getByRole('button', { name: '+ Quick Add Item' }).tap();
  const modal = page.locator('.quick-add');
  await expect(modal.locator('.favorite-card').filter({ hasText: 'Bread' })).toBeVisible();
  for (const [group, specific] of [['Bread', 'Bagels'], ['Meat', 'Beef'], ['Cheese', 'Mozzarella'], ['Vegetables', 'Carrots'], ['Fruit', 'Apples'], ['Pasta', 'Penne']]) {
    const parent = modal.locator('.quick-subgroup-toggle').getByText(group, { exact: true }).locator('..');
    await parent.tap();
    const children = parent.locator('..').locator('.quick-subtiles');
    await expect(children.getByRole('button', { name: specific, exact: true })).toBeVisible();
    await expect(children.getByRole('button', { name: group, exact: true })).toHaveCount(0);
    await parent.tap();
  }
  for (const name of ['Eggs', 'Milk', 'Rice']) await expect(modal.locator('.quick-group').getByRole('button', { name, exact: true })).toBeEnabled();
  await page.getByLabel('Search products').fill('Bread');
  const results = modal.locator('.quick-search-results');
  await expect(results.getByRole('button', { name: 'Toast bread', exact: true })).toBeVisible();
  await expect(results.getByRole('button', { name: 'Bread', exact: true })).toHaveCount(0);
  await expect(modal.locator('.favorite-card').filter({ hasText: 'Bread' })).toBeVisible();
});
