import { expect, type BrowserContext } from "@playwright/test";
export const api = `https://lyewmhtufesdccisqmin.supabase.co`;
export const home = `10000000-0000-4000-8000-000000000001`;
export const invitation = `a`.repeat(64);
export const alpha = `00000000-0000-4000-8000-000000000001`;
export const pocMasha = `d0000000-0000-4000-8000-000000000001`;
export const pocDamian = `d0000000-0000-4000-8000-000000000002`;
export const pocHome = `d0000000-0000-4000-8000-000000000003`;
export const pocPassword = `test777`; // Synthetic browser fixture, not the hosted password.
export const beta = `00000000-0000-4000-8000-000000000002`;
type Row = {
  id: string;
  household_id: string;
  name: string;
  category: string;
  bought: boolean;
  created_by: string;
  created_at: string;
};

export function transport() {
  let members: string[] = [];
  let rows: Row[] = [];
  let codeUsed = false;
  let failSave = false;
  let failMail = false;
  const tokens = new Map<string, string>();
  const homeFor = (user?: string) =>
    user === pocMasha || user === pocDamian
      ? pocHome
      : user && members.includes(user)
        ? home
        : null;
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
        const isPoc =
          data.email === `masha@poc.together.invalid` ||
          data.email === `damian@poc.together.invalid`;
        if (isPoc && data.password !== pocPassword)
          return reply({ msg: `Invalid login credentials` }, 400);
        const id = isPoc
          ? data.email.startsWith(`masha@`)
            ? pocMasha
            : pocDamian
          : data.email === `alpha@example.test`
            ? alpha
            : beta;
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
            app_metadata: isPoc ? { together_poc: true } : {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        });
      }
      if (url.pathname === `/auth/v1/logout`)
        return route.fulfill({ status: 204 });
      if (url.pathname === `/auth/v1/signup`) {
        if (failMail)
          return reply(
            {
              msg: `Error sending confirmation email`,
              error_code: `email_address_not_authorized`,
            },
            400,
          );
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
        return reply(homeFor(user));
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
          homeFor(user) === pocHome
            ? [pocMasha, pocDamian].map((user_id) => ({ user_id }))
            : members.includes(user)
              ? members.map((user_id) => ({ user_id }))
              : [],
        );
      if (url.pathname === `/rest/v1/shopping_items`) {
        if (!homeFor(user)) return reply({ message: `Forbidden` }, 403);
        if (method === `GET`)
          return reply(
            rows.filter((row) => row.household_id === homeFor(user)),
          );
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
        const row = rows.find(
          (row) => row.id === id && row.household_id === homeFor(user),
        );
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
    failConfirmationMail: () => {
      failMail = true;
    },
  };
}
