import { expect, test } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
async function login(page: import('@playwright/test').Page) {
  await page.goto('./'); await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('empty Home keeps quick actions and clear connection status', async ({ page, context }) => {
  await transport().attach(context); await login(page);
  await expect(page.getByLabel('Device online')).toBeVisible();
  await expect(page.locator('.task-dashboard')).toContainText('No open tasks');
  await expect(page.locator('.shopping-count')).toHaveText('0 items to buy');
  await expect(page.getByRole('button', { name: /Tonight’s dinner/ })).toContainText('Plan dinner');
  await expect(page.getByRole('button', { name: '+ Add quick task' })).toHaveCount(0);
  await expect(page.locator('.us-shopping').getByRole('button', { name: '+ Add item' })).toHaveCount(0);
  await expect(page.locator('.home-quick-actions').getByRole('button')).toHaveText(['Love Note', 'Add task', 'Add shopping item', 'Plan dinner']);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'New task' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
  await context.setOffline(true); await expect(page.getByLabel('Device offline')).toBeVisible();
  await context.setOffline(false);
});
test('populated Home keeps long content, shopping controls, and dinner', async ({ page, context }) => {
  const server = transport();
  server.seedTask('Plan our weekend together with a very long description', '2026-03-31', 'high', 'damian');
  server.seedTask('Water the plants', '2026-04-01', 'normal', 'masha');
  server.seedShopping('Cat litter for our shared home with a very long product name', 'Brand: Example · Size: 10 l');
  const recipe = server.seedRecipe('Pasta night', '200 g pasta', { instructions: 'Cook pasta.' });
  server.seedMeal('2026-03-30', 'Dinner', 'Pasta night', recipe);
  await server.attach(context); await page.clock.setFixedTime(new Date('2026-03-30T12:00:00Z')); await login(page);
  await expect(page.locator('.home-task')).toHaveCount(2);
  await expect(page.locator('.us-shopping-item')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Tonight’s dinner/ })).toContainText('Pasta night');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.TOGETHER_SCREENSHOTS) await page.screenshot({ path: `${process.env.TOGETHER_SCREENSHOTS}/final-home.png`, animations: 'disabled' });
  await page.locator('.us-shopping-open').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Mark Cat litter/ })).not.toBeChecked();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await page.getByRole('checkbox', { name: /Mark Cat litter/ }).click();
  await expect(page.locator('.purchased-list')).not.toHaveAttribute('open');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const geometry = await page.evaluate(() => ({ bottom: document.querySelector('.home-quick-actions')!.getBoundingClientRect().bottom, nav: document.querySelector('.bottom-nav')!.getBoundingClientRect().top }));
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.nav);
});
test('capture a populated Home preview', async ({ page, context }) => {
  test.skip(!process.env.TOGETHER_SCREENSHOTS, 'Screenshots are created only when requested.');
  const server = transport();
  server.seedTask('Pick up the parcel', '2026-03-31', 'high', 'damian');
  server.seedShopping('Cat litter', 'Brand: Example · Size: 10 l');
  const recipe = server.seedRecipe('Pasta night', '200 g pasta', { instructions: 'Cook pasta.' });
  server.seedMeal('2026-03-30', 'Dinner', 'Pasta night', recipe);
  await server.attach(context); await page.clock.setFixedTime(new Date('2026-03-30T12:00:00Z')); await login(page);
  await expect(page.getByRole('button', { name: /Tonight’s dinner/ })).toContainText('Pasta night');
  await page.screenshot({ path: `${process.env.TOGETHER_SCREENSHOTS}/final-home.png`, animations: 'disabled' });
});
