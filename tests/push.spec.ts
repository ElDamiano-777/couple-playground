import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { transport, pocPassword, api, pocMasha } from './helpers/sharedTransport';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test.use({ serviceWorkers: `block` });

async function device(context: BrowserContext, permission: `default` | `denied` = `default`) {
  await context.addInitScript(({ permission }) => {
    const state = { requests: 0, unsubscribes: 0, subscribed: false };
    Object.assign(window, { pushTest: state });
    Object.defineProperty(navigator, `standalone`, { value: true, configurable: true });
    Object.defineProperty(window, `PushManager`, { value: class {}, configurable: true });
    const notification = { permission, requestPermission: async () => {
      state.requests++;
      notification.permission = `granted`;
      return `granted`;
    } };
    Object.defineProperty(window, `Notification`, { value: notification, configurable: true });
    const subscription = {
      endpoint: `https://web.push.apple.com/synthetic-test`,
      toJSON: () => ({ endpoint: `https://web.push.apple.com/synthetic-test`, keys: { p256dh: `synthetic-key`, auth: `synthetic-auth` } }),
      unsubscribe: async () => { state.unsubscribes++; state.subscribed = false; return true; },
    };
    Object.defineProperty(navigator.serviceWorker, `getRegistration`, { configurable: true, value: async () => ({
      active: {},
      pushManager: { getSubscription: async () => state.subscribed ? subscription : null, subscribe: async () => { state.subscribed = true; return subscription; } },
    }) });
  }, { permission: permission as string });
}

async function login(page: Page) {
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Masha`, exact: true }).click();
  await page.getByLabel(`Password`, { exact: true }).fill(pocPassword);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByLabel(`What do we need?`)).toBeVisible();
}

async function pushApi(context: BrowserContext, ready = true, failRegistration = false) {
  const registrations: unknown[] = [];
  const removals: unknown[] = [];
  await context.route(`${api}/rest/v1/rpc/*push*`, route => {
    const request = route.request();
    expect(request.headers()[`authorization`]).toMatch(/^Bearer /);
    const name = new URL(request.url()).pathname.split(`/`).at(-1);
    if (name === `push_configuration`) return route.fulfill({ json: ready ? { publicKey: Buffer.alloc(65, 4).toString(`base64url`) } : null });
    if (name === `register_push_subscription`) {
      registrations.push(request.postDataJSON());
      return route.fulfill({ status: failRegistration ? 503 : 200, json: failRegistration ? { message: `Synthetic unavailable` } : `synthetic-device` });
    }
    removals.push(request.postDataJSON());
    return route.fulfill({ json: null });
  });
  return { registrations, removals };
}

test(`push needs an explicit gesture, registers this device, and revokes it before sign-out`, async ({ page, context }) => {
  await transport().attach(context);
  await device(context);
  const server = await pushApi(context);
  await login(page);
  const enable = page.getByRole(`button`, { name: `Enable notifications`, exact: true });
  await expect(enable).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { pushTest: { requests: number } }).pushTest.requests)).toBe(0);
  await enable.click();
  await expect(page.getByRole(`button`, { name: `Turn off notifications` })).toBeVisible();
  expect(server.registrations).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem(`together.push-owner.v1`))).toBe(pocMasha);
  await page.getByRole(`button`, { name: `Sign out`, exact: true }).click();
  await expect(page.getByRole(`button`, { name: `Sign in`, exact: true })).toBeVisible();
  expect(server.removals).toEqual([{ endpoint: `https://web.push.apple.com/synthetic-test` }]);
  expect(await page.evaluate(() => (window as unknown as { pushTest: { unsubscribes: number } }).pushTest.unsubscribes)).toBe(1);
});

test(`failed server registration rolls back the device subscription and never claims notifications are on`, async ({ page, context }) => {
  await transport().attach(context);
  await device(context);
  await pushApi(context, true, true);
  await login(page);
  await page.getByRole(`button`, { name: `Enable notifications`, exact: true }).click();
  await expect(page.getByText(`We couldn’t turn notifications on. Check your connection and try again.`)).toBeVisible();
  await expect(page.getByRole(`button`, { name: `Turn off notifications` })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { pushTest: { unsubscribes: number } }).pushTest.unsubscribes)).toBe(1);
});

test(`no sender and denied permission do not trigger a permission prompt`, async ({ page, context }) => {
  await transport().attach(context);
  await device(context, `denied`);
  await pushApi(context, false);
  await login(page);
  await expect(page.getByText(`Phone notifications aren’t ready yet. Your shopping list works as usual.`)).toBeVisible();
  await expect(page.getByRole(`button`, { name: `Enable notifications`, exact: true })).toHaveCount(0);
  await pushApi(context, true);
  await page.reload();
  await page.getByRole(`button`, { name: `Shopping`, exact: true }).click();
  await expect(page.getByRole(`button`, { name: `Enable notifications`, exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { pushTest: { requests: number } }).pushTest.requests)).toBe(0);
});

test(`push displays only generic activity and ignores attacker-controlled notification links`, async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const shown: Array<{ title: string; options: { body: string; data: { url: string }; tag: string } }> = [];
  let opened = ``;
  const sandbox = {
    BASE: `/couple-playground/`, URL,
    self: {
      location: { origin: `https://example.test` },
      addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
      registration: { showNotification: async (title: string, options: typeof shown[number][`options`]) => { shown.push({ title, options }); } },
      clients: { matchAll: async () => [], openWindow: async (url: string) => { opened = url; } },
    },
  };
  vm.runInNewContext(readFileSync(`scripts/push-worker.js`, `utf8`), sandbox);
  let done: Promise<unknown> = Promise.resolve();
  handlers.get(`push`)?.({ data: { json: () => ({ kind: `bought`, eventId: `event-123`, body: `private purchase`, url: `https://attacker.test` }) }, waitUntil: (promise: Promise<unknown>) => { done = promise; } });
  await done;
  expect(shown[0].options.body).toBe(`Your partner marked a purchase as bought.`);
  expect(shown[0].options.tag).toBe(`shopping-event-123`);
  handlers.get(`notificationclick`)?.({ notification: { close() {}, data: { url: `https://attacker.test` } }, waitUntil: (promise: Promise<unknown>) => { done = promise; } });
  await done;
  expect(opened).toBe(`https://example.test/couple-playground/?shopping=1`);
});

test(`opening a shopping notification preserves unfinished notes`, async ({ page, context }) => {
  await transport().attach(context);
  await pushApi(context, false);
  await login(page);
  await page.getByRole(`button`, { name: `Personal notes`, exact: true }).click();
  await page.getByLabel(`What would you like to remember?`).fill(`Synthetic unfinished note`);
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent(`message`, { data: { type: `OPEN_SHOPPING` } })));
  await expect(page.getByLabel(`What would you like to remember?`)).toHaveValue(`Synthetic unfinished note`);
  await page.getByRole(`button`, { name: `Save thought` }).click();
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent(`message`, { data: { type: `OPEN_SHOPPING` } })));
  await expect(page.getByLabel(`What do we need?`)).toBeVisible();
});
