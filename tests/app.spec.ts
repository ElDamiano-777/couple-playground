import { test, expect } from '@playwright/test';

test(`personal welcome, navigation and narrow-screen layout work without script errors`, async ({ page }) => {
  const errors: string[] = [];
  page.on(`pageerror`, error => errors.push(error.message));
  await page.goto(`./`);
  await expect(page.getByRole(`heading`, { name: `Masheri!` })).toBeVisible();
  await expect(page.getByRole(`link`, { name: `Open ChatGPT`, exact: true })).toHaveAttribute(`href`, `https://chatgpt.com/codex/cloud`);
  await page.getByRole(`button`, { name: `А дальше — твоя идея`, exact: false }).click();
  await expect(page.getByRole(`heading`, { name: `Скажи своими словами` })).toBeVisible();
  await expect(page.getByText(`Можно по-русски, по-английски или по-немецки.`)).toBeVisible();
  await page.getByRole(`button`, { name: `Наше место`, exact: true }).click();
  await expect(page.getByRole(`heading`, { name: `Masheri!` })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test(`local note persists after reload and is honestly labelled as local`, async ({ page }) => {
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Заметки`, exact: true }).click();
  await expect(page.getByText(`Пока только на этом телефоне. Общего доступа ещё нет.`)).toBeVisible();
  await page.getByLabel(`Что хочется сохранить?`).fill(`Synthetic test: walk by the sea`);
  await page.getByRole(`button`, { name: `Сохранить мысль` }).click();
  await expect(page.getByRole(`status`)).toHaveText(`Сохранено на этом телефоне.`);
  await page.reload();
  await page.getByRole(`button`, { name: `Заметки`, exact: true }).click();
  await expect(page.getByText(`Synthetic test: walk by the sea`, { exact: true })).toBeVisible();
});

test(`storage failure keeps draft and does not claim success`, async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException(`Full`, `QuotaExceededError`); }; });
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Заметки`, exact: true }).click();
  await page.getByLabel(`Что хочется сохранить?`).fill(`Synthetic unsaved draft`);
  await page.getByRole(`button`, { name: `Сохранить мысль` }).click();
  await expect(page.getByRole(`status`)).toContainText(`Не получилось сохранить`);
  await expect(page.getByLabel(`Что хочется сохранить?`)).toHaveValue(`Synthetic unsaved draft`);
  await expect(page.locator(`.saved-note`)).toHaveCount(0);
});

test(`unreadable saved data is not silently overwritten`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem(`ryadom.notes.v1`, `{bad json`));
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Заметки`, exact: true }).click();
  await expect(page.getByRole(`status`)).toContainText(`не будем их перезаписывать`);
  await page.getByLabel(`Что хочется сохранить?`).fill(`New draft`);
  await expect(page.getByRole(`button`, { name: `Сохранить мысль` })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem(`ryadom.notes.v1`))).toBe(`{bad json`);
});

test(`notes render as text rather than executable markup`, async ({ page }) => {
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Заметки`, exact: true }).click();
  const text = `<img src=x onerror="window.bad=true">`;
  await page.getByLabel(`Что хочется сохранить?`).fill(text);
  await page.getByRole(`button`, { name: `Сохранить мысль` }).click();
  await expect(page.locator(`.saved-note p`)).toHaveText(text);
  await expect(page.locator(`.saved-note img`)).toHaveCount(0);
});

test(`PWA manifest, icon files and exact release metadata are served from the project path`, async ({ request }) => {
  const manifestResponse = await request.get(`manifest.webmanifest`);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe(`standalone`);
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
  expect(await sw.text()).not.toContain(`skipWaiting`);
});

test(`offline navigation has a clear fallback instead of a blank screen`, async ({ page, context }) => {
  await page.goto(`./`);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error(`Service worker not active`);
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole(`heading`, { name: `Скоро снова рядом` })).toBeVisible();
});

test(`update detection does not reload an unfinished draft`, async ({ page }) => {
  await page.route(`**/version.json*`, route => route.fulfill({ json: { commit: `f`.repeat(40) } }));
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Заметки`, exact: true }).click();
  await page.getByLabel(`Что хочется сохранить?`).fill(`Synthetic unfinished thought`);
  await expect(page.getByRole(`button`, { name: `Обновить`, exact: true })).toBeDisabled();
  await expect(page.getByLabel(`Что хочется сохранить?`)).toHaveValue(`Synthetic unfinished thought`);
});
