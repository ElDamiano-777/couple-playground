import { expect, test, type Page } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { openShoppingCategory } from './navigation';

test.use({ serviceWorkers: 'block' });
async function login(page: Page, name: 'Masha' | 'Damian') {
  await page.goto('./'); await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openShoppingCategory(page, 'Home');
  await page.getByRole('button', { name: '✦ Quick Add' }).click();
}
test('the picker saves reusable product options and prevents duplicates across partners', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ viewport: { width: 320, height: 844 }, serviceWorkers: 'block' });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  try {
    await login(first, 'Masha'); await login(second, 'Damian');
    await first.getByRole('button', { name: '+ Add favorite' }).click();
    const categories = first.getByRole('group', { name: 'Product categories' });
    await expect(categories.getByRole('button')).toHaveText(['Dairy', 'Bread & Bakery', 'Sandwich Toppings', 'Meat & Poultry', 'Vegetables & Fruit', 'Pantry', 'Drinks', 'Cleaning', 'Household Essentials', 'Pet Products']);
    await categories.getByRole('button', { name: 'Sandwich Toppings' }).click();
    await expect(first.getByRole('group', { name: 'Sandwich Toppings products' }).getByRole('button', { name: 'Chicken slices' })).toBeVisible();
    await categories.getByRole('button', { name: 'Dairy' }).click();
    expect(await first.locator('.quick-content').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await first.getByRole('group', { name: 'Dairy products' }).getByRole('button', { name: 'Milk', exact: true }).click();
    await expect(first.getByLabel('Product name')).toHaveValue('Milk');
    await first.getByLabel('Brand (optional)').fill('Example');
    await first.getByLabel('Flavor (optional)').fill('Oat');
    await first.getByLabel('Size (optional)').fill('1 L');
    await first.getByLabel('Quantity (optional)').fill('2');
    await first.getByLabel('Notes (optional)', { exact: true }).fill('Unsweetened');
    await first.getByRole('button', { name: 'Save favorite' }).click();
    await expect(first.locator('.favorite-select').filter({ hasText: 'Milk' })).toContainText('Example · Oat · 1 L · 2');
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(second.locator('.favorite-select').filter({ hasText: 'Milk' })).toBeVisible();
    await second.getByRole('button', { name: '+ Add favorite' }).click();
    await second.getByRole('group', { name: 'Dairy products' }).getByRole('button', { name: 'Milk', exact: true }).click();
    await second.getByLabel('Brand (optional)').fill('example');
    await second.getByLabel('Flavor (optional)').fill('oat');
    await second.getByLabel('Size (optional)').fill('1 l');
    await second.getByLabel('Quantity (optional)').fill('4');
    await second.getByRole('button', { name: 'Save favorite' }).click();
    await expect(second.getByRole('alert')).toContainText('already in favorites');
    await expect(second.getByLabel('Quantity (optional)')).toHaveValue('4');
    await second.getByLabel('Size (optional)').fill('2 L');
    await second.getByRole('button', { name: 'Save favorite' }).click();
    await expect(second.locator('.favorite-select').filter({ hasText: 'Milk' })).toHaveCount(2);
    await first.locator('.favorite-select').filter({ hasText: 'Milk' }).click();
    await expect(first.locator('.quick-selection').getByLabel('Details (optional)')).toHaveValue('Brand: Example · Flavor: Oat · Size: 1 L · Quantity or size: 2 · Unsweetened');
    await first.getByRole('button', { name: 'Add 1 item' }).click();
    await expect(first.getByText('Brand: Example · Flavor: Oat · Size: 1 L · Quantity or size: 2 · Unsweetened')).toBeVisible();
  } finally { await a.close(); await b.close(); }
});
