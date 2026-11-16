import { expect, test } from '@playwright/test';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

test('task editor scrolls within the visible viewport when the keyboard opens', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('.task-dashboard').getByRole('button', { name: 'View all' }).click();
  await page.getByRole('button', { name: '+ Add task' }).click();
  const editor = page.getByRole('dialog', { name: 'New task' });
  const task = editor.getByLabel('Task', { exact: true });
  await task.fill('Keyboard test');
  await page.evaluate(() => {
    Object.defineProperty(window, 'innerHeight', { value: 452, configurable: true });
    Object.defineProperty(window.visualViewport!, 'height', { value: 420, configurable: true });
    Object.defineProperty(window.visualViewport!, 'offsetTop', { value: 32, configurable: true });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => (await editor.boundingBox())!.y + (await editor.boundingBox())!.height).toBeLessThanOrEqual(452);
  expect(await editor.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await editor.getByLabel('Due date (optional)').fill('2027-01-04');
  const repeat = editor.getByRole('combobox', { name: 'Repeat', exact: true });
  await repeat.focus();
  await expect.poll(async () => (await repeat.boundingBox())!.y + (await repeat.boundingBox())!.height).toBeLessThanOrEqual(452);
  await repeat.selectOption('weekly');
  const save = editor.getByRole('button', { name: 'Save task' });
  await save.focus();
  await expect.poll(async () => (await save.boundingBox())!.y + (await save.boundingBox())!.height).toBeLessThanOrEqual(452);
  await save.click();
  await expect(page.locator('.task-row').filter({ hasText: 'Keyboard test' })).toContainText('Weekly');
  await page.getByRole('button', { name: '+ Add task' }).click();
  await page.evaluate(() => {
    delete (window as unknown as { innerHeight?: number }).innerHeight;
    delete (window.visualViewport as unknown as { height?: number }).height;
    delete (window.visualViewport as unknown as { offsetTop?: number }).offsetTop;
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => (await editor.boundingBox())!.y + (await editor.boundingBox())!.height).toBeLessThanOrEqual(812);
  await editor.getByRole('button', { name: 'Close' }).click();
});
