import { expect, test } from '@playwright/test';
import { BarcodeFormat, MultiFormatWriter } from '@zxing/library';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block', viewport: { width: 320, height: 700 } });
async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: '+ Quick Add Item' }).click();
  await page.getByRole('button', { name: '+ Add favorite' }).click();
}
test('favorite editor saves a name and structured optional details', async ({ page, context }) => {
  await transport().attach(context); await openEditor(page);
  const form = page.locator('.favorite-editor');
  await expect(form.getByRole('button', { name: 'Save favorite' })).toBeDisabled();
  await expect(form.getByLabel('Notes (optional)')).toBeHidden();
  await expect(form.getByLabel('Product photo (optional)')).toHaveCSS('opacity', '0');
  if (process.env.TOGETHER_SCREENSHOTS) { await page.locator('.quick-content').evaluate(el => { el.scrollTop = 0; }); await page.waitForTimeout(200); await page.locator('.quick-add').screenshot({ path: `${process.env.TOGETHER_SCREENSHOTS}/favorite-editor-top.png`, animations: 'disabled' }); }
  await form.getByLabel('Product name').fill('Simple tea');
  await form.getByRole('button', { name: 'Save favorite' }).click();
  await expect(page.locator('.favorite-card').filter({ hasText: 'Simple tea' })).toBeVisible();
  await page.getByRole('button', { name: '+ Add favorite' }).click();
  await form.getByLabel('Product name').fill('Complete item');
  await form.getByLabel('Brand (optional)').fill('Sample brand');
  await form.getByLabel('Flavor (optional)').fill('Vanilla');
  await form.getByLabel('Size (optional)').fill('500 g');
  await form.getByLabel('Quantity (optional)').fill('2');
  await form.getByText('More details').click();
  await form.getByLabel('Notes (optional)').fill('Keep cool');
  await form.getByLabel('Shopping category').selectOption('Kids');
  const columns = await form.locator('.favorite-editor-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.TOGETHER_SCREENSHOTS) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); await page.locator('.quick-add').screenshot({ path: `${process.env.TOGETHER_SCREENSHOTS}/favorite-editor.png`, animations: 'disabled' }); }
  await form.getByRole('button', { name: 'Save favorite' }).click();
  await page.getByRole('group', { name: 'Quick Add categories' }).getByRole('button', { name: 'Kids' }).click();
  const favorite = page.locator('.favorite-card').filter({ hasText: 'Complete item' });
  await expect(favorite).toContainText('Sample brand'); await expect(favorite).toContainText('Vanilla'); await expect(favorite).toContainText('500 g');
  await favorite.getByLabel('Actions for favorite Complete item').click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(form.getByLabel('Notes (optional)')).toBeVisible();
  await expect(form.getByLabel('Notes (optional)')).toHaveValue('Keep cool');
  await expect(form.getByLabel('Quantity (optional)')).toHaveValue('2');
});
test('photo picker saves a recognized product image with the favorite', async ({ page, context }) => {
  await transport().attach(context);
  const photoUrl = 'https://images.openfoodfacts.org/images/products/test/front.jpg';
  await page.route('https://world.openfoodfacts.org/**', route => route.fulfill({ json: { status: 1, product: { product_name: 'Photo cereal', brands: 'Example', quantity: '1 kg', image_front_url: photoUrl } } }));
  await page.route('https://images.openfoodfacts.org/**', route => route.fulfill({ path: 'public/icons/icon-192.png', contentType: 'image/png' }));
  await openEditor(page);
  const matrix = new MultiFormatWriter().encode('5901234123457', BarcodeFormat.QR_CODE, 400, 400, new Map());
  const bits = Array.from({ length: matrix.getWidth() * matrix.getHeight() }, (_, i) => matrix.get(i % matrix.getWidth(), Math.floor(i / matrix.getWidth())) ? 1 : 0);
  const data = await page.evaluate(({ bits, width, height }) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height); ctx.fillStyle = 'black'; for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (bits[y * width + x]) ctx.fillRect(x, y, 1, 1); return canvas.toDataURL('image/png').split(',')[1]; }, { bits, width: matrix.getWidth(), height: matrix.getHeight() });
  await page.getByLabel('Product photo (optional)').setInputFiles({ name: 'product.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  await expect(page.getByAltText('Product photo preview')).toHaveAttribute('src', photoUrl, { timeout: 20000 });
  await expect(page.getByLabel('Product name')).toHaveValue('Photo cereal');
  await page.getByRole('button', { name: 'Save favorite' }).click();
  await expect(page.locator('.favorite-card').filter({ hasText: 'Photo cereal' }).locator('img')).toHaveAttribute('src', photoUrl);
  await page.reload(); await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: '+ Quick Add Item' }).click();
  await expect(page.locator('.favorite-card').filter({ hasText: 'Photo cereal' }).locator('img')).toHaveAttribute('src', photoUrl);
});
