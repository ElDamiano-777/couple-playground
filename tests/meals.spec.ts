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
  await expect(page.getByRole('heading', { name: 'This week’s meals' })).toBeVisible();
  await expect(page.getByText('Synthetic pasta', { exact: true })).toBeVisible();
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
