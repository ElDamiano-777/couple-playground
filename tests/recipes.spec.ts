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

test('recipe cards clamp long titles and hide missing cooking times', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await login(page, 'Masha'); await recipes(page);
  const title = 'A very long recipe title that stays balanced on a small iPhone recipe card without pushing every other card out of shape';
  await page.getByRole('button', { name: '+ Add Recipe manually' }).click();
  await page.getByLabel('Recipe name').fill(title);
  await page.getByRole('button', { name: 'Save recipe' }).click();
  const card = page.locator('.recipe-card').filter({ hasText: title });
  await expect(card.locator('small')).toHaveCount(0);
  await expect(card.locator('strong')).toHaveCSS('-webkit-line-clamp', '4');
});

test('imported recipes are reviewed, saved and shared, with a link-only fallback', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 844 } });
  const b = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  const json = { '@context': 'https://schema.org', '@graph': [{ '@type': ['Thing', 'Recipe'], name: 'Apple cake', recipeCategory: 'Dessert', prepTime: 'PT35M', image: ['https://example.com/cake.jpg'], recipeIngredient: ['2 apples', '100 g flour'], recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ '@type': 'HowToStep', text: 'Slice apples.' }, { '@type': 'HowToStep', text: 'Bake for 30 minutes.' }] }] }] };
  await a.route('https://r.jina.ai/**', route => route.request().url().includes('instagram.com') ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<html><script type="application/ld+json">${JSON.stringify(json)}</script></html>` }));
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
    await first.getByRole('button', { name: 'Continue without description' }).click();
    await expect(first.getByLabel('Ingredients')).toHaveValue('');
    await expect(first.getByLabel('Instructions')).toHaveValue('');
    await expect(first.getByLabel('Original link')).toHaveValue('https://www.instagram.com/p/example/');
    await first.getByLabel('Recipe name').fill('Saved reel');
    await first.getByRole('button', { name: 'Save recipe' }).click();
    await first.locator('.recipe-card').filter({ hasText: 'Saved reel' }).click();
    await expect(first.getByRole('link', { name: /Open Original/ })).toHaveAttribute('href', 'https://www.instagram.com/p/example/');
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

test('recipe details separate ingredients, notes and steps and add chosen items to shared shopping', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 740 } });
  const b = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  const json = { '@type': 'Recipe', name: 'Berry bake', recipeCategory: 'Dessert', prepTime: 'PT15M', recipeYield: '4 servings', recipeNotes: 'Serve warm.', recipeIngredient: ['• 1½ cups flour', '2 tbsp butter (or olive oil)', 'Notes: Use fresh berries.'], recipeInstructions: [{ text: '1. Mix ingredients.' }, { text: 'Step 2: Bake until golden.' }] };
  await a.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<script type="application/ld+json">${JSON.stringify(json)}</script>` }));
  try {
    await login(first, 'Masha'); await login(second, 'Damian'); await recipes(first);
    await first.getByRole('button', { name: 'Import from Link' }).click();
    await first.getByLabel('Recipe link').fill('https://example.com/berry-bake');
    await first.getByRole('button', { name: 'Preview recipe' }).click();
    await expect(first.getByLabel('Servings or yield (optional)')).toHaveValue('4 servings');
    await expect(first.getByLabel('Notes (optional)')).toHaveValue('Serve warm.');
    await first.getByRole('button', { name: 'Save recipe' }).click();
    await first.locator('.recipe-card').filter({ hasText: 'Berry bake' }).click();
    const detail = first.locator('.recipe-detail');
    await expect(detail).toContainText('Yield: 4 servings');
    await expect(detail.locator('.recipe-ingredient')).toHaveCount(2);
    await expect(detail.locator('.recipe-ingredient').nth(0)).toContainText('1½ cups');
    await expect(detail.locator('.recipe-ingredient').nth(0)).toContainText('flour');
    await expect(detail.locator('.recipe-ingredient').nth(1)).toContainText('2 tbsp');
    await expect(detail.locator('.recipe-notes')).toContainText('Serve warm.');
    await expect(detail.locator('.recipe-notes')).toContainText('butter: or olive oil');
    await expect(detail.locator('.recipe-notes')).toContainText('Use fresh berries.');
    await expect(detail.locator('.recipe-steps li')).toHaveCount(2);
    await expect(detail.locator('.recipe-steps li').nth(0)).toContainText('Mix ingredients.');
    await expect(detail.locator('.recipe-steps li').nth(1)).toContainText('Bake until golden.');
    const cooking = detail.locator('.recipe-ingredient').first().getByRole('checkbox');
    await cooking.check(); await expect(cooking).toBeChecked();
    await detail.getByRole('button', { name: '+ Add ingredients to Shopping' }).click();
    const sheet = first.getByRole('dialog', { name: 'Add to Shopping' });
    await expect(sheet.getByRole('checkbox')).toHaveCount(2);
    const modal = await sheet.evaluate(element => {
      const dialog = element.getBoundingClientRect();
      const action = element.querySelector('.recipe-shopping-footer')!.getBoundingClientRect();
      const list = element.querySelector('.recipe-shopping-list')!;
      const title = element.querySelector('h2')!.getBoundingClientRect();
      const close = element.querySelector('.recipe-shopping-title-row button')!.getBoundingClientRect();
      const subtitle = element.querySelector('.recipe-shopping-head p')!.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      return { top: dialog.top, right: dialog.right, bottom: dialog.bottom, actionBottom: action.bottom, height: dialog.height, viewport: innerHeight, listOverflow: getComputedStyle(list).overflowY, title, close, subtitle, listTop: listBox.top };
    });
    expect(modal.top).toBeGreaterThanOrEqual(0);
    expect(modal.bottom).toBeLessThanOrEqual(modal.viewport);
    expect(modal.actionBottom).toBeLessThanOrEqual(modal.viewport);
    expect(modal.height).toBeLessThanOrEqual(modal.viewport);
    expect(modal.listOverflow).toBe('auto');
    expect(modal.title.height).toBeLessThan(32);
    expect(Math.abs(modal.title.top - modal.close.top)).toBeLessThan(8);
    expect(modal.close.right).toBeLessThanOrEqual(modal.right);
    expect(modal.subtitle.top).toBeGreaterThan(modal.title.bottom);
    expect(modal.listTop - modal.subtitle.bottom).toBeLessThan(24);
    await sheet.locator('.recipe-ingredient').filter({ hasText: 'flour' }).getByRole('checkbox').uncheck();
    await expect(sheet.locator('.recipe-ingredient').filter({ hasText: 'flour' }).locator('.recipe-ingredient-name')).toHaveCSS('text-decoration-line', 'none');
    const failShopping = '**/rest/v1/shopping_items*';
    await a.route(failShopping, route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { message: 'Synthetic failure' } }) : route.fallback());
    await sheet.getByRole('button', { name: 'Add 1 item' }).click();
    await expect(sheet.getByRole('alert')).toContainText('couldn’t complete');
    await expect(sheet.locator('.recipe-ingredient').filter({ hasText: 'butter' }).getByRole('checkbox')).toBeChecked();
    await a.unroute(failShopping);
    await sheet.getByRole('button', { name: 'Add 1 item' }).click();
    await expect(sheet).toHaveCount(0);
    await expect(detail.getByRole('status')).toContainText('1 ingredient added');
    await expect(cooking).toBeChecked();
    await detail.getByRole('link', { name: /Open Original/ }).scrollIntoViewIfNeeded();
    const geometry = await first.evaluate(() => {
      const link = document.querySelector('.recipe-original')!.getBoundingClientRect();
      const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect();
      return { bottom: link.bottom, navTop: nav.top, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.navTop);
    await mainNavigation(second).getByRole('button', { name: 'Us', exact: true }).click();
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    const row = second.locator('.us-shopping-item').filter({ hasText: 'butter' });
    await expect(row).toContainText('Home');
    await expect(row).toContainText('2 tbsp');
    await expect(row).toContainText('or olive oil');
    await expect(second.locator('.us-shopping-item').filter({ hasText: 'flour' })).toHaveCount(0);
    await second.reload(); await recipes(second);
    await second.locator('.recipe-card').filter({ hasText: 'Berry bake' }).click();
    await expect(second.locator('.recipe-detail')).toContainText('4 servings');
    await expect(second.locator('.recipe-notes')).toContainText('Serve warm.');
  } finally { await a.close(); await b.close(); }
});

test('public Instagram metadata and captions are saved without inventing details', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<html><head><meta property="og:title" content="Berry toast"><meta content="https://images.example.com/toast.jpg" property="og:image"><meta property="og:description" content="Breakfast ideas&#10;Ingredients:&#10;2 slices bread&#10;1 cup berries&#10;Method:&#10;Toast the bread.&#10;Add berries."></head></html>` }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('Try this https://www.instagram.com/reel/Example123/?igsh=abc');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Berry toast');
  await expect(page.getByLabel('Photo link (optional)')).toHaveValue('https://images.example.com/toast.jpg');
  await expect(page.getByLabel('Original caption (optional)')).toContainText('Breakfast ideas');
  await expect(page.getByLabel('Ingredients')).toHaveValue('2 slices bread\n1 cup berries');
  await expect(page.getByLabel('Instructions')).toHaveValue('Toast the bread.\nAdd berries.');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await page.locator('.recipe-card').filter({ hasText: 'Berry toast' }).click();
  await expect(page.locator('.recipe-caption')).toHaveCount(0);
  await expect(page.locator('.recipe-notes')).toContainText('Breakfast ideas');
  const link = page.getByRole('link', { name: /Open Original/ });
  await expect(link).toHaveAttribute('href', 'https://www.instagram.com/reel/Example123/?igsh=abc');
  await expect(link).not.toHaveAttribute('target', '_blank');
  await page.reload(); await recipes(page); await page.locator('.recipe-card').filter({ hasText: 'Berry toast' }).click();
  await expect(page.locator('.recipe-caption')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit Berry toast' }).click();
  await expect(page.getByLabel('Original caption (optional)')).toHaveValue(/1 cup berries/);
});

test('TikTok metadata and shortened links work when public details are available', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await context.route('https://www.tiktok.com/oembed**', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, json: { title: 'Quick toast\nIngredients:\n2 eggs\nMethod:\nCook eggs.', thumbnail_url: 'https://images.example.com/toast.jpg' } }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://vt.tiktok.com/short123/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Quick toast');
  await expect(page.getByLabel('Ingredients')).toHaveValue('2 eggs');
  await expect(page.getByLabel('Instructions')).toHaveValue('Cook eggs.');
  await expect(page.getByLabel('Original link')).toHaveValue('https://vt.tiktok.com/short123/');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await page.locator('.recipe-card').filter({ hasText: 'Quick toast' }).click();
  const link = page.getByRole('link', { name: /Open Original/ });
  await expect(link).toHaveAttribute('href', 'https://vt.tiktok.com/short123/');
  await expect(link).not.toHaveAttribute('target', '_blank');
});

test('repeated instructions are displayed once while saved text stays unchanged', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const json = { '@type': 'Recipe', name: 'Simple toast', recipeInstructions: [{ text: 'Toast bread.' }, { text: 'Add berries.' }, { text: 'Toast bread.' }, { text: 'Add berries.' }] };
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<script type="application/ld+json">${JSON.stringify(json)}</script>` }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://example.com/toast');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await page.locator('.recipe-card').filter({ hasText: 'Simple toast' }).click();
  await expect(page.locator('.recipe-steps li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Edit Simple toast' }).click();
  await expect(page.getByLabel('Instructions')).toHaveValue('Toast bread.\nAdd berries.\nToast bread.\nAdd berries.');
});

test('a shared link survives sign-in and opens the import form prefilled', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const shared = 'https://www.instagram.com/reel/Shared123/';
  await page.goto(`./?share_text=${encodeURIComponent(`Try this! ${shared}`)}`);
  await page.getByRole('button', { name: 'Masha', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Recipe link')).toHaveValue(shared);
  await expect(page.getByText('On iPhone, choose Share → Copy Link, then paste it here.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Recipe link')).toHaveValue(shared);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('together.recipe-share'))).toBeNull();
  expect(new URL(page.url()).searchParams.has('share_text')).toBe(false);
  const manifest = await (await page.request.get('./manifest.webmanifest')).json();
  expect(manifest.share_target.params.url).toBe('share_url');
  await page.goto(`./?share_url=${encodeURIComponent(shared)}`);
  await expect(page.getByLabel('Recipe link')).toHaveValue(shared);
});

test('a shortened TikTok link imports public reader metadata and keeps the original link', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const requests: string[] = [];
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Title: TikTok\nURL Source: https://vt.tiktok.com/short123/\nFinal URL: https://www.tiktok.com/@cook/video/123456?tracking=1\n\nMarkdown Content:\n![Image 1: Quick soup\nIngredients:\n1 carrot\nMethod:\nCook gently.](https://images.example.com/soup.jpg)' }));
  await context.route('https://www.tiktok.com/oembed**', route => { requests.push(route.request().url()); return route.fulfill({ status: 400, json: { message: 'Unavailable' } }); });
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://vt.tiktok.com/short123/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Quick soup');
  await expect(page.getByLabel('Photo link (optional)')).toHaveValue('https://images.example.com/soup.jpg');
  await expect(page.getByLabel('Ingredients')).toHaveValue('1 carrot');
  await expect(page.getByLabel('Instructions')).toHaveValue('Cook gently.');
  await expect(page.getByLabel('Original link')).toHaveValue('https://vt.tiktok.com/short123/');
  expect(requests.some(request => new URL(request).searchParams.get('url') === 'https://www.tiktok.com/@cook/video/123456')).toBe(true);
});

test('the paste button accepts a copied message containing a recipe link', async ({ page, context }) => {
  test.setTimeout(60000);
  const server = transport(); await server.attach(context);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => 'Try this recipe: https://vm.tiktok.com/Example123/' }, configurable: true }); });
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByRole('button', { name: 'Paste copied link' }).click();
  await expect(page.getByLabel('Recipe link')).toHaveValue('https://vm.tiktok.com/Example123/');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => { throw new Error('Permission denied'); } }, configurable: true }); });
  await page.getByRole('button', { name: 'Paste copied link' }).click();
  await expect(page.getByRole('alert')).toContainText('Touch and hold');
});

test('a social caption becomes a shared recipe without repeated description or required optional fields', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 844 } });
  const b = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  const caption = 'Домашние оладьи&#10;Ингредиенты:&#10;200 г муки&#10;2 яйца&#10;100 мл молока&#10;Способ приготовления:&#10;1. Смешайте продукты.&#10;2. Обжарьте до готовности.&#10;Советы: Подавайте тёплыми.';
  await a.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<meta property="og:title" content="Домашние оладьи"><meta property="og:image" content="https://images.example.com/pancakes.jpg"><meta property="og:description" content="${caption}">` }));
  try {
    await login(first, 'Masha'); await login(second, 'Damian'); await recipes(first);
    await first.getByRole('button', { name: 'Import from Link' }).click();
    await first.getByLabel('Recipe link').fill('https://www.threads.net/@cook/post/Example');
    await first.getByRole('button', { name: 'Preview recipe' }).click();
    await expect(first.getByLabel('Recipe name')).toHaveValue('Домашние оладьи');
    await expect(first.getByLabel('Ingredients')).toHaveValue('200 г муки\n2 яйца\n100 мл молока');
    await expect(first.getByLabel('Instructions')).toHaveValue('1. Смешайте продукты.\n2. Обжарьте до готовности.');
    await expect(first.getByLabel('Category', { exact: true })).toHaveValue('');
    await expect(first.getByLabel('Preparation time (minutes)')).toHaveValue('');
    await expect(first.getByRole('button', { name: 'Save recipe' })).toBeEnabled();
    await first.getByRole('button', { name: 'Save recipe' }).click();
    await first.locator('.recipe-card').filter({ hasText: 'Домашние оладьи' }).click();
    await expect(first.locator('.recipe-ingredient')).toHaveCount(3);
    await expect(first.locator('.recipe-ingredient').first()).toContainText('200 г');
    await expect(first.locator('.recipe-steps li')).toHaveCount(2);
    await expect(first.locator('.recipe-caption')).toHaveCount(0);
    await expect(first.locator('.recipe-notes')).toContainText('Подавайте тёплыми.');
    await expect(first.getByRole('link', { name: /Open Original/ })).toHaveAttribute('href', 'https://www.threads.net/@cook/post/Example');
    await recipes(second); await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await second.locator('.recipe-card').filter({ hasText: 'Домашние оладьи' }).click();
    await expect(second.locator('.recipe-ingredient')).toHaveCount(3);
    await expect(second.locator('.recipe-steps li')).toHaveCount(2);
    await second.getByRole('button', { name: 'Edit Домашние оладьи' }).click();
    await expect(second.getByLabel('Original caption (optional)')).toHaveValue(/Ингредиенты:/);
  } finally { await a.close(); await b.close(); }
});

test('an ambiguous social caption stays available without invented ingredients', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const caption = 'Fruit bowl&#10;Ingredients:&#10;2 apples and 3 pears&#10;Method:&#10;Slice the fruit.';
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<meta property="og:title" content="Fruit bowl"><meta property="og:description" content="${caption}">` }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.instagram.com/p/example/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Ingredients')).toHaveValue('');
  await expect(page.getByLabel('Original caption (optional)')).toHaveValue(/2 apples and 3 pears/);
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await page.locator('.recipe-card').filter({ hasText: 'Fruit bowl' }).click();
  await expect(page.locator('.recipe-ingredient')).toHaveCount(0);
  await page.getByText('Original caption or description').click();
  await expect(page.locator('.recipe-caption')).toContainText('2 apples and 3 pears');
  await expect(page.getByRole('link', { name: /Open Original/ })).toHaveAttribute('href', 'https://www.instagram.com/p/example/');
});

test('TikTok image links cannot be saved as the original post', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await context.route('https://www.tiktok.com/oembed**', route => route.fulfill({ status: 400, json: { message: 'Unavailable' } }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  const image = 'https://p19-common-sign.tiktokcdn-us.com/path/photo.image?x-expires=123';
  await page.getByLabel('Recipe link').fill(image);
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByRole('alert')).toContainText('not a photo link');
  await page.getByLabel('Recipe link').fill(`${image} Recipe: https://vt.tiktok.com/post123/`);
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Original link')).toHaveValue('https://vt.tiktok.com/post123/');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await page.locator('.recipe-card').first().click();
  await expect(page.getByRole('link', { name: /Open Original/ })).toHaveAttribute('href', 'https://vt.tiktok.com/post123/');
});

test('a public TikTok photo is kept in the shared recipe and is never used as the original link', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 844 } });
  const b = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  const original = 'https://vt.tiktok.com/real-post/';
  const image = 'https://p19-common-sign.tiktokcdn-us.com/path/food.image?x-expires=123';
  const body = `Title: TikTok\nURL Source: ${original}\nFinal URL: https://www.tiktok.com/@cook/video/123\n\nMarkdown Content:\n![Image 1: Quick soup Ingredients: 1 carrot Method: Cook gently.](${image})\n\n[Video 1](blob:https://www.tiktok.com/123)\n\n[Cook](https://www.tiktok.com/@cook) · 2026-01-01\n\nQuick soup  \n  \nIngredients:  \n1 carrot  \n  \nMethod:  \n1. Cook gently.\n\nmore\n\nSee translation`;
  await a.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' }, body }));
  await a.route('https://www.tiktok.com/oembed**', route => route.fulfill({ status: 400, json: { message: 'Unavailable' } }));
  await a.route('https://p19-common-sign.tiktokcdn-us.com/**', route => route.fulfill({ status: 200, path: 'public/icons/icon-192.png', contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }));
  try {
    await login(first, 'Masha'); await login(second, 'Damian'); await recipes(first);
    await first.getByRole('button', { name: 'Import from Link' }).click();
    await first.getByLabel('Recipe link').fill(original);
    await first.getByRole('button', { name: 'Preview recipe' }).click();
    await expect(first.getByLabel('Ingredients')).toHaveValue('1 carrot');
    await expect(first.getByLabel('Instructions')).toHaveValue('1. Cook gently.');
    await expect(first.getByAltText('Recipe photo preview')).toBeVisible();
    const source = await first.getByAltText('Recipe photo preview').getAttribute('src');
    expect(source).toMatch(/^data:image\/jpeg;base64,/);
    await first.getByRole('button', { name: 'Save recipe' }).click();
    await recipes(second); await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    const card = second.locator('.recipe-card').filter({ hasText: 'Quick soup' });
    await expect(card.locator('img')).toHaveAttribute('src', source!);
    await card.click();
    await expect(second.getByRole('link', { name: /Open Original/ })).toHaveAttribute('href', original);
    await second.reload(); await recipes(second);
    await expect(second.locator('.recipe-card').filter({ hasText: 'Quick soup' }).locator('img')).toHaveAttribute('src', source!);
  } finally { await a.close(); await b.close(); }
});

test('an existing TikTok image URL is retained but not presented as an original post', async ({ page, context }) => {
  const server = transport();
  const image = 'https://p19-common-sign.tiktokcdn-us.com/path/old.image?x-expires=123';
  server.seedLegacyRecipe('Older recipe', 'Keep this note', image);
  await server.attach(context); await login(page, 'Masha'); await recipes(page);
  await page.locator('.recipe-card').filter({ hasText: 'Older recipe' }).click();
  await expect(page.getByRole('link', { name: /Open Original/ })).toHaveCount(0);
  await expect(page.getByText('Original post link unavailable. Edit this recipe to add it.')).toBeVisible();
  await expect(page.locator('.recipe-notes')).toContainText('Keep this note');
  await page.getByRole('button', { name: 'Edit Older recipe' }).click();
  await expect(page.getByLabel('Original link')).toHaveValue(image);
});

test('an unavailable social photo does not block saving the recipe', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const image = 'https://scontent.cdninstagram.com/expired.jpg';
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<meta property="og:title" content="Easy soup"><meta property="og:image" content="${image}"><meta property="og:description" content="A warming soup.">` }));
  await context.route('https://scontent.cdninstagram.com/**', route => route.fulfill({ status: 403, headers: { 'Access-Control-Allow-Origin': '*' } }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.instagram.com/p/soup/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Easy soup');
  await expect(page.getByLabel('Photo link (optional)')).toHaveValue(image);
  await expect(page.getByAltText('Recipe photo preview', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await expect(page.locator('.recipe-card').filter({ hasText: 'Easy soup' })).toBeVisible();
});

test('a flattened caption with clear quantities and numbered steps is separated', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  const caption = 'Оладьи Ингредиенты: 2 яйца 200 г муки 100 мл молока Приготовление: 1. Смешайте продукты. 2. Обжарьте оладьи.';
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<meta property="og:title" content="Оладьи"><meta property="og:description" content="${caption}">` }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.threads.net/@cook/post/flattened');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Ingredients')).toHaveValue('2 яйца\n200 г муки\n100 мл молока');
  await expect(page.getByLabel('Instructions')).toHaveValue('1. Смешайте продукты.\n2. Обжарьте оладьи.');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await page.locator('.recipe-card').filter({ hasText: 'Оладьи' }).click();
  await expect(page.locator('.recipe-ingredient')).toHaveCount(3);
  await expect(page.locator('.recipe-steps li')).toHaveCount(2);
  await expect(page.locator('.recipe-caption')).toHaveCount(0);
});

test('a blocked Instagram post can be previewed from a copied description and shared with a gallery photo', async ({ browser }) => {
  test.setTimeout(120000);
  const server = transport();
  const a = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 320, height: 844 } });
  const b = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  await a.route('https://r.jina.ai/**', route => route.fulfill({ status: 403, body: 'Blocked' }));
  const original = 'https://www.instagram.com/reel/blocked123/';
  try {
    await login(first, 'Masha'); await login(second, 'Damian'); await recipes(first);
    await first.getByRole('button', { name: 'Import from Link' }).click();
    await first.getByLabel('Recipe link').fill(original);
    await first.getByRole('button', { name: 'Preview recipe' }).click();
    await expect(first.getByRole('alert')).toContainText('Instagram did not provide the full recipe');
    await expect(first.locator('.recipe-card')).toHaveCount(0);
    const caption = 'Рецепт: Оладьи с яблоком\nИнгредиенты:\n2 яйца\n200 г муки\n100 мл молока\nПриготовление:\n1. Смешайте продукты.\n2. Обжарьте оладьи.';
    await first.getByLabel('Post description').fill(caption);
    await first.getByRole('button', { name: 'Preview recipe' }).click();
    await expect(first.getByRole('heading', { name: 'Review recipe' })).toBeVisible();
    await expect(first.getByLabel('Recipe name')).toHaveValue('Оладьи с яблоком');
    await expect(first.getByLabel('Ingredients')).toHaveValue('2 яйца\n200 г муки\n100 мл молока');
    await expect(first.getByLabel('Instructions')).toHaveValue('1. Смешайте продукты.\n2. Обжарьте оладьи.');
    await expect(first.getByLabel('Original link')).toHaveValue(original);
    await expect(first.getByLabel('Recipe preview')).toContainText('200 г муки');
    await expect(first.locator('.recipe-card')).toHaveCount(0);
    await first.getByLabel('Recipe photo (optional)').setInputFiles('public/icons/icon-192.png');
    await expect(first.getByAltText('Recipe photo preview')).toBeVisible();
    const photo = await first.getByAltText('Recipe photo preview').getAttribute('src');
    await first.getByRole('button', { name: 'Save recipe' }).click();
    await recipes(second); await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    const card = second.locator('.recipe-card').filter({ hasText: 'Оладьи с яблоком' });
    await expect(card.locator('img')).toHaveAttribute('src', photo!);
    await card.click();
    await expect(second.locator('.recipe-ingredient')).toHaveCount(3);
    await expect(second.locator('.recipe-steps li')).toHaveCount(2);
    await expect(second.getByRole('link', { name: /Open Original/ })).toHaveAttribute('href', original);
    expect(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await a.close(); await b.close(); }
});

test('copied unlabelled captions are parsed only when the structure is clear', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 403, body: 'Blocked' }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.instagram.com/p/unlabelled/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByLabel('Post description').fill('Pancakes\n2 eggs\n200 g flour\n100 ml milk\n1. Mix everything.\n2. Cook in a pan.');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Pancakes');
  await expect(page.getByLabel('Ingredients')).toHaveValue('2 eggs\n200 g flour\n100 ml milk');
  await expect(page.getByLabel('Instructions')).toHaveValue('1. Mix everything.\n2. Cook in a pan.');
  await expect(page.getByLabel('Recipe preview').locator('li')).toHaveCount(5);
});

test('insufficient Instagram information is explained without a made-up title or automatic save', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 403, body: 'Blocked' }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.instagram.com/p/incomplete/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByLabel('Post description').fill('Ingredients:\n2 eggs\n100 g flour');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Some recipe details could not be recognized' })).toBeVisible();
  await expect(page.getByLabel('Recipe name')).toHaveValue('');
  await expect(page.getByLabel('Instructions')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Save recipe' })).toBeDisabled();
  await expect(page.locator('.recipe-card')).toHaveCount(0);
});

test('a copied Instagram description survives navigation and can be pasted with one tap', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 403, body: 'Blocked' }));
  const caption = 'Apple pancakes\nIngredients:\n2 eggs\n200 g flour\nMethod:\n1. Mix everything.\n2. Cook until golden.';
  await page.addInitScript(value => { Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => value }, configurable: true }); }, caption);
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.instagram.com/p/paste-test/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByRole('button', { name: 'Paste description' }).click();
  await expect(page.getByLabel('Post description')).toHaveValue(caption);
  await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click();
  await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await expect(page.getByLabel('Post description')).toHaveValue(caption);
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Apple pancakes');
  await expect(page.getByLabel('Ingredients')).toHaveValue('2 eggs\n200 g flour');
  await expect(page.getByLabel('Instructions')).toHaveValue('1. Mix everything.\n2. Cook until golden.');
});

test('available Instagram metadata stays in the preview when a description is pasted', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' }, body: '<meta property="og:title" content="Berry cake"><meta property="og:image" content="https://images.example.com/cake.jpg">' }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.instagram.com/p/metadata/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByLabel('Post description').fill('Ingredients:\n2 eggs\n100 g flour\nInstructions:\nMix and bake.');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Berry cake');
  await expect(page.getByLabel('Photo link (optional)')).toHaveValue('https://images.example.com/cake.jpg');
  await expect(page.getByLabel('Original link')).toHaveValue('https://www.instagram.com/p/metadata/');
  await expect(page.getByLabel('Ingredients')).toHaveValue('2 eggs\n100 g flour');
  await expect(page.getByLabel('Instructions')).toHaveValue('Mix and bake.');
});

test('a copied caption with an ingredient heading and numbered method is recognized', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 403, body: 'Blocked' }));
  await login(page, 'Masha'); await recipes(page);
  await page.getByRole('button', { name: 'Import from Link' }).click();
  await page.getByLabel('Recipe link').fill('https://www.instagram.com/reel/numbered/');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await page.getByLabel('Post description').fill('Recipe: Berry pancakes\nIngredients:\n2 eggs\n100 g flour\n1. Mix the ingredients.\n2. Cook in a pan.');
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Berry pancakes');
  await expect(page.getByLabel('Ingredients')).toHaveValue('2 eggs\n100 g flour');
  await expect(page.getByLabel('Instructions')).toHaveValue('1. Mix the ingredients.\n2. Cook in a pan.');
});

test('a shared Instagram link and copied caption survive navigation until the preview', async ({ page, context }) => {
  const server = transport(); await server.attach(context);
  await context.route('https://r.jina.ai/**', route => route.fulfill({ status: 403, body: 'Blocked' }));
  await login(page, 'Masha');
  const source = 'https://www.instagram.com/reel/shared-draft/';
  await page.goto(`./?share_url=${encodeURIComponent(source)}`);
  await expect(page.getByLabel('Recipe link')).toHaveValue(source);
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  const caption = 'Apple pancakes\nIngredients:\n2 eggs\n200 g flour\nMethod:\nMix and cook.';
  await page.getByLabel('Post description').fill(caption);
  await mainNavigation(page).getByRole('button', { name: 'More', exact: true }).click();
  await recipes(page);
  await expect(page.getByLabel('Post description')).toHaveValue(caption);
  await page.getByRole('button', { name: 'Preview recipe' }).click();
  await expect(page.getByLabel('Recipe name')).toHaveValue('Apple pancakes');
  await expect(page.getByLabel('Original link')).toHaveValue(source);
  expect(await page.evaluate(() => sessionStorage.getItem('together.recipe-share'))).toBeNull();
});
