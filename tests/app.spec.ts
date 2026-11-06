import { test, expect, type Page } from '@playwright/test';
import { mainNavigation, openHome, openChildren } from './navigation';

async function enterAs(page: Page, name: `Masha` | `Damian` = `Masha`) {
  await page.goto(`./`);
  await page.getByRole(`button`, { name, exact: true }).click();
  await openHome(page);
}

test(`personal welcome, navigation and narrow-screen layout work without script errors`, async ({ page }) => {
  const errors: string[] = [];
  page.on(`pageerror`, error => errors.push(error.message));
  await enterAs(page);
  await expect(page.getByRole(`heading`, { name: `Home.`, exact: true })).toBeVisible();
  await expect(page.locator(`html`)).toHaveAttribute(`lang`, `en`);
  await page.getByRole(`button`, { name: `Open settings`, exact: true }).click();
  await expect(page.getByRole(`heading`, { name: `Settings.`, exact: true })).toBeVisible();
  await expect(page.getByRole(`button`, { name: `Install PWA`, exact: true })).toBeVisible();
  await openHome(page);
  await expect(page.getByRole(`heading`, { name: `Home.`, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test(`local note persists after reload and is honestly labelled as local`, async ({ page }) => {
  await enterAs(page);
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await expect(page.getByText(`Only on this phone for now. Not shared with your partner yet.`)).toBeVisible();
  await page.getByRole(`button`, { name: `Add thought`, exact: true }).click();
  await page.getByLabel(`What would you like to remember?`).fill(`Synthetic test: walk by the sea`);
  await page.getByRole(`button`, { name: `Save thought` }).click();
  await expect(page.getByRole(`status`)).toHaveText(`Saved on this phone.`);
  await page.reload();
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await expect(page.getByText(`Synthetic test: walk by the sea`, { exact: true })).toBeVisible();
});

test(`storage failure keeps draft and does not claim success`, async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException(`Full`, `QuotaExceededError`); }; });
  await enterAs(page);
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await page.getByRole(`button`, { name: `Add thought`, exact: true }).click();
  await page.getByLabel(`What would you like to remember?`).fill(`Synthetic unsaved draft`);
  await page.getByRole(`button`, { name: `Save thought` }).click();
  await expect(page.getByRole(`status`)).toContainText(`We couldn’t save that`);
  await expect(page.getByLabel(`What would you like to remember?`)).toHaveValue(`Synthetic unsaved draft`);
  await expect(page.locator(`.saved-note`)).toHaveCount(0);
});

test(`unreadable saved data is not silently overwritten`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem(`ryadom.notes.v1`, `{bad json`));
  await enterAs(page);
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await expect(page.getByRole(`status`)).toContainText(`we won’t overwrite them`);
  await page.getByRole(`button`, { name: `Add thought`, exact: true }).click();
  await page.getByLabel(`What would you like to remember?`).fill(`New draft`);
  await expect(page.getByRole(`button`, { name: `Save thought` })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem(`ryadom.notes.v1`))).toBe(`{bad json`);
});

test(`notes render as text rather than executable markup`, async ({ page }) => {
  await enterAs(page);
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  const text = `<img src=x onerror="window.bad=true">`;
  await page.getByRole(`button`, { name: `Add thought`, exact: true }).click();
  await page.getByLabel(`What would you like to remember?`).fill(text);
  await page.getByRole(`button`, { name: `Save thought` }).click();
  await expect(page.locator(`.saved-note p`)).toHaveText(text);
  await expect(page.locator(`.saved-note img`)).toHaveCount(0);
});

test(`PWA manifest, icon files and exact release metadata are served from the project path`, async ({ request }) => {
  const manifestResponse = await request.get(`manifest.webmanifest`);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe(`standalone`);
  expect(manifest.lang).toBe(`en`);
  expect(manifest.start_url).toBe(`/couple-playground/`);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()[`content-type`]).toContain(`image/png`);
  }
  const version = await (await request.get(`version.json`)).json();
  expect(version.commit).toMatch(/^[0-9a-f]{40}$/);
  const sw = await request.get(`sw.js`);
  expect(sw.ok()).toBe(true);
  const worker = await sw.text();
  expect(worker).not.toContain(`skipWaiting`);
  expect(worker).toContain(`showNotification`);
  expect(worker).toContain(`notificationclick`);
});

test(`offline navigation has a clear fallback instead of a blank screen`, async ({ page, context }) => {
  await enterAs(page);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error(`Service worker not active`);
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole(`heading`, { name: `You’re offline` })).toBeVisible();
});

test(`update detection does not reload an unfinished draft`, async ({ page }) => {
  await page.route(`**/version.json*`, route => route.fulfill({ json: { commit: `f`.repeat(40) } }));
  await enterAs(page);
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await page.getByRole(`button`, { name: `Add thought`, exact: true }).click();
  await page.getByLabel(`What would you like to remember?`).fill(`Synthetic unfinished thought`);
  await expect(page.getByRole(`button`, { name: `Update`, exact: true })).toBeDisabled();
  await expect(page.getByLabel(`What would you like to remember?`)).toHaveValue(`Synthetic unfinished thought`);
});


test(`name choice is local, remembers the selection and can be changed`, async ({ page }) => {
  await page.goto(`./`);
  await expect(page.getByText(`Your name fills in the login. Shopping still needs your password.`)).toBeVisible();
  await page.getByRole(`button`, { name: `Damian`, exact: true }).click();
  await expect(page.getByText(`Hi, Damian`)).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Hi, Damian`)).toBeVisible();
  await expect(page.getByRole(`heading`, { name: `Home.`, exact: true })).toBeVisible();
  await page.getByRole(`button`, { name: `Open settings`, exact: true }).click();
  await page.getByRole(`button`, { name: `Change name` }).click();
  await page.getByRole(`button`, { name: `Masha`, exact: true }).click();
  await page.reload();
  await expect(page.getByText(`Hi, Masha`)).toBeVisible();
});

test(`older notes survive choosing a name`, async ({ page }) => {
  await page.goto(`./`);
  await page.evaluate(() => localStorage.setItem(`ryadom.notes.v1`, JSON.stringify([{ id: `old`, text: `Earlier thought`, createdAt: `2026-10-30T00:00:00.000Z` }])));
  await page.reload();
  await page.getByRole(`button`, { name: `Masha`, exact: true }).click();
  await page.reload();
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await expect(page.getByText(`Earlier thought`, { exact: true })).toBeVisible();
});

test(`unknown name prompts for a choice and storage failure still permits entry`, async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(`together.profile.v1`, `unknown`);
    Storage.prototype.setItem = () => { throw new DOMException(`Full`, `QuotaExceededError`); };
  });
  await page.goto(`./`);
  await expect(page.getByRole(`heading`, { name: `Who’s here?` })).toBeVisible();
  await page.getByRole(`button`, { name: `Masha`, exact: true }).click();
  await openHome(page);
  await expect(page.getByRole(`heading`, { name: `Home.`, exact: true })).toBeVisible();
  await expect(page.getByText(`We couldn’t save your name on this device. You can still use the app.`)).toBeVisible();
});

test(`bottom navigation and compact home sections remain usable on a narrow iPhone`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await enterAs(page);
  const nav = mainNavigation(page);
  const noOverflow = async (section = 'page') => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${section} must not create horizontal page overflow`).toBe(true);
  await expect(nav.getByRole(`button`)).toHaveText([`Home`, `Us`, `Shopping`, `Places`, `More`]);
  for (const button of await nav.getByRole(`button`).all()) {
    const box = await button.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= 320).toBe(true);
  }
  await nav.getByRole(`button`, { name: `Us`, exact: true }).click();
  await expect(page.getByRole(`heading`, { name: `Us.`, exact: true })).toBeVisible();
  await nav.getByRole(`button`, { name: `Home`, exact: true }).click();
  await expect(nav.getByRole(`button`, { name: `Home`, exact: true })).toHaveAttribute(`aria-current`, `page`);
  await expect(page.getByRole(`navigation`, { name: `Home sections` })).toHaveCount(0);
  await nav.getByRole(`button`, { name: `Shopping`, exact: true }).click();
  await expect(page.getByRole(`heading`, { name: `Shopping.`, exact: true })).toBeVisible();
  await expect(page.getByRole(`navigation`, { name: `Home sections` })).toHaveCount(0);
  await expect(page.getByLabel(`Username`, { exact: true })).toBeVisible();
  await openChildren(page);
  await page.getByRole(`button`, { name: `Sign in to Family`, exact: true }).click();
  await expect(page.getByLabel(`Username`, { exact: true })).toBeVisible();
  for (const name of [`Wishlist`, `Places`]) {
    if (name === `Wishlist`) { await nav.getByRole(`button`, { name: `Us`, exact: true }).click(); await page.getByRole(`button`, { name: /Wishlist/ }).click(); }
    else await nav.getByRole(`button`, { name, exact: true }).click();
    await expect(page.getByRole(`heading`, { name: `${name}.`, exact: true })).toBeVisible();
    await page.getByRole(`button`, { name: `Sign in through Shopping`, exact: true }).click();
    await expect(page.getByLabel(`Username`, { exact: true })).toBeVisible();
    await noOverflow(name);
  }
  await nav.getByRole(`button`, { name: `More`, exact: true }).click();
  await expect(page.getByRole(`heading`, { name: `More.`, exact: true })).toBeVisible();
  await page.locator(`.more-shortcuts`).getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await page.getByRole(`button`, { name: `Add thought`, exact: true }).click();
  await page.getByLabel(`What would you like to remember?`).fill(`Synthetic navigation draft`);
  await nav.getByRole(`button`, { name: `Us`, exact: true }).click();
  await nav.getByRole(`button`, { name: `More`, exact: true }).click();
  await page.locator(`.more-shortcuts`).getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await expect(page.getByLabel(`What would you like to remember?`)).toHaveValue(`Synthetic navigation draft`);
  await expect(nav.getByRole(`button`, { name: `More`, exact: true })).toHaveAttribute(`aria-current`, `page`);
  await page.getByRole(`button`, { name: `Example updates`, exact: true }).click();
  await expect(page.getByText(/Phone notifications aren’t connected yet/)).toBeVisible();
  await noOverflow();
});
