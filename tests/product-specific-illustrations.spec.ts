import { expect, test } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
test('specific illustrations and custom names work across shopping', async ({ page, context }) => {
  const server = transport();
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5X0QAAAABJRU5ErkJggg==';
  server.seedFavorite('Mozzarella', photo);
  await server.attach(context);
  await page.goto('./');
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Shopping', exact: true }).tap();
  await page.getByRole('button', { name: '+ Quick Add Item' }).tap();
  const modal = page.locator('.quick-add');
  await expect(modal.locator('.favorite-card').filter({ hasText: 'Mozzarella' }).locator('img')).toHaveAttribute('src', photo);
  for (const [group, names] of Object.entries({ Pasta: ['Spaghetti', 'Penne', 'Fusilli'], Meat: ['Sausages', 'Ham'], Cheese: ['Mozzarella', 'Parmesan'] })) {
    await modal.locator('.quick-subgroup-toggle').getByText(group, { exact: true }).tap();
    const groupNode = modal.locator('.quick-subgroup-toggle').getByText(group, { exact: true }).locator('../..');
    for (const name of names) await expect(groupNode.getByRole('button', { name, exact: true }).locator(`[data-illustration="${name.toLowerCase()}"]`)).toBeVisible();
    if (group === 'Pasta' && process.env.TOGETHER_SCREENSHOTS) await groupNode.screenshot({ path: `${process.env.TOGETHER_SCREENSHOTS}/pasta.png` });
  }
  await modal.getByRole('button', { name: '+ Custom item' }).tap();
  await modal.getByLabel('Custom product').fill('Coca-Cola Zero');
  await modal.locator('.quick-custom').getByRole('button', { name: 'Add', exact: true }).tap();
  await modal.getByRole('button', { name: /Selected items \(1\)/ }).tap();
  await expect(modal.locator('.quick-review-item').filter({ hasText: 'Coca-Cola Zero' }).locator('[data-illustration="cola"]')).toBeVisible();
  await modal.getByRole('button', { name: 'Add 1 item' }).tap();
  await expect(page.locator('.shopping-list-row').filter({ hasText: 'Coca-Cola Zero' }).locator('[data-illustration="cola"]')).toBeVisible();
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).tap();
  await expect(page.locator('.us-shopping-item').filter({ hasText: 'Coca-Cola Zero' }).locator('[data-illustration="cola"]')).toBeVisible();
});
