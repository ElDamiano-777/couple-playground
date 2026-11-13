import { expect, test, type Page } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block' });
async function login(page: Page, name: 'Masha' | 'Damian') {
  await page.goto('./'); await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.shopping-dashboard')).toBeVisible();
  await expect(page.locator('.shopping-count')).toBeVisible();
}
async function add(page: Page, name: string, category: string, details: string) {
  await page.getByRole('button', { name: 'Add shopping item', exact: true }).click();
  await page.getByRole('group', { name: 'Quick Add categories' }).getByRole('button', { name: category }).click();
  await page.getByRole('button', { name: '+ Custom item' }).click();
  await page.getByLabel('Custom product').fill(name);
  await page.locator('.quick-custom').getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('.quick-selection').getByLabel('Details (optional)').fill(details);
  await page.getByRole('button', { name: 'Add 1 item' }).click();
  await expect(page.locator('.us-shopping-item').filter({ hasText: name })).toBeVisible();
}

test('the Us dashboard uses the shared list for all categories and keeps bought history', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ viewport: { width: 320, height: 844 }, serviceWorkers: 'block' });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  try {
    await login(first, 'Masha'); await login(second, 'Damian');
    await expect(first.locator('.shopping-dashboard')).toContainText('0 items');
    await expect(first.locator('.shopping-dashboard')).not.toHaveClass(/dashboard-active/);
    await add(first, 'Synthetic apples', 'Home', 'Organic');
    await expect(first.locator('.us-shopping')).toHaveClass(/dashboard-active/);
    await add(first, 'Synthetic pet food', 'Pets', 'For: First pet · Brand: Example');
    await add(first, 'Synthetic wipes', 'Kids', 'Two packs');
    const categories = first.getByRole('group', { name: 'Shopping categories' });
    await expect(categories.getByRole('button', { name: /Home/ })).toContainText('1');
    await expect(categories.getByRole('button', { name: /Pets/ })).toContainText('1');
    await expect(categories.getByRole('button', { name: /Kids/ })).toContainText('1');
    await expect(first.locator('.us-shopping-item').filter({ hasText: 'Synthetic pet food' })).toContainText('First pet');
    expect(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(second.locator('.us-shopping-item')).toHaveCount(3);
    await second.locator('.us-shopping-item').filter({ hasText: 'Synthetic apples' }).getByRole('checkbox').click();
    await expect(second.locator('.us-shopping-list').first().locator('.us-shopping-item').filter({ hasText: 'Synthetic apples' })).toHaveCount(0);
    await expect(second.getByRole('status')).toContainText('Marked as purchased');
    await first.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(first.locator('.us-shopping-list').first().locator('.us-shopping-item').filter({ hasText: 'Synthetic apples' })).toHaveCount(0);
    await expect(categories.getByRole('button', { name: /Home/ })).toContainText('0');
    await categories.getByRole('button', { name: /Home/ }).click();
    await expect(first.getByRole('heading', { name: 'Home shopping' })).toBeVisible();
    const purchased = first.getByRole('checkbox', { name: 'Return Synthetic apples to active list' });
    await expect(purchased).toBeChecked();
    await purchased.click(); await expect(first.getByRole('checkbox', { name: 'Mark Synthetic apples as purchased' })).not.toBeChecked();
    await mainNavigation(first).getByRole('button', { name: 'Home', exact: true }).click();
    await expect(first.locator('.us-shopping-item').filter({ hasText: 'Synthetic apples' })).toBeVisible();
    await first.getByRole('group', { name: 'Shopping categories' }).getByRole('button', { name: /Pets/ }).click();
    await expect(first.getByRole('heading', { name: 'Pets shopping' })).toBeVisible();
    await expect(first.getByText('Synthetic pet food', { exact: true })).toBeVisible();
    await mainNavigation(first).getByRole('button', { name: 'Home', exact: true }).click();
    await first.getByRole('group', { name: 'Shopping categories' }).getByRole('button', { name: /Kids/ }).click();
    await expect(first.getByRole('heading', { name: 'Kids shopping' })).toBeVisible();
    await expect(first.getByText('Synthetic wipes', { exact: true })).toBeVisible();
  } finally { await a.close(); await b.close(); }
});

test('an unsuccessful dashboard addition keeps its draft when navigating', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await login(page, 'Masha');
  await page.getByRole('button', { name: 'Add shopping item', exact: true }).click();
  await page.getByRole('group', { name: 'Quick Add categories' }).getByRole('button', { name: 'Pets' }).click();
  await page.getByRole('button', { name: '+ Custom item' }).click();
  await page.getByLabel('Custom product').fill('Unfinished dashboard item');
  await page.locator('.quick-custom').getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('.quick-selection').getByLabel('Details (optional)').fill('Keep these details');
  server.failNextSave();
  await page.getByRole('button', { name: 'Add 1 item' }).click();
  await expect(page.locator('.quick-add').getByRole('alert')).toContainText('couldn’t complete');
  await expect(page.locator('.quick-selection')).toContainText('Unfinished dashboard item');
  await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Add shopping item', exact: true }).click();
  await page.getByRole('group', { name: 'Quick Add categories' }).getByRole('button', { name: 'Pets' }).click();
  await expect(page.locator('.quick-selection')).toContainText('Unfinished dashboard item');
  await expect(page.locator('.quick-selection').getByLabel('Details (optional)')).toHaveValue('Keep these details');
});

test('dashboard shopping preview expands and links to Shopping', async ({ page, context }) => {
  const server = transport();
  for (const name of ['Eggs', 'Milk', 'Bread', 'Rice', 'Pasta', 'Tea', 'Salt', 'Oil', 'Coffee', 'Apples']) server.seedShopping(name, '');
  await server.attach(context); await login(page, 'Masha');
  await expect(page.locator('.us-shopping-item:not(.is-bought)')).toHaveCount(3);
  await page.getByRole('button', { name: 'Show all (10)' }).click();
  await expect(page.locator('.us-shopping-item:not(.is-bought)')).toHaveCount(10);
  await page.getByRole('button', { name: 'Show less' }).click();
  await expect(page.locator('.us-shopping-item:not(.is-bought)')).toHaveCount(3);
  await page.locator('.us-shopping-heading').getByRole('button', { name: 'View all', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shopping.' })).toBeVisible();
});

test('purchased items stay collapsed on Home and can be restored across phones', async ({ browser }) => {
  const server = transport();
  server.seedShopping('Active oats', '');
  const a = await browser.newContext({ viewport: { width: 320, height: 700 }, serviceWorkers: 'block' });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  try {
    await login(first, 'Masha'); await login(second, 'Damian');
    const list = first.locator('.home-dashboard .purchased-list');
    await expect(list).toHaveCount(0);
    await first.getByRole('checkbox', { name: 'Mark Active oats as purchased' }).click();
    await expect(list.locator('summary')).toHaveText('Purchased (1)');
    await expect(list).not.toHaveAttribute('open');
    await expect(first.getByRole('checkbox', { name: 'Return Active oats to active list' })).toBeHidden();
    await list.locator('summary').click();
    await expect(list).toHaveAttribute('open', '');
    await first.locator('.us-shopping-item.is-bought').getByRole('button', { name: /Active oats/ }).click();
    await expect(first.getByRole('dialog', { name: 'Active oats' })).toBeVisible();
    await first.getByRole('dialog', { name: 'Active oats' }).getByRole('button', { name: 'Close' }).click();
    await expect(first.getByRole('checkbox', { name: 'Return Active oats to active list' })).toBeChecked();
    await list.locator('summary').click();
    await expect(list).not.toHaveAttribute('open');
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    const partnerList = second.locator('.home-dashboard .purchased-list');
    await expect(partnerList.locator('summary')).toHaveText('Purchased (1)');
    await expect(partnerList).not.toHaveAttribute('open');
    await partnerList.locator('summary').click();
    await second.getByRole('checkbox', { name: 'Return Active oats to active list' }).click();
    await expect(second.getByRole('checkbox', { name: 'Mark Active oats as purchased' })).toBeVisible();
    await first.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(first.getByRole('checkbox', { name: 'Mark Active oats as purchased' })).toBeVisible();
    await expect(list).toHaveCount(0);
    server.seedShopping('Bought tea', '', true);
    server.seedShopping('Bought bread', '', true);
    await first.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(list.locator('summary')).toHaveText('Purchased (2)');
    await expect(list).not.toHaveAttribute('open');
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(partnerList.locator('summary')).toHaveText('Purchased (2)');
    await expect(partnerList).not.toHaveAttribute('open');
    await list.locator('summary').click();
    await expect(list.getByRole('checkbox')).toHaveCount(2);
    await expect(first.getByRole('checkbox', { name: 'Return Bought tea to active list' })).toBeVisible();
    await list.locator('summary').click();
    await expect(first.getByRole('checkbox', { name: 'Return Bought tea to active list' })).toBeHidden();
    expect(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await a.close(); await b.close(); }
});
