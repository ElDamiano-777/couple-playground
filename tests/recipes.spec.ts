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
    await a.getByRole('button', { name: '+ Add Recipe manually' }).click();
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
  await page.getByRole('button', { name: '+ Add Recipe manually' }).click();
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

test('imported recipes are reviewed, saved and shared, with a link-only fallback', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 844 } });
  const b = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  const json = { '@context': 'https://schema.org', '@graph': [{ '@type': ['Thing', 'Recipe'], name: 'Apple cake', recipeCategory: 'Dessert', prepTime: 'PT35M', image: ['https://example.com/cake.jpg'], recipeIngredient: ['2 apples', '100 g flour'], recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ '@type': 'HowToStep', text: 'Slice apples.' }, { '@type': 'HowToStep', text: 'Bake for 30 minutes.' }] }] }] };
  await a.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<html><script type="application/ld+json">${JSON.stringify(json)}</script></html>` }));
  try {
    await login(first, 'Masha'); await login(second, 'Damian'); await recipes(first);
    await first.getByRole('button', { name: 'Import from Link' }).click();
    await first.getByLabel('Recipe link').fill('https://example.com/apple-cake');
    await first.getByRole('button', { name: 'Preview recipe' }).click();
    await expect(first.getByRole('heading', { name: 'Review recipe' })).toBeVisible();
    await expect(first.getByLabel('Recipe name')).toHaveValue('Apple cake');
    await expect(first.getByLabel('Category', { exact: true })).toHaveValue('Desserts');
    await expect(first.getByLabel('Preparation time (minutes)')).toHaveValue('35');
    await expect(first.getByLabel('Ingredients')).toHaveValue('2 apples\n100 g flour');
    await expect(first.getByLabel('Instructions')).toHaveValue('Slice apples.\nBake for 30 minutes.');
    await expect(first.getByLabel('Photo link (optional)')).toHaveValue('https://example.com/cake.jpg');
    await first.getByLabel('Ingredients').fill('3 apples\n100 g flour');
    await first.getByRole('button', { name: 'Save recipe' }).click();
    await expect(first.locator('.recipe-card')).toContainText('Apple cake');
    await recipes(second); await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await second.locator('.recipe-card').filter({ hasText: 'Apple cake' }).click();
    await expect(second.locator('.recipe-detail')).toContainText('3 apples');
    await expect(second.locator('.recipe-detail')).toContainText('Bake for 30 minutes.');
    await expect(second.getByRole('link', { name: /Open Original Recipe/ })).toHaveAttribute('href', 'https://example.com/apple-cake');
    await expect(second.locator('.recipe-detail img')).toHaveAttribute('src', 'https://example.com/cake.jpg');
    await second.reload(); await recipes(second);
    await second.locator('.recipe-card').filter({ hasText: 'Apple cake' }).click();
    await expect(second.locator('.recipe-detail')).toContainText('3 apples');
    await first.getByRole('button', { name: 'Import from Link' }).click();
    await first.getByLabel('Recipe link').fill('https://www.instagram.com/p/example/');
    await first.getByRole('button', { name: 'Preview recipe' }).click();
    await expect(first.getByLabel('Ingredients')).toHaveValue('');
    await expect(first.getByLabel('Instructions')).toHaveValue('');
    await expect(first.getByLabel('Original link')).toHaveValue('https://www.instagram.com/p/example/');
    await first.getByLabel('Recipe name').fill('Saved reel');
    await first.getByRole('button', { name: 'Save recipe' }).click();
    await first.locator('.recipe-card').filter({ hasText: 'Saved reel' }).click();
    await expect(first.getByRole('link', { name: /Open Original Recipe/ })).toHaveAttribute('href', 'https://www.instagram.com/p/example/');
    await expect(first.locator('.recipe-details-section')).toHaveCount(0);
    expect(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await a.close(); await b.close(); }
});

test('an unavailable recipe page keeps the link and never invents ingredients', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://example.com/unavailable');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Original link')).toHaveValue('https://example.com/unavailable');
  await expect(page.getByLabel('Ingredients')).toHaveValue('');
  await expect(page.getByLabel('Instructions')).toHaveValue('');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await expect(page.locator('.recipe-card')).toHaveCount(1);
});

test('Google result links use the linked recipe and private network URLs are rejected', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  let fetched = '';
  await context.route('https://r.jina.ai/**', route => {
    fetched = route.request().url();
    return route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: '<script type="application/ld+json">{"@type":"Recipe","name":"Result recipe","recipeIngredient":["1 pear"]}</script>' });
  });
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('http://127.0.0.1/private');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a public');
  expect(fetched).toBe('');
  const google = 'https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Frecipe';
  await page.getByLabel('Recipe link').fill(google);
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Result recipe');
  expect(fetched).toContain('https://r.jina.ai/https://example.com/recipe');
  await expect(page.getByLabel('Original link')).toHaveValue(google);
  await expect(page.getByLabel('Ingredients')).toHaveValue('1 pear');
});
