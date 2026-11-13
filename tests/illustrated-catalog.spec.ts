import { expect, test } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block', viewport: { width: 320, height: 700 } });
test('every catalog item has an illustration and favorites use the catalog', async ({ page, context }) => {
  await transport().attach(context); await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: '+ Quick Add Item' }).click();
  const modal = page.locator('.quick-add');
  await expect(modal.getByRole('button', { name: 'Scan barcode' })).toBeVisible();
  await expect(modal.getByLabel('Choose product photo')).toHaveCount(1);
  await modal.getByRole('button', { name: 'Save Milk as favorite' }).click();
  await expect(modal.getByLabel('Product name')).toHaveValue('Milk');
  await expect(modal.getByRole('region', { name: 'Choose a product' })).toHaveCount(0);
  await modal.getByLabel('Brand (optional)').fill('Sample');
  await modal.getByRole('button', { name: 'Save favorite' }).click();
  await expect(modal.locator('.favorite-card')).toContainText('Milk');
  await expect(modal.locator('.favorite-card .product-illustration')).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Add 0 items' })).toBeDisabled();
  for (const category of ['Home', 'Pets', 'Kids']) {
    await modal.getByRole('group', { name: 'Quick Add categories' }).getByRole('button', { name: category }).click();
    const groups = modal.locator('.quick-group'); const count = await groups.count();
    for (let i = 0; i < count; i++) {
      const group = groups.nth(i), toggle = group.locator('.quick-group-toggle');
      if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
      const subgroups = group.locator('.quick-subgroup-toggle');
      for (let j = 0; j < await subgroups.count(); j++) if (await subgroups.nth(j).getAttribute('aria-expanded') === 'false') await subgroups.nth(j).click();
      expect(await group.locator('.quick-tile').count()).toBeGreaterThan(0);
      expect(await group.locator('.quick-tile:not(:has(.product-illustration))').count()).toBe(0);
      expect(await group.locator('.quick-tile .product-illustration[data-illustration="unknown"]').count()).toBe(0);
    }
  }
  await modal.getByRole('group', { name: 'Quick Add categories' }).getByRole('button', { name: 'Home' }).click();
  await modal.locator('.quick-content').evaluate(el => { el.scrollTop = 300; });
  if (process.env.TOGETHER_SCREENSHOTS) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); await page.screenshot({ path: `${process.env.TOGETHER_SCREENSHOTS}/quick-add-catalog.png`, animations: 'disabled' }); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
