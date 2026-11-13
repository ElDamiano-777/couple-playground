import { expect, test } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
test('produce has distinct illustrations and cat litter stays consistent across screens', async ({ page, context }) => {
  const server = transport(); server.seedShopping('CAT LITTER 10 kg', '', false, 'Pets');
  await server.attach(context); await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const existing = page.locator('.us-shopping-item').filter({ hasText: 'CAT LITTER' });
  await expect(existing.locator('[data-illustration="litter"]')).toBeVisible();
  const nav = mainNavigation(page); await nav.getByRole('button', { name: 'Shopping', exact: true }).click();
  await expect(page.locator('.shopping-list-row').filter({ hasText: 'CAT LITTER' }).locator('[data-illustration="litter"]')).toBeVisible();
  await page.getByRole('button', { name: '+ Quick Add Item' }).click();
  const modal = page.locator('.quick-add');
  await modal.getByRole('button', { name: 'Vegetables', exact: true }).click();
  const vegetables: Record<string, string> = { Carrots: 'carrot', Tomatoes: 'tomato', Cucumbers: 'cucumber', Potatoes: 'potato', Onions: 'onion', Peppers: 'pepper', Salad: 'lettuce' };
  for (const [name, kind] of Object.entries(vegetables)) await expect(modal.getByRole('button', { name, exact: true }).locator(`[data-illustration="${kind}"]`)).toHaveCount(1);
  if (process.env.TOGETHER_SCREENSHOTS) {
    await modal.locator('.quick-content').evaluate(el => { const carrot = Array.from(el.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Carrots'); if (carrot) el.scrollTop += carrot.getBoundingClientRect().top - el.getBoundingClientRect().top - 12; });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.waitForTimeout(250);
    await modal.screenshot({ path: `${process.env.TOGETHER_SCREENSHOTS}/corrected-products.png`, animations: 'disabled' });
  }
  await modal.getByRole('button', { name: 'Fruit', exact: true }).click();
  const fruit: Record<string, string> = { Apples: 'apple', Bananas: 'banana', Oranges: 'orange', Berries: 'berries', Grapes: 'grapes' };
  for (const [name, kind] of Object.entries(fruit)) await expect(modal.getByRole('button', { name, exact: true }).locator(`[data-illustration="${kind}"]`)).toHaveCount(1);
  await modal.getByRole('group', { name: 'Quick Add categories' }).getByRole('button', { name: 'Pets' }).click();
  await modal.getByRole('button', { name: 'Care & supplies' }).click();
  const litter = modal.getByRole('button', { name: 'Cat litter', exact: true });
  await expect(litter.locator('[data-illustration="litter"]')).toBeVisible(); await litter.click();
  await expect(modal.locator('.quick-selection').filter({ hasText: 'Cat litter' }).locator('[data-illustration="litter"]')).toHaveCount(1);
  await modal.getByRole('button', { name: 'Add 1 item' }).click();
  await expect(page.locator('.shopping-list-row').filter({ has: page.getByText('Cat litter', { exact: true }) }).locator('[data-illustration="litter"]')).toBeVisible();
  await nav.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.us-shopping-item').filter({ has: page.getByText('Cat litter', { exact: true }) }).locator('[data-illustration="litter"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
