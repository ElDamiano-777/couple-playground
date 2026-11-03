import { test, expect, type Page } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation, openHome } from './navigation';

test.use({ serviceWorkers: 'block' });
async function login(page: Page, name: 'Masha' | 'Damian') {
  await page.goto('./');
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function recipes(page: Page) {
  await openHome(page);
  await page.getByRole('navigation', { name: 'Home sections' }).getByRole('button', { name: 'Recipes', exact: true }).click();
}

test('recipes with photos and filters are shared across phones and existing notes survive', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const first = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 844 } });
  const second = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await server.attach(first); await server.attach(second);
  const a = await first.newPage(), b = await second.newPage();
  try {
    await login(a, 'Masha'); await login(b, 'Damian');
    await recipes(a);
    await expect(a.getByRole('heading', { name: 'Our Recipes.' })).toBeVisible();
    await expect(a.getByText('Your recipe collection starts here')).toBeVisible();
    await a.getByRole('button', { name: '+ Add Recipe' }).click();
    await a.getByLabel('Recipe name').fill('Synthetic pancakes');
    await a.getByLabel('Category', { exact: true }).selectOption('Breakfast');
    await a.getByLabel('Preparation time (minutes)').fill('20');
    await a.getByLabel('Recipe photo (optional)').setInputFiles('public/icons/icon-192.png');
    await expect(a.getByAltText('Recipe photo preview')).toBeVisible();
    await a.getByRole('button', { name: 'Save recipe' }).click();
    const card = a.locator('.recipe-card').filter({ hasText: 'Synthetic pancakes' });
    await expect(card).toContainText('Breakfast'); await expect(card).toContainText('20 min');
    const image = await card.locator('img').getAttribute('src');
    await a.getByRole('group', { name: 'Recipe categories' }).getByRole('button', { name: 'Dinner' }).click();
    await expect(card).toHaveCount(0);
    await expect(a.getByText('No recipes in this category yet.')).toBeVisible();
    await a.getByRole('group', { name: 'Recipe categories' }).getByRole('button', { name: 'Breakfast' }).click();
    await expect(card).toBeVisible();
    expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await recipes(b); await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    const partnerCard = b.locator('.recipe-card').filter({ hasText: 'Synthetic pancakes' });
    await expect(partnerCard.locator('img')).toHaveAttribute('src', image!);
    await partnerCard.click();
    await expect(b.getByRole('heading', { name: 'Synthetic pancakes' })).toBeVisible();
    await expect(b.locator('.recipe-detail')).toContainText('20 min');
    await b.getByRole('button', { name: 'Edit Synthetic pancakes' }).click();
    await b.getByLabel('Preparation time (minutes)').fill('25');
    await b.getByRole('button', { name: 'Save changes' }).click();
    await expect(b.locator('.recipe-detail')).toContainText('25 min');
    await a.reload(); await recipes(a);
    await expect(card.locator('img')).toHaveAttribute('src', image!);
    await expect(card).toContainText('25 min');
    server.seedLegacyRecipe('Older recipe', 'Existing notes\nStill here');
    await a.evaluate(() => window.dispatchEvent(new Event('focus')));
    await a.getByRole('group', { name: 'Recipe categories' }).getByRole('button', { name: 'All', exact: true }).click();
    await a.locator('.recipe-card').filter({ hasText: 'Older recipe' }).click();
    await expect(a.locator('.collection-notes')).toHaveText('Existing notes\nStill here');
    await a.getByRole('button', { name: 'Edit Older recipe' }).click();
    await a.getByLabel('Recipe name').fill('Older recipe updated');
    await a.getByRole('button', { name: 'Save changes' }).click();
    await expect(a.locator('.collection-notes')).toHaveText('Existing notes\nStill here');
    await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    await b.getByRole('button', { name: '← Our Recipes' }).click();
    await expect(b.locator('.recipe-card').filter({ hasText: 'Older recipe updated' })).toBeVisible();
    await mainNavigation(b).getByRole('button', { name: 'Us', exact: true }).click();
    await expect(b.getByText(/2 recipes/)).toBeVisible();
  } finally { await first.close(); await second.close(); }
});

test('a failed recipe save keeps the form and photo for retry', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: '+ Add Recipe' }).click();
  await page.getByLabel('Recipe name').fill('Unfinished soup');
  await page.getByLabel('Category', { exact: true }).selectOption('Lunch');
  await page.getByLabel('Preparation time (minutes)').fill('30');
  await page.getByLabel('Recipe photo (optional)').setInputFiles('public/icons/icon-192.png');
  await expect(page.getByAltText('Recipe photo preview')).toBeVisible();
  server.failNextEntrySave();
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await expect(page.getByRole('alert')).toContainText('couldn’t save');
  await expect(page.getByLabel('Recipe name')).toHaveValue('Unfinished soup');
  await expect(page.getByAltText('Recipe photo preview')).toBeVisible();
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await expect(page.locator('.recipe-card')).toContainText('Unfinished soup');
});
