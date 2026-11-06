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
  await expect(task.locator('.badge-assignee')).toHaveText('Damian'); await expect(task.locator('.badge-due')).toHaveAttribute('aria-label', /Due|Overdue/);
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
    server.seedTask('Normal soon', '2026-04-03', 'normal', 'masha');
    server.seedTask('Already done', '2026-03-20', 'high', 'masha', '2026-03-29T10:00:00Z');
    server.seedMeal('2026-03-30', 'Dinner', 'Pasta tonight');
    const context = await browser.newContext({ viewport, locale: 'de-DE', timezoneId: 'Europe/Berlin', serviceWorkers: 'block' });
    await server.attach(context); const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-03-30T12:00:00Z'));
    await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    const card = page.locator('.task-dashboard');
    await expect(card.locator('.home-task')).toHaveCount(2);
    await expect(card).toContainText('Older overdue');
    await expect(card.locator('.home-task').first().locator('.badge-assignee')).toHaveText('Damian');
    await expect(card.locator('.home-task').first().locator('.badge-due')).toHaveText('Overdue · 28 Mar');
    await expect(card.locator('.home-task').first().locator('.badge-low')).toHaveText('Low');
    await expect(card).toContainText('Overdue');
    await expect(card).toHaveClass(/dashboard-overdue/);
    await expect(page.locator('.dinner-dashboard')).toHaveClass(/dashboard-active/);
    await expect(page.locator('.dinner-dashboard')).toContainText('Pasta tonight');
    await expect(page.locator('.shopping-dashboard')).not.toHaveClass(/dashboard-active/);
    await card.getByRole('button', { name: 'View all' }).click();
    await page.getByLabel('Complete Older overdue').click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card.locator('.home-task')).toHaveCount(2);
    await expect(card).toContainText('Urgent soon');
    await expect(card.locator('.home-task').first().locator('.badge-assignee')).toHaveText('Both');
    await expect(card.locator('.home-task').first().locator('.badge-due')).toHaveText('2 Apr');
    await expect(card.locator('.home-task').first().locator('.badge-high')).toHaveText('High');
    await expect(card).not.toHaveClass(/dashboard-overdue/);
    await card.getByRole('button', { name: 'View all' }).click();
    await page.locator('.task-main').filter({ hasText: 'Urgent soon' }).click();
    await page.getByRole('dialog', { name: 'Edit task' }).getByLabel('Task', { exact: true }).fill('Updated urgent task');
    await page.getByRole('button', { name: 'Save task' }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card).toContainText('Updated urgent task');
    await card.getByRole('button', { name: 'View all' }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete Updated urgent task' }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card).toContainText('Normal soon');
    await card.getByRole('button', { name: 'View all' }).click();
    await page.getByLabel('Complete Normal soon').click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(card).toContainText('No open tasks.');
    await expect(card).not.toHaveClass(/dashboard-active/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  }
});


test('task badges show English dates, priorities and overdue state on narrow phones', async ({ browser }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }, { width: 320, height: 700 }]) {
    const server = transport();
    server.seedTask('No due date', null, 'normal', 'masha');
    server.seedTask('Future task', '2026-04-06', 'high', 'both');
    server.seedTask('Past task', '2026-03-28', 'low', 'damian');
    server.seedTask('Completed task', '2026-03-20', 'high', 'masha', '2026-03-29T10:00:00Z');
    const context = await browser.newContext({ viewport, locale: 'de-DE', timezoneId: 'Europe/Berlin', serviceWorkers: 'block' });
    await server.attach(context); const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-03-30T12:00:00Z'));
    await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    const dashboard = page.locator('.task-dashboard');
    await expect(dashboard.locator('.home-task').first().locator('.task-badge')).toHaveCount(3);
    await expect(dashboard.locator('.home-task').first().locator('.badge-due')).toHaveAttribute('aria-label', 'Overdue 28 Mar');
    await dashboard.getByRole('button', { name: 'View all' }).click();
    const past = page.locator('.task-row').filter({ hasText: 'Past task' });
    const future = page.locator('.task-row').filter({ hasText: 'Future task' });
    const undated = page.locator('.task-row').filter({ hasText: 'No due date' });
    await expect(past.locator('.badge-overdue')).toHaveText('Overdue · 28 Mar');
    await expect(past.locator('.badge-low')).toHaveText('Low');
    await expect(future.locator('.badge-assignee')).toHaveText('Both');
    await expect(future.locator('.badge-due')).toHaveText('6 Apr');
    await expect(future.locator('.badge-high')).toHaveText('High');
    await expect(undated.locator('.badge-assignee')).toHaveText('Masha');
    await expect(undated.locator('.badge-due')).toHaveCount(0);
    await expect(undated.locator('.badge-normal')).toHaveText('Normal');
    const colors = await page.locator('.task-row .badge-priority').evaluateAll(badges => badges.map(badge => getComputedStyle(badge).backgroundColor));
    expect(new Set(colors).size).toBe(3);
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    const completed = page.locator('.task-row').filter({ hasText: 'Completed task' });
    await expect(completed.locator('.badge-due')).toHaveText('20 Mar');
    await expect(completed.locator('.badge-overdue')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  }
});
