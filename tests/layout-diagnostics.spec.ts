import { expect, test } from '@playwright/test';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });

test('diagnostics are opt-in, private, and show modal and viewport state', async ({ page, context }) => {
  const server = transport(); server.seedShopping('Private item name', 'Private note'); await server.attach(context);
  await page.goto('./?layout-debug=1');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const nav = page.locator('.bottom-nav');
  await expect(nav).toBeVisible();
  await page.getByRole('button', { name: 'Layout diagnostics' }).click();
  const output = page.getByLabel('Layout measurements');
  await expect.poll(async () => JSON.parse(await output.inputValue()).navigation?.visible).toBe(true);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => { (window as unknown as { copied: string }).copied = text; return Promise.resolve(); } } }));
  await page.getByRole('button', { name: 'Copy diagnostics' }).click();
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).not.toContain('Private');
  expect(JSON.parse(copied).commit).toMatch(/^[a-f0-9]{40}$/);
  await page.getByRole('button', { name: 'Close diagnostics' }).click();
  await page.locator('.task-dashboard').getByRole('button', { name: 'View all' }).click();
  await page.getByRole('button', { name: '+ Add task' }).click();
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'Layout diagnostics' }).click();
  await expect.poll(async () => JSON.parse(await output.inputValue()).modalOpen).toBe(true);
  await expect.poll(async () => JSON.parse(await output.inputValue()).navigation?.visible).toBe(false);
  await page.getByRole('button', { name: 'Close diagnostics' }).click();
  await page.getByRole('dialog', { name: 'New task' }).getByRole('button', { name: 'Close' }).click();
  await expect(nav).toBeVisible();
});

test('diagnostics can be opened from the installed app', async ({ page, context }) => {
  await transport().attach(context);
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Layout diagnostics' })).toHaveCount(0);
  for (let i = 0; i < 5; i++) await page.getByRole('link', { name: 'Together — Home' }).click();
  await expect(page.getByRole('button', { name: 'Layout diagnostics' })).toBeVisible();
});
