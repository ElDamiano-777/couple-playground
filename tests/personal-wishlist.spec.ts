import { expect, test } from '@playwright/test';
import { pocDamian, pocMasha, pocPassword, transport } from './helpers/sharedTransport';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
test('personal wishes and private plans remain available after refresh', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const wishes: Record<string, unknown>[] = [{ id: 'partner-wish', title: 'A partner wish', notes: '', created_by: pocDamian, wish_photo: null, wish_url: null, wish_price_cents: null, wish_priority: 'idea', wish_fulfilled_at: null }, { id: 'want-wish', title: 'Really wanted item', notes: '', created_by: pocMasha, wish_photo: null, wish_url: null, wish_price_cents: null, wish_priority: 'want', wish_fulfilled_at: null }];
  const plans = new Set<string>();
  await context.route('**/rest/v1/household_member_profiles?*', route => route.fulfill({ json: [{ user_id: pocMasha, display_name: 'Masha' }, { user_id: pocDamian, display_name: 'Damian' }] }));
  await context.route('**/rest/v1/wish_gift_plans*', async route => {
    const req = route.request(), key = req.method() === 'POST' ? req.postDataJSON().wish_id : new URL(req.url()).searchParams.get('wish_id')?.replace('eq.', '');
    if (req.method() === 'GET') return route.fulfill({ json: [...plans].map(wish_id => ({ wish_id })) });
    if (req.method() === 'POST') plans.add(key); else if (key) plans.delete(key);
    return route.fulfill({ status: 204 });
  });
  await context.route('**/rest/v1/folder_entries*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method(), data = req.postDataJSON();
    if (method === 'GET' && url.searchParams.get('kind') === 'eq.wish') return route.fulfill({ json: wishes });
    if (method === 'POST' && data?.kind === 'wish') { const wish = { ...data, id: 'new-wish', created_by: pocMasha, wish_fulfilled_at: null }; wishes.unshift(wish); return route.fulfill({ json: wish }); }
    if (method === 'PATCH' && url.searchParams.get('id') === 'eq.new-wish') { Object.assign(wishes.find(w => w.id === 'new-wish')!, data); return route.fulfill({ json: wishes.find(w => w.id === 'new-wish') }); }
    return route.fallback();
  });
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click(); await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Wishlist/ }).click();
  await expect(page.locator('.wish-card').filter({ hasText: 'Really wanted item' }).locator('.wish-priority')).toHaveCSS('color', 'rgb(255, 141, 159)');
  await page.getByRole('button', { name: '+ Add wish' }).click();
  await page.getByLabel('Wish name').fill('New camera'); await page.getByLabel('Product link (optional)').fill('https://example.com/camera'); await page.getByLabel('Estimated price (optional)').fill('25.50'); await page.getByLabel('Notes (optional)').fill('Black'); await page.getByLabel('Priority').selectOption('dream');
  await expect(page.locator('.wish-editor .wish-priority')).toHaveCSS('color', 'rgb(233, 184, 255)');
  await page.evaluate(() => { Object.defineProperty(window.visualViewport!, 'height', { value: 420, configurable: true }); Object.defineProperty(window.visualViewport!, 'offsetTop', { value: 32, configurable: true }); window.visualViewport!.dispatchEvent(new Event('resize')); });
  await page.getByLabel('Notes (optional)').focus();
  await expect.poll(async () => (await page.getByLabel('Notes (optional)').boundingBox())!.y + (await page.getByLabel('Notes (optional)').boundingBox())!.height).toBeLessThanOrEqual(452);
  await page.evaluate(() => { delete (window.visualViewport as unknown as { height?: number }).height; delete (window.visualViewport as unknown as { offsetTop?: number }).offsetTop; window.visualViewport!.dispatchEvent(new Event('resize')); });
  await page.getByLabel('Photo (optional)').setInputFiles({ name: 'image.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP8z4AdMOEQH6QSAM1BAQ/oQeJvAAAAAElFTkSuQmCC', 'base64') });
  await expect(page.getByAltText('Selected wish')).toBeVisible(); await page.getByRole('button', { name: 'Save wish' }).click();
  await expect(page.locator('.wish-card').filter({ hasText: 'New camera' })).toContainText('€25.50');
  await expect(page.locator('.wish-card').filter({ hasText: 'New camera' }).locator('.wish-priority')).toHaveCSS('color', 'rgb(233, 184, 255)');
  expect(String(wishes[0].wish_photo)).toMatch(/^data:image\/jpeg;base64,/); expect(wishes[0].notes).toBe('Black');
  await page.getByRole('button', { name: /Partner’s Wishlist/ }).click(); await page.getByRole('button', { name: /A partner wish/ }).click();
  await expect(page.locator('.wish-detail .wish-priority')).toHaveCSS('color', 'rgb(232, 189, 118)');
  const detail = page.getByRole('dialog', { name: 'Wish details' }); await expect(detail.getByRole('button', { name: 'Edit' })).toHaveCount(0); await detail.getByRole('button', { name: '🎁 Planning as a gift' }).click(); await detail.getByRole('button', { name: 'Close' }).click(); await expect(page.getByText('🎁 Planning as a gift')).toBeVisible();
  await page.reload(); await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Wishlist/ }).click(); await page.getByRole('button', { name: /Partner’s Wishlist/ }).click(); await expect(page.getByText('🎁 Planning as a gift')).toBeVisible();
  await page.getByRole('button', { name: /A partner wish/ }).click(); await page.getByRole('button', { name: '🎁 Remove private gift plan' }).click(); await page.getByRole('dialog', { name: 'Wish details' }).getByRole('button', { name: 'Close' }).click(); await expect(page.getByText('🎁 Planning as a gift')).toHaveCount(0);
  await page.getByRole('button', { name: /My Wishlist/ }).click(); await page.getByRole('button', { name: /New camera/ }).click(); await page.getByRole('button', { name: 'Mark fulfilled' }).click(); await page.getByRole('button', { name: 'Fulfilled wishes' }).click(); await expect(page.locator('.wish-card').filter({ hasText: 'New camera' })).toBeVisible();
});
