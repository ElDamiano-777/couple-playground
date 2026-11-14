import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('shared notes sync, guard simultaneous edits, and confirm deletion', async ({ browser }) => {
  const server = transport();
  const contexts = await Promise.all([{ width: 390, height: 844 }, { width: 360, height: 800 }].map(viewport => browser.newContext({ viewport, serviceWorkers: 'block' })));
  const pages = [];
  for (const [index, context] of contexts.entries()) {
    await server.attach(context); const page = await context.newPage(); pages.push(page);
    await page.goto('./'); await page.getByRole('button', { name: index ? 'Damian' : 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await page.getByRole('button', { name: /Open love notes/ }).click();
    await page.getByRole('tab', { name: /Our Notes/ }).click();
  }
  const [masha, damian] = pages;
  await masha.getByRole('button', { name: '+ New shared note' }).click();
  const buttons = masha.locator('.note-form-actions button');
  const primary = await buttons.nth(0).boundingBox(), cancel = await buttons.nth(1).boundingBox();
  expect(primary && cancel && primary.y === cancel.y && primary.height === cancel.height && primary.height >= 44 && primary.x + primary.width <= cancel.x).toBeTruthy();
  await expect(buttons.nth(1)).toHaveCSS('background-color', 'rgb(32, 32, 41)');
  await masha.locator('html').evaluate(element => element.setAttribute('data-theme', 'light'));
  await expect(buttons.nth(1)).toHaveCSS('background-color', 'rgb(241, 228, 248)');
  await masha.locator('html').evaluate(element => element.setAttribute('data-theme', 'dark'));
  await masha.getByLabel('Title').fill('Weekend plans'); await masha.getByLabel('Note', { exact: true }).fill('A quiet day together');
  await masha.getByRole('tab', { name: /For Each Other/ }).click(); await masha.getByRole('tab', { name: /Our Notes/ }).click();
  await expect(masha.getByLabel('Note', { exact: true })).toHaveValue('A quiet day together');
  masha.once('dialog', dialog => dialog.dismiss()); await mainNavigation(masha).getByRole('button', { name: 'Home', exact: true }).click();
  await expect(masha.getByLabel('Note', { exact: true })).toHaveValue('A quiet day together');
  await masha.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(masha.getByRole('status')).toHaveText('Shared note saved.');
  await damian.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(damian.getByText('A quiet day together')).toBeVisible();
  await expect(damian.locator('.shared-note')).toContainText('Created'); await expect(damian.locator('.shared-note')).toContainText('Last edited');
  await masha.locator('.shared-note').getByRole('button', { name: 'Edit' }).click();
  await damian.locator('.shared-note').getByRole('button', { name: 'Edit' }).click();
  await masha.getByLabel('Note', { exact: true }).fill('Masha changed this'); await masha.getByRole('button', { name: 'Save', exact: true }).click();
  await damian.getByLabel('Note', { exact: true }).fill('Damian has another idea'); await damian.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(damian.getByRole('alert')).toContainText('changed on another device');
  await expect(damian.getByLabel('Note', { exact: true })).toHaveValue('Damian has another idea');
  damian.once('dialog', dialog => dialog.accept()); await damian.getByRole('button', { name: 'Cancel' }).click();
  await damian.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(damian.getByText('Masha changed this')).toBeVisible();
  await damian.locator('.shared-note').getByRole('button', { name: 'Edit' }).click();
  await damian.getByLabel('Title').fill('Our weekend'); await damian.getByRole('button', { name: 'Save', exact: true }).click();
  await masha.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(masha.getByText('Our weekend')).toBeVisible();
  masha.once('dialog', dialog => dialog.dismiss()); await masha.locator('.shared-note').getByRole('button', { name: 'Delete' }).click();
  await expect(masha.getByText('Our weekend')).toBeVisible();
  masha.once('dialog', dialog => dialog.accept()); await masha.locator('.shared-note').getByRole('button', { name: 'Delete' }).click();
  await expect(masha.getByText('Our weekend')).toHaveCount(0);
  await damian.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(damian.getByText('Our weekend')).toHaveCount(0);
  for (const page of pages) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await Promise.all(contexts.map(context => context.close()));
});
