import { expect, test } from '@playwright/test';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('Shopping tab opens categories without the obsolete Home section navigation', async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const bottom = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await expect(bottom.getByRole('button')).toHaveText(['Home', 'Us', 'Shopping', 'Places', 'More']);
  await bottom.getByRole('button', { name: 'Shopping', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shopping.', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Shopping categories' })).toContainText('Home');
  await expect(page.getByRole('group', { name: 'Shopping categories' })).toContainText('Pets');
  await expect(page.getByRole('group', { name: 'Shopping categories' })).toContainText('Kids');
  await expect(page.getByRole('navigation', { name: 'Home sections' })).toHaveCount(0);
  await bottom.getByRole('button', { name: 'More', exact: true }).click();
  for (const name of ['Recipes', 'Meals', 'Tasks', 'Expenses', 'Wishlist']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});
