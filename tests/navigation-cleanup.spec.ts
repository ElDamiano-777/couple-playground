import { expect, test } from '@playwright/test';
import { pocPassword, transport } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block' });

for (const width of [320, 360, 390]) {
  test(`main destinations and back navigation at ${width}px`, async ({ page, context }) => {
    const server = transport();
    await server.attach(context);
    await page.setViewportSize({ width, height: 740 });
    await page.goto('./');
    await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const nav = mainNavigation(page);
    await expect(nav.getByRole('button')).toHaveText(['Home', 'Shopping', 'Us', 'Places', 'More']);
    for (const [tab, heading] of [['Shopping', 'Shopping.'], ['Us', 'Us.'], ['Places', 'Places.'], ['More', 'More.'], ['Home', 'Home.']]) {
      await nav.getByRole('button', { name: tab, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Home sections' })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('button', { name: 'View all', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tasks.' })).toBeVisible();
    await page.getByRole('button', { name: '← Home' }).click();
    await expect(page.getByRole('heading', { name: 'Home.' })).toBeVisible();
    await nav.getByRole('button', { name: 'More', exact: true }).click();
    for (const [label, heading] of [['Recipes', 'Our Recipes.'], ['Meals', 'Meals.'], ['Tasks', 'Tasks.'], ['Expenses', 'Expenses.'], ['Calendar', 'Calendar.'], ['Children', 'Children.'], ['Settings & notifications', 'Settings.']]) {
      await page.locator('.more-shortcuts').getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Home sections' })).toHaveCount(0);
      await page.getByRole('button', { name: '← More', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'More.' })).toBeVisible();
    }
    await nav.getByRole('button', { name: 'Us', exact: true }).click();
    for (const [label, heading] of [['Pets', 'Pets.'], ['Wishlist', 'Wishlist.'], ['Love Notes', 'Love Notes.']]) {
      await page.locator('.couple-page').getByRole('button', { name: new RegExp(label) }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await page.getByRole('button', { name: '← Us', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Us.' })).toBeVisible();
    }
  });
}
