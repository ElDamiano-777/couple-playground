import { devices, expect, test, type BrowserContext } from '@playwright/test';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ viewport: devices['iPhone 13'].viewport, userAgent: devices['iPhone 13'].userAgent, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
test('partners create and edit a memory with five persistent photos', async ({ browser }) => {
  const server = transport(), rows: Record<string, any>[] = [];
  async function setup(context: BrowserContext) {
    await server.attach(context);
    await context.route('**/rest/v1/shared_memories*', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method(), data = request.postDataJSON();
      if (method === 'GET') return route.fulfill({ json: rows });
      if (method === 'POST') { const row = { ...data, id: 'memory-1', revision: 1 }; rows.push(row); return route.fulfill({ json: row }); }
      const row = rows.find(item => item.id === url.searchParams.get('id')?.replace('eq.', ''));
      if (!row || String(row.revision) !== url.searchParams.get('revision')?.replace('eq.', '')) return route.fulfill({ json: null });
      if (method === 'PATCH') { Object.assign(row, data, { revision: row.revision + 1 }); return route.fulfill({ json: row }); }
      if (method === 'DELETE') { rows.splice(rows.indexOf(row), 1); return route.fulfill({ json: { id: row.id } }); }
      return route.fallback();
    });
  }
  async function signIn(context: BrowserContext, name: 'Masha' | 'Damian') {
    const page = await context.newPage(); await page.goto('./'); await page.getByRole('button', { name, exact: true }).click(); await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Shared Memories/ }).click(); return page;
  }
  const first = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); await setup(first);
  const page = await signIn(first, 'Masha'); await expect(page.getByText('Your story starts here.')).toBeVisible();
  await page.getByRole('button', { name: '+ Add memory' }).click(); const form = page.getByRole('dialog', { name: 'New memory' });
  await form.getByLabel('Title', { exact: true }).fill('A little trip'); await form.getByLabel('Event date').fill('2025-03-04'); await form.getByLabel('Our story (optional)').fill('A lovely day'); await form.getByLabel('Location (optional)').fill('Somewhere'); await form.getByLabel('Category (optional)').selectOption('Travel');
  await form.getByLabel('Photos (0/5)').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('not a photo') });
  await expect(form.getByRole('alert')).toContainText('Choose a JPEG'); await expect(form.getByLabel('Title', { exact: true })).toHaveValue('A little trip');
  await page.evaluate(() => { Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 420 }); Object.defineProperty(window.visualViewport!, 'offsetTop', { configurable: true, value: 32 }); window.visualViewport!.dispatchEvent(new Event('resize')); });
  await form.getByLabel('Our story (optional)').focus();
  await expect.poll(async () => (await form.getByLabel('Our story (optional)').boundingBox())!.y + (await form.getByLabel('Our story (optional)').boundingBox())!.height).toBeLessThanOrEqual(452);
  await form.getByRole('button', { name: 'Save memory' }).focus();
  await expect.poll(async () => (await form.getByRole('button', { name: 'Save memory' }).boundingBox())!.y + (await form.getByRole('button', { name: 'Save memory' }).boundingBox())!.height).toBeLessThanOrEqual(452);
  await page.evaluate(() => { delete (window.visualViewport as unknown as { height?: number }).height; delete (window.visualViewport as unknown as { offsetTop?: number }).offsetTop; window.visualViewport!.dispatchEvent(new Event('resize')); });
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP8z4AdMOEQH6QSAM1BAQ/oQeJvAAAAAElFTkSuQmCC', 'base64');
  await form.getByLabel('Photos (0/5)').setInputFiles(Array.from({ length: 5 }, (_, i) => ({ name: `photo-${i}.png`, mimeType: 'image/png', buffer: image })));
  await expect(form.getByText('Preparing photos…')).toHaveCount(0); await expect(form.locator('.memory-photo-edit')).toHaveCount(5);
  await form.getByRole('button', { name: 'Set as cover' }).nth(1).click(); await form.getByRole('button', { name: 'Move photo 3 earlier' }).click();
  await form.getByRole('button', { name: 'Save memory' }).click(); await expect(page.locator('.memory-card')).toContainText('A little trip'); expect(rows[0].photos).toHaveLength(5); expect(rows[0].cover_index).toBe(1);
  await expect(page.locator('.memory-card .memory-date')).toHaveCSS('color', 'rgb(201, 167, 240)');
  await expect(page.locator('.memory-card .memory-location')).toHaveCSS('color', 'rgb(117, 217, 189)');
  await expect(page.locator('.memory-card .memory-category')).toHaveCSS('color', 'rgb(243, 181, 155)');
  await page.locator('.memory-card').click(); const detail = page.getByRole('dialog', { name: 'Memory details' }); await expect(detail.locator('.memory-gallery img')).toHaveCount(5); await expect(detail.locator('.memory-gallery img').first()).toHaveCSS('object-fit', 'contain');
  await expect(detail.locator('.memory-date')).toHaveCSS('color', 'rgb(201, 167, 240)'); await expect(detail.locator('.memory-location')).toHaveCSS('color', 'rgb(117, 217, 189)'); await expect(detail.locator('.memory-category')).toHaveCSS('color', 'rgb(243, 181, 155)');
  await page.evaluate(() => { Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 650 }); Object.defineProperty(window.visualViewport!, 'offsetTop', { configurable: true, value: 44 }); window.visualViewport!.dispatchEvent(new Event('resize')); });
  await expect.poll(async () => (await page.locator('.memory-overlay').boundingBox())!.y).toBe(44);
  const close = detail.getByRole('button', { name: 'Close' });
  const closeTop = (await close.boundingBox())!.y;
  expect(closeTop).toBeGreaterThanOrEqual(44);
  expect(closeTop + (await close.boundingBox())!.height).toBeLessThanOrEqual(694);
  const backgroundTop = await page.locator('.page-scroll').evaluate(el => el.scrollTop);
  await page.mouse.move(2, 200); await page.mouse.wheel(0, 500);
  expect(await page.locator('.page-scroll').evaluate(el => el.scrollTop)).toBe(backgroundTop);
  await detail.evaluate(el => el.scrollTo(0, el.scrollHeight));
  expect(await detail.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(Math.abs((await close.boundingBox())!.y - closeTop)).toBeLessThan(1);
  await expect(detail.getByRole('button', { name: 'Edit memory' })).toBeInViewport();
  await detail.evaluate(el => el.scrollTo(0, 0));
  expect(Math.abs((await close.boundingBox())!.y - closeTop)).toBeLessThan(1);
  for (let i = 0; i < 3; i++) { await close.click(); await expect(detail).toHaveCount(0); await page.locator('.memory-card').click(); await expect(close).toBeVisible(); }
  await page.evaluate(() => { delete (window.visualViewport as unknown as { height?: number }).height; delete (window.visualViewport as unknown as { offsetTop?: number }).offsetTop; window.visualViewport!.dispatchEvent(new Event('resize')); });
  await detail.getByRole('button', { name: 'Edit memory' }).click(); const edit = page.getByRole('dialog', { name: 'Edit memory' }); await edit.getByLabel('Title', { exact: true }).fill('A little trip together'); await edit.getByLabel('Our story (optional)').fill('A lovely day together'); await edit.getByRole('button', { name: 'Save memory' }).click(); expect(rows[0].photos).toHaveLength(5);
  await page.reload(); await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Shared Memories/ }).click(); await expect(page.locator('.memory-card')).toContainText('A little trip together');
  const second = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); await setup(second); const partner = await signIn(second, 'Damian'); await partner.locator('.memory-card').click(); await expect(partner.getByText('A lovely day together')).toBeVisible(); await partner.getByRole('button', { name: 'Edit memory' }).click(); await partner.getByLabel('Our story (optional)').fill('Both of our stories'); await partner.getByRole('button', { name: 'Save memory' }).click(); expect(rows[0].photos).toHaveLength(5); expect(rows[0].story).toBe('Both of our stories');
  await partner.locator('.memory-card').click();
  partner.once('dialog', dialog => void dialog.dismiss());
  await partner.getByRole('button', { name: 'Delete memory' }).click();
  expect(rows).toHaveLength(1);
  partner.once('dialog', dialog => void dialog.accept());
  await partner.getByRole('button', { name: 'Delete memory' }).click();
  await expect(partner.getByText('Your story starts here.')).toBeVisible(); expect(rows).toHaveLength(0);
  await first.close(); await second.close();
});
