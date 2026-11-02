import { test, expect, type Page } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation, openHome, openShopping } from './navigation';

test.use({ serviceWorkers: `block` });
type Kind = `recipe` | `wish` | `place`;
const copy = {
  recipe: { title: `Recipe name`, notes: `Recipe (optional)`, add: `Add recipe` },
  wish: { title: `Wish`, notes: `Note (optional)`, add: `Add wish` },
  place: { title: `Place name`, notes: `Address or note (optional)`, add: `Add place` },
};
async function openFolder(page: Page, kind: Kind) {
  if (kind === `recipe`) {
    await openHome(page);
    await page.getByRole(`button`, { name: `Recipes`, exact: true }).click();
  } else await mainNavigation(page).getByRole(`button`, { name: kind === `wish` ? `Wishlist` : `Places`, exact: true }).click();
}
async function login(page: Page, name: `Masha` | `Damian` = `Masha`) {
  await page.goto(`./`);
  await page.getByRole(`button`, { name, exact: true }).click();
  await page.getByLabel(`Password`, { exact: true }).fill(pocPassword);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByLabel(`What do we need?`)).toBeVisible();
}
async function refresh(page: Page) { await page.evaluate(() => window.dispatchEvent(new Event(`focus`))); }

test(`two separate phones save, edit and confirm deletion in recipes, wishlist and places`, async ({ browser }) => {
  const server = transport();
  const first = await browser.newContext({ serviceWorkers: `block`, viewport: { width: 320, height: 844 } });
  const second = await browser.newContext({ serviceWorkers: `block`, viewport: { width: 390, height: 844 } });
  await server.attach(first);
  await server.attach(second);
  const a = await first.newPage();
  const b = await second.newPage();
  try {
    await login(a);
    await login(b, `Damian`);
    for (const kind of [`recipe`, `wish`, `place`] as const) {
      const text = `Synthetic ${kind}`;
      const rawNotes = `<img src=x onerror="window.syntheticExecuted=true">\nSynthetic ${kind} notes`;
      await openFolder(a, kind);
      await a.getByLabel(copy[kind].title, { exact: true }).fill(text);
      await a.getByLabel(copy[kind].notes, { exact: true }).fill(rawNotes);
      await a.getByRole(`button`, { name: copy[kind].add, exact: true }).click();
      await expect(a.getByRole(`heading`, { name: text, exact: true })).toBeVisible();
      await expect(a.locator(`.collection-notes`)).toHaveText(rawNotes);
      await expect(a.locator(`.collection-list img`)).toHaveCount(0);
      await openFolder(b, kind);
      await refresh(b);
      await expect(b.getByRole(`heading`, { name: text, exact: true })).toBeVisible();
      await b.getByRole(`button`, { name: `Edit ${text}`, exact: true }).click();
      await b.locator(`#collection-edit-title`).fill(`${text} updated`);
      await b.locator(`#collection-edit-notes`).fill(`Synthetic revised notes\nSecond line`);
      await b.getByRole(`button`, { name: `Save changes`, exact: true }).click();
      await expect(b.getByRole(`heading`, { name: `${text} updated`, exact: true })).toBeVisible();
      await a.reload();
      await openFolder(a, kind);
      await expect(a.getByRole(`heading`, { name: `${text} updated`, exact: true })).toBeVisible();
      await expect(a.locator(`.collection-notes`)).toHaveText(`Synthetic revised notes\nSecond line`);
      expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      b.once(`dialog`, (dialog) => dialog.dismiss());
      await b.getByRole(`button`, { name: `Delete ${text} updated`, exact: true }).click();
      await expect(b.getByRole(`heading`, { name: `${text} updated`, exact: true })).toBeVisible();
      b.once(`dialog`, (dialog) => dialog.accept());
      await b.getByRole(`button`, { name: `Delete ${text} updated`, exact: true }).click();
      await expect(b.getByRole(`heading`, { name: `${text} updated`, exact: true })).toHaveCount(0);
      await refresh(a);
      await expect(a.getByRole(`heading`, { name: `${text} updated`, exact: true })).toHaveCount(0);
    }
  } finally { await first.close(); await second.close(); }
});

test(`failed saves and offline mode preserve per-folder drafts, edits and the update guard`, async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  await page.route(`**/version.json*`, (route) => route.fulfill({ json: { commit: `f`.repeat(40) } }));
  await login(page);
  await openFolder(page, `recipe`);
  await page.getByLabel(copy.recipe.title, { exact: true }).fill(`Synthetic unfinished recipe`);
  await page.getByLabel(copy.recipe.notes, { exact: true }).fill(`Synthetic recipe draft`);
  server.failNextEntrySave();
  await page.getByRole(`button`, { name: copy.recipe.add, exact: true }).click();
  await expect(page.getByRole(`alert`)).toContainText(`We couldn’t save`);
  await expect(page.getByRole(`heading`, { name: `Synthetic unfinished recipe`, exact: true })).toHaveCount(0);
  await expect(page.getByLabel(copy.recipe.title, { exact: true })).toHaveValue(`Synthetic unfinished recipe`);
  await expect(page.getByRole(`button`, { name: `Update`, exact: true })).toBeDisabled();
  for (const kind of [`wish`, `place`] as const) {
    await openFolder(page, kind);
    await page.getByLabel(copy[kind].title, { exact: true }).fill(`Synthetic ${kind} draft`);
    await page.getByLabel(copy[kind].notes, { exact: true }).fill(`Synthetic ${kind} note`);
  }
  await openFolder(page, `recipe`);
  await expect(page.getByLabel(copy.recipe.notes, { exact: true })).toHaveValue(`Synthetic recipe draft`);
  await context.setOffline(true);
  await expect(page.getByRole(`button`, { name: copy.recipe.add, exact: true })).toBeDisabled();
  await expect(page.locator(`.collection-page`).getByText(/You’re offline/)).toBeVisible();
  await context.setOffline(false);
  await page.getByRole(`button`, { name: copy.recipe.add, exact: true }).click();
  await expect(page.getByRole(`heading`, { name: `Synthetic unfinished recipe`, exact: true })).toBeVisible();
  await page.getByRole(`button`, { name: `Edit Synthetic unfinished recipe`, exact: true }).click();
  await page.locator(`#collection-edit-notes`).fill(`Synthetic unsaved edit`);
  server.failNextEntrySave();
  await page.getByRole(`button`, { name: `Save changes`, exact: true }).click();
  await expect(page.getByRole(`alert`)).toContainText(`We couldn’t save`);
  await openFolder(page, `wish`);
  await expect(page.getByLabel(copy.wish.title, { exact: true })).toHaveValue(`Synthetic wish draft`);
  await expect(page.getByLabel(copy.wish.notes, { exact: true })).toHaveValue(`Synthetic wish note`);
  await openFolder(page, `place`);
  await expect(page.getByLabel(copy.place.title, { exact: true })).toHaveValue(`Synthetic place draft`);
  await openFolder(page, `recipe`);
  await expect(page.locator(`#collection-edit-notes`)).toHaveValue(`Synthetic unsaved edit`);
  await expect(page.getByRole(`button`, { name: `Update`, exact: true })).toBeDisabled();
});

test(`a delayed old-account save cannot expose entries, drafts or success in the next home`, async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  const requests: string[] = [];
  page.on(`request`, (request) => { if (request.url().includes(`/folder_entries`)) requests.push(request.url()); });
  await page.goto(`./`);
  expect(requests).toHaveLength(0);
  await login(page);
  await openFolder(page, `wish`);
  await page.getByLabel(copy.wish.title, { exact: true }).fill(`Synthetic old account wish`);
  server.delayEntryWrites();
  const saving = page.waitForRequest((request) => request.url().includes(`/folder_entries`) && request.method() === `POST`);
  await page.getByRole(`button`, { name: copy.wish.add, exact: true }).click();
  await saving;
  await expect(page.getByRole(`button`, { name: `Saving…`, exact: true })).toBeDisabled();
  await openShopping(page);
  page.once(`dialog`, (dialog) => dialog.accept());
  await page.getByRole(`button`, { name: `Sign out`, exact: true }).click();
  await page.getByRole(`button`, { name: `Use a personal email account`, exact: true }).click();
  await page.getByLabel(`Your email`, { exact: true }).fill(`alpha@example.test`);
  await page.getByLabel(`Password`, { exact: true }).fill(`Synthetic-password-only`);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByRole(`button`, { name: `Create our home`, exact: true })).toBeVisible();
  const requestCount = requests.length;
  await openFolder(page, `wish`);
  await expect(page.getByRole(`button`, { name: `Connect home`, exact: true })).toBeVisible();
  expect(requests).toHaveLength(requestCount);
  await page.getByRole(`button`, { name: `Connect home`, exact: true }).click();
  await page.getByRole(`button`, { name: `Create our home`, exact: true }).click();
  await openFolder(page, `wish`);
  const response = page.waitForResponse((value) => value.url().includes(`/folder_entries`) && value.request().method() === `POST`);
  server.releaseEntryWrites();
  await response;
  await expect(page.getByRole(`heading`, { name: `This folder is empty for now.`, exact: true })).toBeVisible();
  await expect(page.getByText(`Synthetic old account wish`, { exact: true })).toHaveCount(0);
  await expect(page.getByText(`Added to your shared folder.`, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel(copy.wish.title, { exact: true })).toHaveValue(``);
});
