import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('love notes remain closed until opened and share read status between devices', async ({ browser }) => {
  const server = transport();
  const contexts = await Promise.all([{ width: 390, height: 844 }, { width: 360, height: 800 }, { width: 390, height: 844 }].map(viewport => browser.newContext({ viewport, serviceWorkers: 'block' })));
  const pages = [];
  for (const [index, context] of contexts.entries()) {
    await server.attach(context);
    const page = await context.newPage(); pages.push(page);
    await page.goto('./');
    await page.getByRole('button', { name: index === 1 ? 'Damian' : 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(page.getByRole('button', { name: /Open love notes/ })).toBeVisible();
  }
  const [masha, damian, mashaOtherDevice] = pages;
  await damian.getByRole('button', { name: /Open love notes/ }).click();
  await expect(damian.getByRole('navigation', { name: 'Home sections' })).toHaveCount(0);
  await expect(damian.getByRole('heading', { name: 'Love Notes.' })).toBeVisible();
  await damian.getByLabel('Partner note').fill('A private note for Masha');
  await damian.getByRole('button', { name: 'Send note' }).click();
  await expect(damian.getByText('A private note for Masha')).toBeVisible();
  await masha.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(masha.getByRole('button', { name: /Love Notes/ })).toContainText('1 new');
  await masha.getByRole('button', { name: /Open love notes/ }).click();
  await expect(masha.getByText('A private note for Masha')).toHaveCount(0);
  await expect(masha.locator('.note-envelope')).toContainText('Damian');
  await masha.getByRole('button', { name: '← Us' }).click();
  await expect(masha.getByRole('button', { name: /Love Notes/ })).toContainText('1 new');
  await masha.getByRole('button', { name: /Open love notes/ }).click();
  await masha.getByRole('button', { name: /Open note/ }).click();
  await expect(masha.getByText('A private note for Masha')).toBeVisible();
  await mashaOtherDevice.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await mashaOtherDevice.getByRole('button', { name: /Open love notes/ }).click();
  await expect(mashaOtherDevice.getByText('A private note for Masha')).toBeVisible();
  await masha.getByLabel('Partner note').fill('A private note for Damian');
  await masha.getByRole('button', { name: 'Send note' }).click();
  await damian.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(damian.locator('.note-envelope')).toContainText('Masha');
  await expect(damian.getByText('A private note for Damian')).toHaveCount(0);
  await damian.getByRole('button', { name: /Open note/ }).click();
  await expect(damian.getByText('A private note for Damian')).toBeVisible();
  const sentNote = masha.locator('.note-open').filter({ hasText: 'A private note for Damian' });
  await sentNote.getByRole('button', { name: 'Edit' }).click();
  await masha.getByLabel('Partner note').fill('An edited note for Damian');
  await masha.getByRole('button', { name: 'Save note' }).click();
  await expect(masha.getByText('An edited note for Damian')).toBeVisible();
  masha.once('dialog', dialog => dialog.accept());
  await masha.locator('.note-open').filter({ hasText: 'An edited note for Damian' }).getByRole('button', { name: 'Delete' }).click();
  await expect(masha.getByText('An edited note for Damian')).toHaveCount(0);
  for (const page of pages) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await Promise.all(contexts.map(context => context.close()));
});
