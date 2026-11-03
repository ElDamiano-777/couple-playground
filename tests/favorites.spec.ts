import { expect, test, type Page } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { openShopping, openShoppingCategory } from './navigation';

test.use({ serviceWorkers: 'block' });
async function login(page: Page, name: 'Masha' | 'Damian') {
  await page.goto('./'); await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openShoppingCategory(page, 'Home');
  await page.getByRole('button', { name: '✦ Quick Add' }).click();
}
test('favorites and private photos persist, sync and stay independent of purchases', async ({ browser }) => {
  test.setTimeout(150000);
  const server = transport();
  const a = await browser.newContext({ viewport: { width: 320, height: 844 }, serviceWorkers: 'block' });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(); const second = await b.newPage();
  try {
    await login(first, 'Masha'); await login(second, 'Damian');
    await first.getByRole('button', { name: '+ Add favorite' }).click();
    await first.getByLabel('Product name').fill('Favorite tea');
    await first.getByLabel('Brand (optional)').fill('Example');
    await first.getByLabel('Quantity or size (optional)').fill('2 boxes');
    await first.getByLabel('Notes (optional)', { exact: true }).fill('Mint');
    const tallPhoto = await first.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 1600;
      const context = canvas.getContext('2d')!; context.fillStyle = '#865ca5'; context.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await first.getByLabel('Product photo (optional)').setInputFiles({ name: 'product.png', mimeType: 'image/png', buffer: Buffer.from(tallPhoto, 'base64') });
    await expect(first.getByAltText('Product photo preview')).toBeVisible();
    await first.getByRole('button', { name: 'Save favorite' }).click();
    await expect(first.locator('.favorite-card img')).toBeVisible();
    await expect(first.locator('.favorite-card img')).toHaveCSS('object-fit', 'contain');
    expect(await first.locator('.favorite-thumb').evaluate(container => {
      const outer = container.getBoundingClientRect(); const image = container.querySelector('img')!.getBoundingClientRect();
      return image.left >= outer.left && image.right <= outer.right && image.top >= outer.top && image.bottom <= outer.bottom;
    })).toBe(true);
    expect(await first.locator('.quick-content').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await first.reload();
    await openShopping(first);
    await openShoppingCategory(first, 'Home');
    await first.getByRole('button', { name: '✦ Quick Add' }).click();
    await expect(first.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toBeVisible();
    await expect(first.locator('.favorite-card img')).toBeVisible();
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(second.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toBeVisible();
    await expect(second.locator('.favorite-card img')).toBeVisible();
    await second.getByRole('button', { name: '+ Add favorite' }).click();
    await second.getByLabel('Product name').fill('Pet treats');
    await second.getByLabel('Shopping category').selectOption('Pets');
    await second.getByRole('button', { name: 'Save favorite' }).click();
    await expect(second.locator('.favorite-select').filter({ hasText: 'Pet treats' })).toHaveCount(0);
    await second.getByRole('button', { name: 'Close', exact: true }).click();
    await second.getByRole('button', { name: '← Shopping' }).click();
    await openShoppingCategory(second, 'Pets');
    await second.getByRole('button', { name: '✦ Quick Add' }).click();
    await expect(second.locator('.favorite-select').filter({ hasText: 'Pet treats' })).toBeVisible();
    await expect(second.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toHaveCount(0);
    await second.getByRole('button', { name: 'Close', exact: true }).click();
    await second.getByRole('button', { name: '← Shopping' }).click();
    await openShoppingCategory(second, 'Home');
    await second.getByRole('button', { name: '✦ Quick Add' }).click();
    await expect(second.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toBeVisible();
    await second.getByLabel('Actions for favorite Favorite tea').click();
    await second.getByRole('button', { name: 'Edit', exact: true }).click();
    await second.getByLabel('Quantity or size (optional)').fill('3 boxes');
    await second.getByRole('button', { name: 'Save favorite' }).click();
    await expect(second.getByText('Example · 3 boxes')).toBeVisible();
    await first.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(first.getByText('Example · 3 boxes')).toBeVisible();
    await first.locator('.favorite-select').filter({ hasText: 'Favorite tea' }).click();
    const detail = first.locator('.quick-selection').filter({ hasText: 'Favorite tea' }).getByLabel('Details (optional)');
    await expect(detail).toHaveValue('Brand: Example · Quantity or size: 3 boxes · Mint');
    await detail.fill('Example, 1 box');
    await first.getByRole('button', { name: 'Add 1 item' }).click();
    await expect(first.getByText('Example, 1 box')).toBeVisible();
    first.once('dialog', dialog => dialog.accept());
    await first.getByRole('button', { name: 'Remove Favorite tea' }).click();
    await first.getByRole('button', { name: '✦ Quick Add' }).click();
    await expect(first.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toBeVisible();
    await first.getByLabel('Search products').fill('favorite');
    await expect(first.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toBeVisible();
    await expect(first.getByText('No products found. You can add a custom product below.')).toHaveCount(0);
    first.once('dialog', dialog => dialog.dismiss());
    await first.getByLabel('Actions for favorite Favorite tea').click();
    await first.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(first.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toBeVisible();
    first.once('dialog', dialog => dialog.accept());
    await first.getByLabel('Actions for favorite Favorite tea').click();
    await first.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(first.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toHaveCount(0);
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(second.locator('.favorite-select').filter({ hasText: 'Favorite tea' })).toHaveCount(0);
    expect(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await a.close(); await b.close(); }
});

test('a failed favorite save keeps the unfinished details', async ({ page, context }) => {
  await transport().attach(context);
  await context.route('**/rest/v1/shopping_favorites*', route =>
    route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { message: 'Synthetic failure' } }) : route.fallback());
  await login(page, 'Masha');
  await page.getByRole('button', { name: '+ Add favorite' }).click();
  await page.getByLabel('Product name').fill('Unfinished favorite');
  await page.getByLabel('Notes (optional)', { exact: true }).fill('Keep this note');
  await page.getByRole('button', { name: 'Save favorite' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page.getByLabel('Product name')).toHaveValue('Unfinished favorite');
  await expect(page.getByLabel('Notes (optional)', { exact: true })).toHaveValue('Keep this note');
});
