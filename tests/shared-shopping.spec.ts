import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { closeAddForm, mainNavigation, openHome, openShopping, openShoppingCategory } from "./navigation";

import { transport } from "./helpers/sharedTransport";
// Mock transport stays separate from service workers; real PWA coverage lives in app.spec.ts.
test.use({ serviceWorkers: `block` });
const invitation = `a`.repeat(64);

async function enterPersonalShopping(page: Page) {
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Masha`, exact: true }).click();
  await openShopping(page);
  await page
    .getByRole(`button`, { name: `Use a personal email account`, exact: true })
    .click();
}
async function signIn(page: Page, email: string) {
  await enterPersonalShopping(page);
  await page.getByLabel(`Your email`, { exact: true }).fill(email);
  await page
    .getByLabel(`Password`, { exact: true })
    .fill(`Synthetic-Password-Only-123`);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(
    page.getByRole(`button`, { name: `Create our home`, exact: true }),
  ).toBeVisible();
}

test(`two isolated signed-in browsers share additions, bought state and deletion, then sign out cleanly`, async ({
  browser,
}) => {
  const server = transport();
  const first = await browser.newContext({
    serviceWorkers: `block`,
    viewport: { width: 320, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const second = await browser.newContext({
    serviceWorkers: `block`,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await server.attach(first);
  await server.attach(second);
  const a = await first.newPage();
  const b = await second.newPage();
  try {
    await signIn(a, `alpha@example.test`);
    await a
      .getByRole(`button`, { name: `Create our home`, exact: true })
      .click();
    await a
      .getByRole(`button`, { name: `Create invitation code`, exact: true })
      .click();
    await expect(a.getByLabel(`Your private invitation code`)).toHaveValue(
      invitation,
    );
    await signIn(b, `beta@example.test`);
    await b.getByLabel(`Invitation code from your partner`).fill(invitation);
    await b.getByRole(`button`, { name: `Join our home`, exact: true }).click();
    await expect(a.locator(`.shopping-categories button`)).toHaveCount(3);
    await openShoppingCategory(a, `Kids`);
    await expect(a.getByRole(`heading`, { name: `Kids shopping` })).toBeVisible();
    expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await a.getByRole(`button`, { name: `← Shopping` }).click();
    await openShoppingCategory(a, `Home`);
    await openShoppingCategory(b, `Home`);
    await a.getByRole(`button`, { name: `Add purchase`, exact: true }).last().click();
    await b.getByRole(`button`, { name: `Add purchase`, exact: true }).last().click();
    await expect(b.getByLabel(`What do we need?`)).toBeVisible();
    await a.getByLabel(`What do we need?`).fill(`Synthetic apples`);
    await a.getByRole(`button`, { name: `Add purchase`, exact: true }).last().click();
    await expect(
      a.getByText(`Synthetic apples`, { exact: true }),
    ).toBeVisible();
    await a.getByText(`Synthetic apples`, { exact: true }).click();
    await expect(a.getByRole(`dialog`)).toContainText(`Category`);
    await expect(a.getByRole(`checkbox`, { name: /Synthetic apples/ })).not.toBeChecked();
    await a.getByRole(`button`, { name: `Close`, exact: true }).click();
    await closeAddForm(b);
    await b.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await expect(
      b.getByRole(`checkbox`, { name: /Synthetic apples/ }),
    ).toBeVisible();
    await b.getByRole(`checkbox`, { name: /Synthetic apples/ }).click();
    await b.getByText(`Purchased (1)`, { exact: true }).click();
    await expect(b.getByRole(`checkbox`, { name: `Return Synthetic apples to active list` })).toBeChecked();
    await a.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await a.getByText(`Purchased (1)`, { exact: true }).click();
    await expect(a.getByRole(`checkbox`, { name: `Return Synthetic apples to active list` })).toBeChecked();
    await b.getByRole(`button`, { name: `← Shopping` }).click();
    await openShoppingCategory(b, `Pets`);
    await b.getByRole(`button`, { name: `Add purchase`, exact: true }).click();
    await b.getByLabel(`What do we need?`).fill(`Synthetic pet food`);
    await b.locator(`form`).getByRole(`button`, { name: `Add purchase`, exact: true }).click();
    await expect(b.getByText(`Synthetic pet food`, { exact: true })).toBeVisible();
    await a.reload();
    await openShopping(a);
    await openShoppingCategory(a, `Pets`);
    await expect(a.getByText(`Synthetic pet food`, { exact: true })).toBeVisible();
    await a.getByRole(`button`, { name: `Edit Synthetic pet food` }).click();
    await a.getByLabel(`Item name`).fill(`Synthetic renamed pet food`);
    await a.getByLabel(`Category`, { exact: true }).selectOption(`Kids`);
    await a.getByRole(`button`, { name: `Save item` }).click();
    await b.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await expect(b.getByText(`Synthetic renamed pet food`, { exact: true })).toHaveCount(0);
    await b.getByRole(`button`, { name: `← Shopping` }).click();
    await openShoppingCategory(b, `Kids`);
    await expect(b.getByText(`Synthetic renamed pet food`, { exact: true })).toBeVisible();
    await b.getByRole(`button`, { name: `← Shopping` }).click();
    await openShoppingCategory(b, `Home`);
    b.once(`dialog`, dialog => dialog.accept());
    await b.getByRole(`button`, { name: `Remove Synthetic apples`, exact: true }).click();
    await expect(b.getByText(`Synthetic apples`, { exact: true })).toHaveCount(0);
    await a.getByRole(`button`, { name: `← Shopping` }).click();
    await openShoppingCategory(a, `Home`);
    await a.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await expect(a.getByText(`Synthetic apples`, { exact: true })).toHaveCount(0);
    await a.getByRole(`button`, { name: `Sign out`, exact: true }).click();
    await expect(a.getByLabel(`Username`, { exact: true })).toBeVisible();
    await expect(
      a.getByText(`Synthetic pet food`, { exact: true }),
    ).toHaveCount(0);
    await openHome(a);
    await expect(
      a.getByText(`Synthetic pet food`, { exact: true }),
    ).toHaveCount(0);
  } finally {
    await first.close();
    await second.close();
  }
});

test(`failed and offline saves preserve the draft; updates and navigation preserve unfinished shopping`, async ({
  page,
  context,
}) => {
  const server = transport();
  await server.attach(context);
  await page.route(`**/version.json*`, (route) =>
    route.fulfill({ json: { commit: `f`.repeat(40) } }),
  );
  await signIn(page, `alpha@example.test`);
  await page
    .getByRole(`button`, { name: `Create our home`, exact: true })
    .click();
  await openShoppingCategory(page, `Home`);
  await page.getByRole(`button`, { name: `Add purchase`, exact: true }).last().click();
  server.failNextSave();
  await page
    .getByLabel(`What do we need?`)
    .fill(`Synthetic unfinished purchase`);
  await page.getByRole(`button`, { name: `Add purchase`, exact: true }).last().click();
  await expect(page.getByRole(`alert`)).toContainText(`couldn’t complete`);
  await expect(page.getByLabel(`What do we need?`)).toHaveValue(
    `Synthetic unfinished purchase`,
  );
  await expect(
    page.getByRole(`button`, { name: `Update`, exact: true }),
  ).toBeDisabled();
  await mainNavigation(page).getByRole(`button`, { name: `Wishlist`, exact: true }).click();
  await expect(
    page.getByRole(`button`, { name: `Update`, exact: true }),
  ).toBeDisabled();
  await openShopping(page);
  await openShoppingCategory(page, `Home`);
  await page.getByRole(`button`, { name: `Add purchase`, exact: true }).last().click();
  await expect(page.getByLabel(`What do we need?`)).toHaveValue(
    `Synthetic unfinished purchase`,
  );
  await context.setOffline(true);
  await expect(
    page.locator(`form`).getByRole(`button`, { name: `Add purchase`, exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await expect(page.getByLabel(`What do we need?`)).toHaveValue(
    `Synthetic unfinished purchase`,
  );
});

test(`registration asks for email confirmation and never claims that the account is signed in`, async ({
  page,
  context,
}) => {
  await transport().attach(context);
  await enterPersonalShopping(page);
  await page
    .getByRole(`button`, {
      name: `I’m new here — create an account`,
      exact: true,
    })
    .click();
  await page
    .getByLabel(`Your email`, { exact: true })
    .fill(`alpha@example.test`);
  await page
    .getByLabel(`Password`, { exact: true })
    .fill(`Synthetic-Password-Only-123`);
  await page
    .getByRole(`button`, { name: `Create account`, exact: true })
    .click();
  await expect(page.getByRole(`status`)).toContainText(
    `Check your email and confirm your account`,
  );
  await expect(
    page.getByRole(`button`, { name: `Create our home`, exact: true }),
  ).toHaveCount(0);
});

test(`confirmation-mail setup failures explain the missing setup and preserve registration input`, async ({
  page,
  context,
}) => {
  const server = transport();
  server.failConfirmationMail();
  await server.attach(context);
  await enterPersonalShopping(page);
  await page
    .getByRole(`button`, {
      name: `I’m new here — create an account`,
      exact: true,
    })
    .click();
  await page
    .getByLabel(`Your email`, { exact: true })
    .fill(`alpha@example.test`);
  await page
    .getByLabel(`Password`, { exact: true })
    .fill(`Synthetic-Password-Only-123`);
  await page
    .getByRole(`button`, { name: `Create account`, exact: true })
    .click();
  await expect(page.getByRole(`alert`)).toContainText(
    `confirmation email couldn’t be sent`,
  );
  await expect(page.getByLabel(`Your email`, { exact: true })).toHaveValue(
    `alpha@example.test`,
  );
  await expect(
    page.getByRole(`button`, { name: `Create our home`, exact: true }),
  ).toHaveCount(0);
});
