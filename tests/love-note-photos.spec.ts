import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('personal and scheduled photos stay sealed and save atomically on mobile', async ({ browser }) => {
  const server = transport(); const start = Math.floor(Date.now() / 60000) * 60000; server.setServerTime(start);
  const contexts = await Promise.all([390, 360].map(width => browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, serviceWorkers: 'block', timezoneId: 'Europe/Berlin' })));
  const pages = [];
  for (const [index, context] of contexts.entries()) {
    await server.attach(context); const page = await context.newPage(); pages.push(page);
    await page.clock.setFixedTime(new Date(start)); await page.goto('./');
    await page.getByRole('button', { name: index ? 'Damian' : 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Open love notes/ }).click();
  }
  const [sender, recipient] = pages;
  const png = await sender.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 5; canvas.height = 3; canvas.getContext('2d')!.fillRect(0, 0, 5, 3); return canvas.toDataURL('image/png').split(',')[1]; });
  const picture = (name: string) => ({ name, mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await sender.getByRole('button', { name: '+ Write a note' }).click();
  await sender.getByLabel('Add photos').setInputFiles([picture('one.png'), picture('two.png')]);
  await expect(sender.getByAltText('Photo 2 preview')).toBeVisible();
  await sender.getByLabel('Add photos').setInputFiles([picture('a.png'), picture('b.png'), picture('c.png'), picture('d.png')]);
  await expect(sender.getByRole('alert')).toContainText('up to 5 photos');
  await sender.getByRole('button', { name: 'Remove photo 2' }).click();
  await expect(sender.getByText('1/5 photos')).toBeVisible();
  server.delayNoteSave(); await sender.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sender.getByText('Uploading photos and saving note…')).toBeVisible(); server.releaseNoteSave();
  await expect(sender.getByRole('status')).toHaveText('Note sent.');
  await expect(sender.getByRole('button', { name: 'Enlarge photo 1' })).toBeVisible();
  const photoOnly = sender.locator('.note-open').filter({ has: sender.getByRole('button', { name: 'Enlarge photo 1' }) });
  await expect(photoOnly.locator('.note-direction')).toHaveText('Sent'); await expect(photoOnly.locator('.note-message > p')).toHaveCount(0);
  const photoBox = await photoOnly.getByRole('button', { name: 'Enlarge photo 1' }).boundingBox(); expect(photoBox!.width).toBeGreaterThan(160);
  await expect(photoOnly.locator('.note-photo-gallery img')).toHaveCSS('object-fit', 'contain');
  await recipient.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(recipient.locator('.note-envelope')).toHaveCount(1);
  await expect(recipient.locator('.note-envelope .note-direction')).toHaveText('Received');
  await expect(recipient.getByRole('button', { name: /Enlarge photo/ })).toHaveCount(0);
  await recipient.getByRole('button', { name: /Open note/ }).click(); await recipient.getByRole('button', { name: 'Enlarge photo 1' }).click();
  await expect(recipient.getByRole('dialog', { name: 'Note photo' }).getByAltText('Enlarged note photo')).toBeVisible(); await recipient.getByRole('button', { name: 'Close', exact: true }).click();
  await sender.getByRole('button', { name: '+ Write a note' }).click(); await sender.getByLabel('Take photo').setInputFiles(picture('camera.png'));
  await expect(sender.getByAltText('Photo 1 preview')).toBeVisible(); server.failNextNoteSave(); await sender.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sender.getByRole('alert')).toContainText('Could not save'); await expect(sender.getByAltText('Photo 1 preview')).toBeVisible();
  await sender.getByLabel('Schedule a surprise 💌').check();
  const later = await sender.evaluate(() => { const d = new Date(Date.now() + 600000), p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; });
  await sender.getByLabel('Delivery date and time').fill(later); await sender.getByLabel('Partner note').fill('A future photo');
  await sender.getByRole('button', { name: 'Schedule', exact: true }).click(); await expect(sender.locator('.scheduled-surprise')).toContainText('A future photo');
  await sender.locator('.scheduled-surprise').getByRole('button', { name: 'Edit' }).click(); await expect(sender.getByAltText('Photo 1 preview')).toBeVisible();
  await sender.getByRole('button', { name: 'Remove photo 1' }).click();
  await sender.getByLabel('Add photos').setInputFiles([picture('another.png'), picture('extra.png')]); await expect(sender.getByAltText('Photo 2 preview')).toBeVisible();
  await sender.getByRole('button', { name: 'Save note' }).click(); await expect(sender.locator('.scheduled-surprise').getByRole('button', { name: /Enlarge photo/ })).toHaveCount(2);
  await recipient.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(recipient.getByText('A future photo')).toHaveCount(0);
  server.setServerTime(start + 11 * 60000); await recipient.clock.setFixedTime(new Date(start + 11 * 60000));
  await recipient.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(recipient.locator('.note-envelope')).toHaveCount(1);
  await expect(recipient.getByText('A future photo')).toHaveCount(0); await recipient.getByRole('button', { name: /Open note/ }).click();
  await expect(recipient.getByText('A future photo')).toBeVisible(); await expect(recipient.getByRole('button', { name: 'Enlarge photo 2' })).toBeVisible();
  await recipient.getByRole('button', { name: 'Enlarge photo 2' }).click();
  const viewer = recipient.getByRole('dialog', { name: 'Note photo' }); await expect(viewer).toContainText('2 / 2');
  await viewer.getByRole('button', { name: 'Previous photo' }).click(); await expect(viewer).toContainText('1 / 2');
  await viewer.evaluate(element => {
    const start = new Touch({ identifier: 1, target: element, clientX: 300, clientY: 200 });
    const end = new Touch({ identifier: 1, target: element, clientX: 100, clientY: 205 });
    element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [end] }));
  });
  await expect(viewer).toContainText('2 / 2'); await viewer.getByRole('button', { name: 'Close' }).click(); await expect(viewer).toHaveCount(0);
  for (const page of pages) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await Promise.all(contexts.map(context => context.close()));
});
