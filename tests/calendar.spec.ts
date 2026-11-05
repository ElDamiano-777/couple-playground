import { expect, test } from '@playwright/test';
import { mainNavigation, openShopping } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('calendar shows month and agenda views with private-by-default calendar controls on iPhone', async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openShopping(page);
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Calendar.' })).toBeVisible();
  await expect(page.getByText('Synthetic dinner', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await expect(page.getByText('Synthetic dinner', { exact: true })).toBeVisible();
  await expect(page.getByText('Only you see them by default. Share only calendars your partner may see.')).toBeVisible();
  const share = page.getByLabel('Share');
  await expect(share).not.toBeChecked();
  await share.click();
  await expect(share).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
