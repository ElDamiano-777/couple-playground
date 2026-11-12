import { expect, test, type Page } from '@playwright/test';
import { pocPassword, transport } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block' });
async function signIn(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function noLightPanels(page: Page) {
  const lightPanels = await page.locator('body *').evaluateAll(elements => elements.filter(element => {
    const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
    const match = style.backgroundColor.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    return rect.width > 25 && rect.height > 25 && style.visibility === 'visible' && style.display !== 'none' && match && match.slice(1).every(value => Number(value) > 225);
  }).map(element => `${element.tagName}.${element.className}`).slice(0, 8));
  expect(lightPanels).toEqual([]);
}
async function settings(page: Page) {
  await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click();
  await page.locator('.more-shortcuts').getByRole('button', { name: 'Settings & notifications' }).click();
}

test('theme is personal, immediate, persistent, and applies throughout navigation', async ({ page, context }) => {
  await transport().attach(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const nav = mainNavigation(page);
  for (const label of ['Home', 'Shopping', 'Us', 'Places', 'More']) {
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await noLightPanels(page);
  }
  for (const label of ['Recipes', 'Meals', 'Tasks', 'Expenses', 'Calendar', 'Children', 'Settings & notifications']) {
    await page.locator('.more-shortcuts').getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await noLightPanels(page);
    if (label === 'Tasks') {
      await page.getByRole('button', { name: '+ Add task' }).click();
      await noLightPanels(page);
      await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    }
    if (label === 'Meals') {
      await page.getByRole('button', { name: '+ Add meal' }).first().click();
      await noLightPanels(page);
      await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    }
    await page.getByRole('button', { name: '← More', exact: true }).click();
  }
  await nav.getByRole('button', { name: 'Us', exact: true }).click();
  for (const label of ['Pets', 'Wishlist', 'Love Notes']) {
    await page.locator('.couple-page').getByRole('button', { name: new RegExp(label) }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await noLightPanels(page);
    if (label === 'Love Notes') {
      await page.getByRole('button', { name: /Write a note/ }).click();
      await noLightPanels(page);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    await page.getByRole('button', { name: '← Us', exact: true }).click();
  }
  await settings(page);
  await page.getByLabel('Light', { exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await settings(page);
  await expect(page.getByLabel('Light', { exact: true })).toBeChecked();
  await page.getByLabel('Dark', { exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await settings(page);
  await page.getByLabel('Light', { exact: true }).check();
  await page.getByRole('button', { name: 'Change name' }).click();
  await page.getByRole('button', { name: 'Damian', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await settings(page);
  await page.getByRole('button', { name: 'Change name' }).click();
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
