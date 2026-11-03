import { test, expect, type Page } from "@playwright/test";
import { closeAddForm, openShopping, openShoppingCategory } from "./navigation";
import { transport, pocPassword } from "./helpers/sharedTransport";

test.use({ serviceWorkers: `block` });

async function login(page: Page, name: `Masha` | `Damian`) {
  await page.goto(`./`);
  await page.getByRole(`button`, { name, exact: true }).click();
  await expect(page.getByLabel(`Username`, { exact: true })).toHaveValue(
    name.toLowerCase(),
  );
  await expect(page.getByLabel(`Password`, { exact: true })).toHaveValue(``);
  await page.getByLabel(`Password`, { exact: true }).fill(pocPassword);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await openShoppingCategory(page, `Home`);
  await page.getByRole(`button`, { name: `Add purchase`, exact: true }).click();
  await expect(page.getByLabel(`What do we need?`)).toBeVisible();
}

test(`named POC accounts require a password and share a ready-made list without email or invitation`, async ({
  browser,
}) => {
  const server = transport();
  const first = await browser.newContext({
    serviceWorkers: `block`,
    viewport: { width: 390, height: 844 },
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
    await login(a, `Masha`);
    await login(b, `Damian`);
    await expect(
      a.getByText(`Signed in as Masha · POC`, { exact: true }),
    ).toBeVisible();
    await expect(
      b.getByText(`Signed in as Damian · POC`, { exact: true }),
    ).toBeVisible();
    await expect(
      a.getByRole(`button`, { name: `Create our home`, exact: true }),
    ).toHaveCount(0);
    await expect(
      a.getByRole(`button`, { name: `Create invitation code`, exact: true }),
    ).toHaveCount(0);
    await expect(
      a.getByRole(`button`, { name: `Delete my account`, exact: true }),
    ).toHaveCount(0);
    await a.getByLabel(`What do we need?`).fill(`Synthetic POC shopping`);
    await a.locator(`form`).getByRole(`button`, { name: `Add purchase`, exact: true }).click();
    await expect(
      a.getByText(`Synthetic POC shopping`, { exact: true }),
    ).toBeVisible();
    await closeAddForm(b);
    await b.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await expect(
      b.getByRole(`checkbox`, { name: /Synthetic POC shopping/ }),
    ).toBeVisible();
    await b.getByRole(`checkbox`, { name: /Synthetic POC shopping/ }).click();
    await expect(b.getByRole(`checkbox`, { name: `Return Synthetic POC shopping to active list` })).toBeChecked();
    await a.reload();
    await openShopping(a);
    await openShoppingCategory(a, `Home`);
    await expect(a.getByRole(`checkbox`, { name: `Return Synthetic POC shopping to active list` })).toBeChecked();
    await a
      .getByRole(`button`, { name: `Help and settings`, exact: true })
      .click();
    await a.getByRole(`button`, { name: `Change name`, exact: true }).click();
    await a.getByRole(`button`, { name: `Damian`, exact: true }).click();
    await expect(a.getByLabel(`Username`, { exact: true })).toHaveValue(
      `damian`,
    );
    await expect(a.getByLabel(`Password`, { exact: true })).toHaveValue(``);
    await expect(
      a.getByText(`Synthetic POC shopping`, { exact: true }),
    ).toHaveCount(0);
  } finally {
    await first.close();
    await second.close();
  }
});

test(`wrong passwords and unknown usernames never unlock the shared list`, async ({
  page,
  context,
}) => {
  await transport().attach(context);
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Masha`, exact: true }).click();
  await page.getByLabel(`Password`, { exact: true }).fill(`wrong-seven`);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByRole(`alert`)).toContainText(
    `login and password don’t match`,
  );
  await expect(page.getByLabel(`What do we need?`)).toHaveCount(0);
  await page.getByLabel(`Username`, { exact: true }).fill(`unknown`);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByRole(`alert`)).toContainText(`Use masha or damian`);
  await expect(page.getByLabel(`What do we need?`)).toHaveCount(0);
  await page.getByLabel(`Username`, { exact: true }).fill(` DaMiAn `);
  await page.getByLabel(`Password`, { exact: true }).fill(pocPassword);
  await page.getByRole(`button`, { name: `Sign in`, exact: true }).click();
  await expect(page.getByText(`Hi, Damian`, { exact: true })).toBeVisible();
  await openShoppingCategory(page, `Home`);
  await page.getByRole(`button`, { name: `Add purchase`, exact: true }).click();
  await expect(page.getByLabel(`What do we need?`)).toBeVisible();
});
