import { expect, test } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
test('occasion panels display helpful suggestions and add them', async ({ page, context }) => {
  await transport().attach(context);
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).tap();
  for (const [name, slug] of [['Party Time', 'party'], ['Daily Groceries', 'daily']]) {
    await page.locator('.occasion-card').filter({ hasText: name }).tap();
    const panel = page.getByRole('dialog', { name });
    await expect(panel).toBeVisible();
    const groups = panel.locator('.collection-group-toggle');
    expect(await groups.count()).toBeGreaterThanOrEqual(4);
    await expect(groups.first().locator('svg')).toBeVisible();
    await groups.first().tap();
    const tiles = panel.locator('.collection-product-tile');
    await expect(tiles.first().locator('svg')).toBeVisible();
    expect(await tiles.locator('[data-illustration="unknown"]').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.OCCASION_PREVIEW_DIR) await page.screenshot({ path: `${process.env.OCCASION_PREVIEW_DIR}/${process.env.OCCASION_PREVIEW_PREFIX}-${slug}.png` });
    await tiles.first().tap();
    await panel.getByRole('button', { name: 'Add 1 item' }).tap();
    await expect(panel).toContainText('1 remaining');
    await panel.getByRole('button', { name: 'Close', exact: true }).tap();
  }
});
