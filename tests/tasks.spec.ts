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


test('dashboard highlights and orders active tasks and reflects changes on phone screens', async ({ browser }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    const server = transport();
    server.seedTask('Older overdue', '2026-03-28', 'low', 'damian');
    server.seedTask('Urgent soon', '2026-04-02', 'high', 'both');
    server.seedTask('Normal soon', '2026-03-31', 'normal', 'masha');
    server.seedTask('Already done', '2026-03-20', 'high', 'masha', '2026-03-29T10:00:00Z');
    server.seedMeal('2026-03-30', 'Dinner', 'Pasta tonight');
    const context = await browser.newContext({ viewport, locale: 'de-DE', timezoneId: 'Europe/Berlin', serviceWorkers: 'block' });
    await server.attach(context); const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-03-30T12:00:00Z'));
    await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    const card = page.locator('.task-dashboard');
    await expect(card).toContainText('3 tasks to do');
    await expect(card).toContainText('Older overdue');
    await expect(card).toContainText('Damian · Due 28 Mar 2026 · Low priority');
    await expect(card).toContainText('Overdue');
    await expect(card).toHaveClass(/dashboard-overdue/);
    await expect(page.locator('.meal-dashboard').filter({ hasText: 'Today’s dinner' })).toHaveClass(/dashboard-active/);
    await expect(page.locator('.meal-dashboard').filter({ hasText: 'Today’s dinner' })).toContainText('Pasta tonight');
    await expect(page.locator('.us-shopping')).not.toHaveClass(/dashboard-active/);
    await card.click();
    await page.getByLabel('Complete Older overdue').click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card).toContainText('2 tasks to do');
    await expect(card).toContainText('Urgent soon');
    await expect(card).toContainText('Both · Due 2 Apr 2026 · High priority');
    await expect(card).not.toHaveClass(/dashboard-overdue/);
    await card.click();
    await page.locator('.task-main').filter({ hasText: 'Urgent soon' }).click();
    await page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Task', { exact: true }).fill('Updated urgent task');
    await page.getByRole('button', { name: 'Save task' }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card).toContainText('Updated urgent task');
    await card.click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete Updated urgent task' }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card).toContainText('Normal soon');
    await card.click();
    await page.getByLabel('Complete Normal soon').click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card).toContainText('No open tasks.');
    await expect(card).not.toHaveClass(/dashboard-active/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  }
});
