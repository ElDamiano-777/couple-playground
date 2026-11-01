import { test, expect, type Page } from "@playwright/test";
import { transport, pocPassword, pocHome, pocMasha } from "./helpers/sharedTransport";

test.use({ serviceWorkers: `block` });
async function login(page: Page, name: `Masha` | `Damian` = `Masha`) {
  await page.goto(`./`);
  await page.getByRole(`button`, { name, exact: true }).click();
  await page.getByLabel(`Password`, { exact: true }).fill(pocPassword);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByLabel(`What do we need?`)).toBeVisible();
  await page.getByRole(`button`, { name: `Family`, exact: true }).click();
  await expect(page.getByLabel(`Child’s name`)).toBeVisible();
}
async function refresh(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event(`focus`)));
}

test(`renaming an existing pet preserves its previously typed animal type`, async ({ page, context }) => {
  await transport().attach(context);
  let saved = { id: `10000000-0000-4000-8000-000000000099`, household_id: pocHome, kind: `pet`, name: `Legacy test pet`, animal_type: `Small parrot`, created_by: pocMasha, created_at: new Date().toISOString() };
  await context.route(`**/rest/v1/family_profiles*`, route => {
    if (route.request().method() === `PATCH`) {
      const change = route.request().postDataJSON();
      expect(change.animal_type).toBe(`Small parrot`);
      saved = { ...saved, ...change };
      return route.fulfill({ json: saved });
    }
    return route.fulfill({ json: [saved] });
  });
  await login(page);
  await page.getByRole(`tab`, { name: `Pets`, exact: true }).click();
  await page.getByRole(`button`, { name: `Edit Legacy test pet`, exact: true }).click();
  await expect(page.getByLabel(`Pet type (optional)`).first()).toHaveValue(`Small parrot`);
  await page.getByLabel(`Name`, { exact: true }).fill(`Renamed test pet`);
  await page.getByRole(`button`, { name: `Save changes`, exact: true }).click();
  await expect(page.getByRole(`heading`, { name: `Renamed test pet`, exact: true })).toBeVisible();
  await expect(page.getByText(`Small parrot`, { exact: true })).toBeVisible();
});

test(`two separate phones share children and pets, edits and confirmed removals`, async ({ browser }) => {
  const server = transport();
  const first = await browser.newContext({ serviceWorkers: `block`, viewport: { width: 390, height: 844 } });
  const second = await browser.newContext({ serviceWorkers: `block`, viewport: { width: 390, height: 844 } });
  await server.attach(first);
  await server.attach(second);
  const a = await first.newPage();
  const b = await second.newPage();
  try {
    await login(a);
    await login(b, `Damian`);
    await expect(a.getByRole(`heading`, { name: `No children added yet` })).toBeVisible();
    await expect(a.getByText(/POC test space shared by both test accounts/)).toBeVisible();
    await a.getByLabel(`Child’s name`).fill(`Synthetic child`);
    await a.getByRole(`button`, { name: `Add child to our home` }).click();
    await expect(a.getByRole(`heading`, { name: `Synthetic child`, exact: true })).toBeVisible();
    await refresh(b);
    await expect(b.getByRole(`heading`, { name: `Synthetic child`, exact: true })).toBeVisible();
    await b.getByRole(`button`, { name: `Edit Synthetic child`, exact: true }).click();
    await b.getByLabel(`Name`, { exact: true }).fill(`Synthetic renamed child`);
    await b.getByRole(`button`, { name: `Save changes`, exact: true }).click();
    await expect(b.getByRole(`heading`, { name: `Synthetic renamed child`, exact: true })).toBeVisible();
    await refresh(a);
    await expect(a.getByRole(`heading`, { name: `Synthetic renamed child`, exact: true })).toBeVisible();
    await a.getByRole(`tab`, { name: `Pets`, exact: true }).click();
    await a.getByLabel(`Pet’s name`).fill(`Synthetic pet`);
    await a.getByLabel(`Pet type (optional)`).selectOption(`Cat`);
    await a.getByRole(`button`, { name: `Add pet to our home` }).click();
    await expect(a.getByRole(`heading`, { name: `Synthetic pet`, exact: true })).toBeVisible();
    await b.getByRole(`tab`, { name: `Pets`, exact: true }).click();
    await refresh(b);
    await expect(b.getByRole(`heading`, { name: `Synthetic pet`, exact: true })).toBeVisible();
    await b.getByRole(`button`, { name: `Edit Synthetic pet`, exact: true }).click();
    await expect(b.getByLabel(`Pet type (optional)`).first()).toHaveValue(`Cat`);
    await b.getByLabel(`Pet type (optional)`).first().selectOption(`Dog`);
    await b.getByRole(`button`, { name: `Save changes`, exact: true }).click();
    await refresh(a);
    await expect(a.getByText(`Dog`, { exact: true })).toBeVisible();
    let confirmations = 0;
    a.once(`dialog`, async (dialog) => { ++confirmations; await dialog.dismiss(); });
    await a.getByRole(`button`, { name: `Remove Synthetic pet`, exact: true }).click();
    await expect(a.getByRole(`heading`, { name: `Synthetic pet`, exact: true })).toBeVisible();
    a.once(`dialog`, async (dialog) => { ++confirmations; await dialog.accept(); });
    await a.getByRole(`button`, { name: `Remove Synthetic pet`, exact: true }).click();
    await expect(a.getByRole(`heading`, { name: `Synthetic pet`, exact: true })).toHaveCount(0);
    expect(confirmations).toBe(2);
    await refresh(b);
    await expect(b.getByRole(`heading`, { name: `Synthetic pet`, exact: true })).toHaveCount(0);
    await a.reload();
    await a.getByRole(`button`, { name: `Family`, exact: true }).click();
    await expect(a.getByRole(`heading`, { name: `Synthetic renamed child`, exact: true })).toBeVisible();
    expect(await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await first.close();
    await second.close();
  }
});

test(`failed saves, offline changes, tabs and navigation preserve family drafts and block updates`, async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  await page.route(`**/version.json*`, (route) => route.fulfill({ json: { commit: `f`.repeat(40) } }));
  await login(page);
  await page.getByLabel(`Child’s name`).fill(`Synthetic unfinished child`);
  server.failNextFamilySave();
  await page.getByRole(`button`, { name: `Add child to our home` }).click();
  await expect(page.getByRole(`alert`)).toContainText(`couldn’t save`);
  await expect(page.getByLabel(`Child’s name`)).toHaveValue(`Synthetic unfinished child`);
  await expect(page.getByRole(`heading`, { name: `Synthetic unfinished child`, exact: true })).toHaveCount(0);
  await expect(page.getByRole(`button`, { name: `Update`, exact: true })).toBeDisabled();
  await page.getByRole(`tab`, { name: `Pets`, exact: true }).click();
  await page.getByLabel(`Pet’s name`).fill(`Synthetic unfinished pet`);
  await page.getByRole(`button`, { name: `Plans`, exact: true }).click();
  await expect(page.getByRole(`button`, { name: `Update`, exact: true })).toBeDisabled();
  await page.getByRole(`button`, { name: `Family`, exact: true }).click();
  await expect(page.getByLabel(`Pet’s name`)).toHaveValue(`Synthetic unfinished pet`);
  await page.getByRole(`tab`, { name: `Kids`, exact: true }).click();
  await expect(page.getByLabel(`Child’s name`)).toHaveValue(`Synthetic unfinished child`);
  await context.setOffline(true);
  await expect(page.getByRole(`button`, { name: `Add child to our home` })).toBeDisabled();
  await expect(page.getByText(/You’re offline. Your unfinished text/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByLabel(`Child’s name`)).toHaveValue(`Synthetic unfinished child`);
  await page.getByRole(`button`, { name: `Add child to our home` }).click();
  await expect(page.getByRole(`heading`, { name: `Synthetic unfinished child`, exact: true })).toBeVisible();
  await page.getByRole(`button`, { name: `Edit Synthetic unfinished child`, exact: true }).click();
  await page.getByLabel(`Name`, { exact: true }).fill(`Synthetic failed rename`);
  server.failNextFamilySave();
  await page.getByRole(`button`, { name: `Save changes`, exact: true }).click();
  await expect(page.getByRole(`alert`)).toContainText(`couldn’t save`);
  await expect(page.getByLabel(`Name`, { exact: true })).toHaveValue(`Synthetic failed rename`);
});

test(`sign-out clears family drafts and a delayed old-household response cannot expose cards to a new account`, async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  await page.goto(`./`);
  expect(server.familyRequestCount()).toBe(0);
  await login(page);
  await page.getByLabel(`Child’s name`).fill(`Synthetic old home card`);
  await page.getByRole(`button`, { name: `Add child to our home` }).click();
  await expect(page.getByRole(`heading`, { name: `Synthetic old home card`, exact: true })).toBeVisible();
  await page.getByLabel(`Child’s name`).fill(`Synthetic private draft`);
  server.delayFamilyReads();
  const delayedRequest = page.waitForRequest((request) => request.url().includes(`/family_profiles`) && request.method() === `GET`);
  await refresh(page);
  await delayedRequest;
  await page.getByRole(`button`, { name: `Shopping`, exact: true }).click();
  page.once(`dialog`, (dialog) => dialog.accept());
  await page.getByRole(`button`, { name: `Sign out`, exact: true }).click();
  await page.getByRole(`button`, { name: `Use a personal email account`, exact: true }).click();
  await page.getByLabel(`Your email`, { exact: true }).fill(`alpha@example.test`);
  await page.getByLabel(`Password`, { exact: true }).fill(`Synthetic-password-only`);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByRole(`button`, { name: `Create our home`, exact: true })).toBeVisible();
  const requestsBeforeHome = server.familyRequestCount();
  server.releaseFamilyReads();
  await page.getByRole(`button`, { name: `Family`, exact: true }).click();
  await expect(page.getByRole(`button`, { name: `Connect our home` })).toBeVisible();
  await expect(page.getByText(`Synthetic old home card`, { exact: true })).toHaveCount(0);
  expect(server.familyRequestCount()).toBe(requestsBeforeHome);
  await page.getByRole(`button`, { name: `Connect our home` }).click();
  await page.getByRole(`button`, { name: `Create our home`, exact: true }).click();
  await page.getByRole(`button`, { name: `Family`, exact: true }).click();
  await expect(page.getByLabel(`Child’s name`)).toHaveValue(``);
  await expect(page.getByRole(`heading`, { name: `No children added yet` })).toBeVisible();
});


test(`a delayed save from a previous account cannot add a card or success message to the next home`, async ({ page, context }) => {
  const server = transport();
  await server.attach(context);
  await login(page);
  server.delayFamilyWrites();
  await page.getByLabel(`Child’s name`).fill(`Synthetic delayed card`);
  const saving = page.waitForRequest((request) => request.url().includes(`/family_profiles`) && request.method() === `POST`);
  await page.getByRole(`button`, { name: `Add child to our home` }).click();
  await saving;
  await expect(page.getByRole(`button`, { name: `Saving…` })).toBeDisabled();
  await page.getByRole(`button`, { name: `Shopping`, exact: true }).click();
  page.once(`dialog`, (dialog) => dialog.accept());
  await page.getByRole(`button`, { name: `Sign out`, exact: true }).click();
  await page.getByRole(`button`, { name: `Use a personal email account`, exact: true }).click();
  await page.getByLabel(`Your email`, { exact: true }).fill(`alpha@example.test`);
  await page.getByLabel(`Password`, { exact: true }).fill(`Synthetic-password-only`);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByRole(`button`, { name: `Create our home`, exact: true })).toBeVisible();
  await page.getByRole(`button`, { name: `Create our home`, exact: true }).click();
  await page.getByRole(`button`, { name: `Family`, exact: true }).click();
  const response = page.waitForResponse((value) => value.url().includes(`/family_profiles`) && value.request().method() === `POST`);
  server.releaseFamilyWrites();
  await response;
  await expect(page.getByRole(`heading`, { name: `No children added yet` })).toBeVisible();
  await expect(page.getByText(`Synthetic delayed card`, { exact: true })).toHaveCount(0);
  await expect(page.getByText(`Added to your shared family.`, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel(`Child’s name`)).toHaveValue(``);
});
