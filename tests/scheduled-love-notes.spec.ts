import { expect, test } from '@playwright/test';
import { scheduledInstant } from '../src/notes/schedule';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('local scheduling handles daylight saving changes', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'Europe/Berlin';
  try {
    expect(scheduledInstant('2027-03-28T02:30')).toBeNull();
    expect(scheduledInstant('2027-03-28T03:30')?.toISOString()).toBe('2027-03-28T01:30:00.000Z');
    expect(scheduledInstant('2027-10-31T02:30')?.toISOString()).toBe('2027-10-31T00:30:00.000Z');
  } finally { process.env.TZ = previous; }
});

test('schedule, edit, cancel and release a surprise on mobile', async ({ browser }) => {
  const server = transport();
  const start = Math.floor(Date.now() / 60000) * 60000;
  server.setServerTime(start);
  const contexts = await Promise.all([390, 360].map(width => browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block', timezoneId: 'Europe/Berlin' })));
  const pages = [];
  for (const [index, context] of contexts.entries()) {
    await server.attach(context); const page = await context.newPage(); pages.push(page);
    await page.clock.setFixedTime(new Date(start)); await page.goto('./');
    await page.getByRole('button', { name: index ? 'Damian' : 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Open love notes/ }).click();
  }
  const [sender, recipient] = pages;
  const localTime = async (offset: number) => sender.evaluate(minutes => { const d = new Date(Date.now() + minutes * 60000), p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }, offset);
  await sender.getByRole('button', { name: '+ Write a note' }).click();
  await sender.getByLabel('Schedule a surprise 💌').check(); await sender.getByLabel('Partner note').fill('Secret surprise');
  await sender.getByLabel('Delivery date and time').fill(await localTime(-1)); await expect(sender.getByRole('button', { name: 'Schedule', exact: true })).toBeDisabled();
  await sender.getByLabel('Delivery date and time').fill(await localTime(10)); await sender.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(sender.getByRole('status')).toHaveText('Surprise scheduled.');
  const scheduled = sender.locator('.scheduled-notes'); const header = scheduled.locator('summary');
  await expect(header).toHaveText('Scheduled (1)'); await expect(scheduled).not.toHaveAttribute('open', '');
  await expect(sender.getByText('Secret surprise')).toBeHidden();
  await header.click(); await expect(sender.getByText('Secret surprise')).toBeVisible();
  await header.click(); await expect(sender.getByText('Secret surprise')).toBeHidden();
  await sender.getByRole('button', { name: '+ Write a note' }).click(); await sender.getByLabel('Schedule a surprise 💌').check();
  await sender.getByLabel('Partner note').fill('Second surprise'); await sender.getByLabel('Delivery date and time').fill(await localTime(15)); await sender.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(header).toHaveText('Scheduled (2)');
  await sender.getByRole('button', { name: 'Favorites', exact: true }).click(); await expect(sender.locator('.scheduled-notes')).toHaveCount(0);
  await sender.getByRole('button', { name: 'All', exact: true }).click(); await expect(sender.locator('.scheduled-notes')).not.toHaveAttribute('open', '');
  await sender.locator('.scheduled-notes summary').click();
  sender.once('dialog', dialog => dialog.accept()); await sender.locator('.scheduled-surprise').filter({ hasText: 'Second surprise' }).getByRole('button', { name: 'Cancel surprise' }).click();
  await expect(sender.locator('.scheduled-notes summary')).toHaveText('Scheduled (1)');
  const card = sender.locator('.scheduled-surprise'); await expect(card).toContainText('Scheduled');
  await expect(card).toHaveCSS('background-color', 'rgb(255, 246, 217)');
  const actions = card.locator('.surprise-actions button'); const first = await actions.nth(0).boundingBox(), second = await actions.nth(1).boundingBox();
  expect(first && second && first.height >= 44 && second.height >= 44 && first.y === second.y).toBeTruthy();
  server.failNextNoteStatus(); await sender.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(card).toContainText('Status unavailable');
  await sender.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(card.locator('.surprise-status')).toHaveText('Scheduled');
  await recipient.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(recipient.locator('.partner-note-list article')).toHaveCount(0);
  await sender.getByRole('button', { name: 'Edit', exact: true }).click(); await sender.getByLabel('Partner note').fill('Updated surprise');
  await sender.getByLabel('Delivery date and time').fill(await localTime(12)); await sender.getByRole('button', { name: 'Save note' }).click();
  await expect(sender.getByText('Updated surprise')).toBeVisible();
  sender.once('dialog', dialog => dialog.dismiss()); await sender.getByRole('button', { name: 'Cancel surprise' }).click(); await expect(sender.getByText('Updated surprise')).toBeVisible();
  sender.once('dialog', dialog => dialog.accept()); await sender.getByRole('button', { name: 'Cancel surprise' }).click(); await expect(sender.getByText('Updated surprise')).toHaveCount(0);
  await sender.getByRole('button', { name: '+ Write a note' }).click(); await sender.getByLabel('Schedule a surprise 💌').check();
  await sender.getByLabel('Partner note').fill('Delivered surprise'); await sender.getByLabel('Delivery date and time').fill(await localTime(10)); await sender.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(sender.locator('.scheduled-notes summary')).toHaveText('Scheduled (1)'); await expect(sender.getByText('Delivered surprise')).toBeHidden();
  await sender.locator('.scheduled-notes summary').click(); await expect(sender.getByText('Delivered surprise')).toBeVisible();
  server.setServerTime(start + 11 * 60000); await recipient.clock.setFixedTime(new Date(start + 11 * 60000)); await sender.clock.setFixedTime(new Date(start + 11 * 60000));
  await sender.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(sender.locator('.surprise-status')).toHaveText('Release unconfirmed');
  await recipient.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(recipient.locator('.note-envelope')).toContainText('Masha');
  await expect(recipient.getByText('Delivered surprise')).toHaveCount(0); await recipient.getByRole('button', { name: /Open note/ }).click(); await expect(recipient.getByText('Delivered surprise')).toBeVisible();
  await recipient.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(recipient.getByText('Delivered surprise')).toHaveCount(1);
  await sender.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(sender.locator('.surprise-status')).toHaveText('Delivered · opened in Together');
  for (const page of pages) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await Promise.all(contexts.map(context => context.close()));
});
