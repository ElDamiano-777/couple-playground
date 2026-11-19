import { expect, test } from '@playwright/test';
import { pocMasha, pocDamian, pocPassword, transport } from './helpers/sharedTransport';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const pictures = [
  ['portrait', 'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAeCAIAAACXCWggAAAAHElEQVR4nGP8EiDBQAgwEVQxqmhU0aiiUUVQAABp0AGYR7ThGgAAAABJRU5ErkJggg=='],
  ['landscape', 'iVBORw0KGgoAAAANSUhEUgAAAB4AAAAMCAIAAAD6TJplAAAAHElEQVR4nGP8EiDBQBvARCNzR40eNXrU6EFkNAACYgF0TLy4CQAAAABJRU5ErkJggg=='],
  ['square', 'iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAAHUlEQVR4nGP8EiDBQC5gIlvnqOZRzaOaRzVTRTMA3QIBhC/Ey60AAAAASUVORK5CYII='],
] as const;

test('full photos, product lookup, manual edits and exact store link', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const wishes: Record<string, unknown>[] = [];
  await context.route('**/rest/v1/household_member_profiles?*', route => route.fulfill({ json: [{ user_id: pocMasha, display_name: 'Masha' }, { user_id: pocDamian, display_name: 'Damian' }] }));
  await context.route('**/rest/v1/wish_gift_plans*', route => route.fulfill({ json: [] }));
  await context.route('**/rest/v1/folder_entries*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method(), data = req.postDataJSON();
    if (method === 'GET' && url.searchParams.get('kind') === 'eq.wish') return route.fulfill({ json: wishes });
    if (method === 'POST' && data?.kind === 'wish') { const wish = { ...data, id: `wish-${wishes.length + 1}`, created_by: pocMasha, wish_fulfilled_at: null }; wishes.unshift(wish); return route.fulfill({ json: wish }); }
    return route.fallback();
  });
  await context.route('https://store.example/**', async route => {
    if (route.request().url().endsWith('.png')) return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from(pictures[0][1], 'base64') });
    return route.fulfill({ status: 200, contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: `<script type="application/ld+json">{"@type":"Product","name":"Imported camera","image":"/camera.png","offers":{"price":"29.95","priceCurrency":"EUR"}}</script>` });
  });
  await context.route('https://blocked.example/**', route => route.abort('failed'));
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click(); await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Wishlist/ }).click(); await page.getByRole('button', { name: '+ Add wish' }).click();
  const url = 'https://store.example/products/camera?model=42';
  await page.getByLabel('Product link (optional)').fill(url);
  await expect(page.getByLabel('Wish name')).toHaveValue('Imported camera');
  await expect(page.getByLabel('Estimated price in EUR (optional)')).toHaveValue('29.95');
  await expect(page.getByAltText('Selected wish')).toBeVisible();
  const assertContained = async (selector: string) => {
    const image = page.locator(selector), info = await image.evaluate(el => { const img = el as HTMLImageElement, box = img.getBoundingClientRect(), frame = img.parentElement!.getBoundingClientRect(); return { fit: getComputedStyle(img).objectFit, iw: img.naturalWidth, ih: img.naturalHeight, width: box.width, height: box.height, frameWidth: frame.width, frameHeight: frame.height }; });
    expect(info.fit).toBe('contain'); expect(info.iw).toBeGreaterThan(0); expect(info.ih).toBeGreaterThan(0); expect(info.width).toBeLessThanOrEqual(info.frameWidth); expect(info.height).toBeLessThanOrEqual(info.frameHeight);
  };
  for (const [name, base64] of pictures) {
    await page.getByLabel('Photo (optional)').setInputFiles({ name: `${name}.png`, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
    await expect(page.getByRole('button', { name: 'Save wish' })).toBeEnabled();
    await assertContained('.preview-photo img');
    const ratio = await page.locator('.preview-photo img').evaluate(el => (el as HTMLImageElement).naturalWidth / (el as HTMLImageElement).naturalHeight);
    if (name === 'portrait') expect(ratio).toBeLessThan(1);
    else if (name === 'landscape') expect(ratio).toBeGreaterThan(1);
    else expect(ratio).toBe(1);
  }
  const chosenPhoto = await page.locator('.preview-photo img').getAttribute('src');
  await page.getByLabel('Wish name').fill('My camera'); await page.getByLabel('Estimated price in EUR (optional)').fill('45.00');
  await page.getByLabel('Product link (optional)').fill('https://store.example/products/camera?model=43');
  await expect(page.getByText('Available product details added. You can edit them.')).toBeVisible();
  await expect(page.getByLabel('Wish name')).toHaveValue('My camera'); await expect(page.getByLabel('Estimated price in EUR (optional)')).toHaveValue('45.00');
  await expect(page.locator('.preview-photo img')).toHaveAttribute('src', chosenPhoto!);
  await page.getByRole('button', { name: 'Save wish' }).click(); await assertContained('.wish-card .wish-photo img');
  await page.getByRole('button', { name: /My camera/ }).click(); await assertContained('.wish-detail .wish-photo img');
  await expect(page.getByRole('link', { name: 'View in store' })).toHaveAttribute('href', 'https://store.example/products/camera?model=43');
  expect(wishes[0].wish_url).toBe('https://store.example/products/camera?model=43');
  await page.getByRole('dialog', { name: 'Wish details' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: '+ Add wish' }).click();
  await page.getByLabel('Product link (optional)').fill('https://blocked.example/item/123');
  await expect(page.getByText('Could not read product details. You can enter them manually.')).toBeVisible();
  await page.getByLabel('Wish name').fill('Manual item');
  await page.getByRole('button', { name: 'Save wish' }).click();
  expect(wishes[0].wish_url).toBe('https://blocked.example/item/123');
});
