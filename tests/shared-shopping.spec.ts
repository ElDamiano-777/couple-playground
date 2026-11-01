import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// Synthetic browser integration transport. Database/RLS tests exercise real PostgreSQL separately.
const api = `https://lyewmhtufesdccisqmin.supabase.co`;
const home = `10000000-0000-4000-8000-000000000001`;
const invitation = `a`.repeat(64);
const alpha = `00000000-0000-4000-8000-000000000001`;
const beta = `00000000-0000-4000-8000-000000000002`;
type Row = {
  id: string;
  household_id: string;
  name: string;
  category: string;
  bought: boolean;
  created_by: string;
  created_at: string;
};

function transport() {
  let members: string[] = [];
  let rows: Row[] = [];
  let codeUsed = false;
  let failSave = false;
  const tokens = new Map<string, string>();
  async function attach(context: BrowserContext) {
    await context.route(`${api}/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const data = request.postDataJSON() || {};
      const user = tokens.get(
        request.headers()[`authorization`]?.replace(`Bearer `, ``),
      );
      const reply = (json: unknown, status = 200) =>
        route.fulfill({ status, json });
      if (url.pathname === `/auth/v1/token`) {
        const id = data.email === `alpha@example.test` ? alpha : beta;
        const expires = Math.floor(Date.now() / 1000) + 3600;
        const token = `${Buffer.from(JSON.stringify({ alg: `HS256`, typ: `JWT` })).toString(`base64url`)}.${Buffer.from(JSON.stringify({ sub: id, role: `authenticated`, aud: `authenticated`, exp: expires })).toString(`base64url`)}.synthetic-signature`;
        tokens.set(token, id);
        return reply({
          access_token: token,
          token_type: `bearer`,
          expires_in: 3600,
          expires_at: expires,
          refresh_token: `synthetic-refresh-${id}`,
          user: {
            id,
            email: data.email,
            aud: `authenticated`,
            role: `authenticated`,
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        });
      }
      if (url.pathname === `/auth/v1/logout`)
        return route.fulfill({ status: 204 });
      if (url.pathname === `/auth/v1/signup`) {
        expect(url.searchParams.get(`redirect_to`)).toBe(
          `https://eldamiano-777.github.io/couple-playground/`,
        );
        return reply({
          id: alpha,
          email: data.email,
          identities: [],
          aud: `authenticated`,
          created_at: new Date().toISOString(),
        });
      }
      if (!user) return reply({ message: `Unauthorized` }, 401);
      if (url.pathname.endsWith(`/rpc/current_household`))
        return reply(members.includes(user) ? home : null);
      if (url.pathname.endsWith(`/rpc/create_household`)) {
        members = [user];
        return reply(home);
      }
      if (url.pathname.endsWith(`/rpc/create_household_invitation`))
        return reply(invitation);
      if (url.pathname.endsWith(`/rpc/join_household`)) {
        if (
          data.invitation_code !== invitation ||
          codeUsed ||
          members.length !== 1
        )
          return reply({ message: `Invalid or expired invitation` }, 400);
        members.push(user);
        codeUsed = true;
        return reply(home);
      }
      if (url.pathname === `/rest/v1/household_members`)
        return reply(
          members.includes(user) ? members.map((user_id) => ({ user_id })) : [],
        );
      if (url.pathname === `/rest/v1/shopping_items`) {
        if (!members.includes(user))
          return reply({ message: `Forbidden` }, 403);
        if (method === `GET`) return reply(rows);
        if (method === `POST`) {
          if (failSave)
            return reply({ message: `Synthetic storage failure` }, 503);
          const row = {
            ...data,
            id: crypto.randomUUID(),
            created_by: user,
            created_at: new Date().toISOString(),
            bought: false,
          } as Row;
          rows = [row, ...rows];
          return reply(row, 201);
        }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``);
        const row = rows.find((row) => row.id === id);
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) {
          row.bought = data.bought;
          return reply(row);
        }
        if (method === `DELETE`) {
          rows = rows.filter((row) => row.id !== id);
          return reply({ id });
        }
      }
      return reply(
        { message: `Unexpected test request: ${url.pathname}` },
        500,
      );
    });
  }
  return {
    attach,
    failNextSave: () => {
      failSave = true;
    },
  };
}

async function openShopping(page: Page) {
  await page.goto(`./`);
  await page.getByRole(`button`, { name: `Masha`, exact: true }).click();
  await page.getByRole(`button`, { name: `Shopping`, exact: true }).click();
}
async function signIn(page: Page, email: string) {
  await openShopping(page);
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
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const second = await browser.newContext({
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
    await expect(b.getByLabel(`What do we need?`)).toBeVisible();
    await a.getByLabel(`What do we need?`).fill(`Synthetic apples`);
    await a.getByRole(`button`, { name: `Add purchase`, exact: true }).click();
    await expect(
      a.getByText(`Synthetic apples`, { exact: true }),
    ).toBeVisible();
    await b.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await expect(
      b.getByRole(`checkbox`, { name: /Synthetic apples/ }),
    ).toBeVisible();
    await b.getByRole(`checkbox`, { name: /Synthetic apples/ }).click();
    await expect(
      b.getByRole(`checkbox`, { name: /Synthetic apples/ }),
    ).toBeChecked();
    await a.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await expect(
      a.getByRole(`checkbox`, { name: /Synthetic apples/ }),
    ).toBeChecked();
    await b.getByLabel(`What do we need?`).fill(`Synthetic pet food`);
    await b.getByLabel(`For whom?`).selectOption(`Pets`);
    await b.getByRole(`button`, { name: `Add purchase`, exact: true }).click();
    await expect(
      b.getByText(`Synthetic pet food`, { exact: true }),
    ).toBeVisible();
    await a.reload();
    await a.getByRole(`button`, { name: `Shopping`, exact: true }).click();
    await expect(
      a.getByText(`Synthetic pet food`, { exact: true }),
    ).toBeVisible();
    b.once(`dialog`, (dialog) => dialog.accept());
    await b
      .getByRole(`button`, { name: `Remove Synthetic apples`, exact: true })
      .click();
    await expect(b.getByText(`Synthetic apples`, { exact: true })).toHaveCount(
      0,
    );
    await a.getByRole(`button`, { name: `Refresh`, exact: true }).click();
    await expect(a.getByText(`Synthetic apples`, { exact: true })).toHaveCount(
      0,
    );
    await a.getByRole(`button`, { name: `Sign out`, exact: true }).click();
    await expect(a.getByLabel(`Your email`, { exact: true })).toBeVisible();
    await expect(
      a.getByText(`Synthetic pet food`, { exact: true }),
    ).toHaveCount(0);
    await a.getByRole(`button`, { name: `Our home`, exact: true }).click();
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
  server.failNextSave();
  await page
    .getByLabel(`What do we need?`)
    .fill(`Synthetic unfinished purchase`);
  await page.getByRole(`button`, { name: `Add purchase`, exact: true }).click();
  await expect(page.getByRole(`alert`)).toContainText(`couldn’t complete`);
  await expect(page.getByLabel(`What do we need?`)).toHaveValue(
    `Synthetic unfinished purchase`,
  );
  await expect(
    page.getByRole(`button`, { name: `Update`, exact: true }),
  ).toBeDisabled();
  await page.getByRole(`button`, { name: `Plans`, exact: true }).click();
  await expect(
    page.getByRole(`button`, { name: `Update`, exact: true }),
  ).toBeDisabled();
  await page.getByRole(`button`, { name: `Shopping`, exact: true }).click();
  await expect(page.getByLabel(`What do we need?`)).toHaveValue(
    `Synthetic unfinished purchase`,
  );
  await context.setOffline(true);
  await expect(
    page.getByRole(`button`, { name: `Add purchase`, exact: true }),
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
  await openShopping(page);
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
