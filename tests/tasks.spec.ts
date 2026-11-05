import { expect, test } from '@playwright/test';
import { mainNavigation, openShopping } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('shared tasks support assignment, due date, completion and restore on iPhone', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openShopping(page); await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: '+ Add task', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'New task' });
  await editor.locator('input').first().fill('Synthetic laundry'); await editor.locator('select').nth(0).selectOption('damian'); await editor.locator('input[type="date"]').fill('2026-11-12'); await editor.locator('select').nth(1).selectOption('high');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  const task = page.locator('.task-row').filter({ hasText: 'Synthetic laundry' });
  await expect(task).toContainText('Damian'); await expect(task).toContainText('Due');
  await page.getByRole('button', { name: 'Assigned to Partner', exact: true }).click(); await expect(page.getByText('Synthetic laundry', { exact: true })).toBeVisible();
  await page.getByLabel('Complete Synthetic laundry').click(); await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.getByLabel('Complete Synthetic laundry')).toBeVisible();
  await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Upcoming tasks' })).toBeVisible(); await expect(page.getByText('Synthetic laundry', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
