import { expect, test } from '@playwright/test';
import { relationshipDates } from '../src/couple/relationshipDates';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('calendar durations and anniversaries respect leap years and month ends', () => {
  expect(relationshipDates('2020-02-29', '2025-02-28')).toEqual({ years: 5, months: 0, days: 0, anniversary: '2025-02-28', daysUntil: 0 });
  expect(relationshipDates('2020-02-29', '2024-02-28')).toEqual({ years: 3, months: 11, days: 31, anniversary: '2024-02-29', daysUntil: 1 });
  expect(relationshipDates('2023-01-31', '2023-03-30')).toEqual({ years: 0, months: 1, days: 30, anniversary: '2024-01-31', daysUntil: 307 });
  expect(relationshipDates('2020-11-10', '2026-11-10')).toEqual({ years: 6, months: 0, days: 0, anniversary: '2026-11-10', daysUntil: 0 });
});

test('both partners can set and edit the shared date on narrow screens', async ({ browser }) => {
  const server = transport();
  const contexts = await Promise.all([{ width: 390, height: 844 }, { width: 360, height: 800 }].map(viewport => browser.newContext({ viewport, serviceWorkers: 'block' })));
  for (const context of contexts) await server.attach(context);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  for (const [index, page] of pages.entries()) {
    await page.clock.setFixedTime(new Date('2026-11-10T09:00:00Z'));
    await page.goto('./');
    await page.getByRole('button', { name: index ? 'Damian' : 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Set our date' })).toBeVisible();
  }
  const first = pages[0], second = pages[1];
  await first.getByRole('button', { name: 'Set our date' }).click();
  await expect(first.getByLabel('The day you got together')).toHaveAttribute('max', '2026-11-10');
  await first.getByLabel('The day you got together').fill('2026-11-11');
  await expect(first.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await first.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Set our date' })).toBeVisible();
  await first.getByRole('button', { name: 'Set our date' }).click();
  await first.getByLabel('The day you got together').fill('2020-02-29');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(first.locator('.our-time')).toContainText('6 years · 8 months · 13 days');
  await second.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(second.locator('.our-time')).toContainText('Together since 29 February 2020');
  await second.getByRole('button', { name: 'Edit date' }).click();
  await second.getByLabel('The day you got together').fill('2020-11-10');
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.locator('.our-time')).toContainText('Happy anniversary!');
  await first.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(first.locator('.our-time')).toContainText('6 years · 0 months · 0 days');
  for (const page of pages) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: /Pets/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Wishlist/ })).toBeVisible();
  }
  await Promise.all(contexts.map(context => context.close()));
});
