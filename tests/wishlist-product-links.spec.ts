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
  await context.route('https://r.jina.ai/https://blocked.example/**', route => route.fulfill({ status: 403, headers: { 'access-control-allow-origin': '*' }, body: 'Unavailable' }));
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click(); await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Wishlist/ }).click(); await page.getByRole('button', { name: '+ Add wish' }).click();
  const url = 'https://store.example/products/camera?model=42';
  await page.getByLabel('Product link (optional)').fill(url);
  await expect(page.getByLabel('Wish name')).toHaveValue('Imported camera');
  await expect(page.getByLabel('Estimated price (optional)')).toHaveValue('29.95');
  await expect(page.getByLabel('Currency')).toHaveValue('EUR');
  await expect(page.getByLabel('Store (optional)')).toHaveValue('store.example');
  await expect(page.getByAltText('Selected wish')).toBeVisible();
  const removePhoto = page.getByRole('button', { name: 'Remove photo' });
  const removeBox = await removePhoto.boundingBox();
  expect(removeBox!.width).toBeLessThanOrEqual(44);
  await removePhoto.click();
  await expect(page.getByAltText('Selected wish')).toHaveCount(0);
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
  await page.getByLabel('Wish name').fill('My camera'); await page.getByLabel('Estimated price (optional)').fill('45.00');
  await page.getByLabel('Currency').fill('USD'); await page.getByLabel('Store (optional)').fill('My shop');
  await page.getByLabel('Product link (optional)').fill('https://store.example/products/camera?model=43');
  await expect(page.getByText('Available product details added. You can edit them.')).toBeVisible();
  await expect(page.getByLabel('Wish name')).toHaveValue('My camera'); await expect(page.getByLabel('Estimated price (optional)')).toHaveValue('45.00');
  await expect(page.getByLabel('Currency')).toHaveValue('USD'); await expect(page.getByLabel('Store (optional)')).toHaveValue('My shop');
  await expect(page.locator('.preview-photo img')).toHaveAttribute('src', chosenPhoto!);
  await page.getByRole('button', { name: 'Save wish' }).click(); await assertContained('.wish-card .wish-photo img');
  await page.getByRole('button', { name: /My camera/ }).click(); await assertContained('.wish-detail .wish-photo img');
  await expect(page.getByRole('link', { name: 'View in store' })).toHaveAttribute('href', 'https://store.example/products/camera?model=43');
  expect(wishes[0].wish_url).toBe('https://store.example/products/camera?model=43');
  expect(wishes[0].wish_currency).toBe('USD'); expect(wishes[0].wish_store).toBe('My shop');
  await page.getByRole('dialog', { name: 'Wish details' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: '+ Add wish' }).click();
  await page.getByLabel('Product link (optional)').fill('https://blocked.example/item/123');
  await expect(page.getByText('Could not read product details. You can enter them manually.')).toBeVisible();
  await page.getByLabel('Wish name').fill('Manual item');
  await page.getByRole('button', { name: 'Save wish' }).click();
  expect(wishes[0].wish_url).toBe('https://blocked.example/item/123');
});

test('Amazon photo survives blocked metadata and ignores missing-image placeholders', async ({ page, context }) => {
  await transport().attach(context);
  await context.route('**/rest/v1/household_member_profiles?*', route => route.fulfill({ json: [{ user_id: pocMasha, display_name: 'Masha' }, { user_id: pocDamian, display_name: 'Damian' }] }));
  await context.route('**/rest/v1/wish_gift_plans*', route => route.fulfill({ json: [] }));
  await context.route('**/rest/v1/folder_entries*', route => route.request().method() === 'GET' && new URL(route.request().url()).searchParams.get('kind') === 'eq.wish' ? route.fulfill({ json: [] }) : route.fallback());
  await context.route('https://www.amazon.de/**', route => route.request().url().endsWith('?fixture=raw')
    ? route.fulfill({ contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: '<span id="productTitle">Kingdomino</span><img id="landingImage" data-old-hires="https://images-eu.ssl-images-amazon.com/images/P/B0742XTFT7.01.LZZZZZZZ.jpg">' })
    : route.abort('failed'));
  await context.route('https://r.jina.ai/https://www.amazon.de/**', route => route.fulfill({ contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: '<title>Tut uns Leid!</title><p>Product page unavailable.</p>' }));
  await context.route('https://images-eu.ssl-images-amazon.com/images/P/**', route => route.fulfill({ contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from(route.request().url().includes('B000000000') ? 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=' : pictures[0][1], 'base64') }));
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Us', exact: true }).click();
  await page.getByRole('button', { name: /Wishlist/ }).click();
  await page.getByRole('button', { name: '+ Add wish' }).click();
  const source = 'https://www.amazon.de/gp/product/B0742XTFT7/ref=ox_sc_act_title_1?smid=EXAMPLE&psc=1';
  await page.getByLabel('Product link (optional)').fill(source);
  await page.getByLabel('Wish name').fill('My Kingdomino');
  await expect(page.getByAltText('Selected wish')).toBeVisible();
  await expect(page.getByText('Available product details added. You can edit them.')).toBeVisible();
  await expect(page.getByLabel('Wish name')).toHaveValue('My Kingdomino');
  await expect(page.getByLabel('Product link (optional)')).toHaveValue(source);
  await expect(page.getByLabel('Estimated price (optional)')).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: '+ Add wish' }).click();
  await page.getByLabel('Product link (optional)').fill('https://www.amazon.de/dp/B000000000');
  await expect(page.getByText('Could not read product details. You can enter them manually.')).toBeVisible();
  await expect(page.getByAltText('Selected wish')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: '+ Add wish' }).click();
  await page.getByLabel('Product link (optional)').fill('https://www.amazon.de/dp/B0742XTFT7?fixture=raw');
  await expect(page.getByLabel('Wish name')).toHaveValue('Kingdomino');
  await expect(page.getByAltText('Selected wish')).toBeVisible();
});
