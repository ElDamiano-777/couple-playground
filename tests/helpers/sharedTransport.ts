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
  type FamilyRow = {
    id: string; household_id: string; kind: string; name: string;
    animal_type: string | null; birth_date: string | null; created_by: string; created_at: string;
  };
  type EntryRow = { id: string; household_id: string; kind: string; title: string; notes: string; created_by: string; created_at: string; recipe_ingredients?: string; recipe_instructions?: string };
  let entryRows: EntryRow[] = [];
  let failEntrySave = false;
  let delayedEntryWrite: Promise<void> | null = null;
  let releaseEntryWrite: (() => void) | null = null;
  let familyRows: FamilyRow[] = [];
  let petDetails: any[] = [];
  let petFoods: any[] = [];
  let petDislikes: any[] = [];
  let favorites: any[] = [];
  let mealPlans: any[] = [];
  let householdTasks: any[] = [];
  let expenses: any[] = []; let partnerNotes: any[] = []; let noteReads: any[] = [];
  let failFamilySave = false;
  let familyRequests = 0;
  let delayedFamilyRead: Promise<void> | null = null;
  let releaseFamilyRead: (() => void) | null = null;
  let delayedFamilyWrite: Promise<void> | null = null;
  let releaseFamilyWrite: (() => void) | null = null;
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
  function rowsForShoppingReference(id: string | undefined) {
    rows.forEach(item => { if ((item as Row & { pet_food_id?: string | null }).pet_food_id === id) (item as Row & { pet_food_id?: string | null }).pet_food_id = null; });
  }
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
      if (url.pathname === `/functions/v1/push-subscriptions`) {
        if (method === `GET`) return reply({
          vapidPublicKey: `BOrPLpcZpm-c1p0UqsqjB9-8u5vVe45duQw4K_8cQG4sGhPOD_6a1zP5IGSAUyvxMK6qwRRVwCq9qceKmtk0GzQ`,
          preferences: { new_item_enabled: true, purchased_enabled: true, reminder_enabled: false, reminder_weekday: 0, reminder_time: `18:00:00`, timezone: `Europe/Berlin` },
        });
        return reply({ ok: true });
      }
      if (url.pathname === `/functions/v1/calendar-google`) {
        const action = data.action;
        const calendars = [{ id: `primary`, summary: `Our calendar`, color: `#8040be`, primary: true, selected: true, shared: false }];
        if (action === `calendars`) return reply({ connected: true, calendars });
        if (action === `events`) return reply({ events: [{ id: `calendar-event`, title: `Synthetic dinner`, start: { dateTime: `2026-11-12T18:30:00+01:00` }, end: { dateTime: `2026-11-12T20:00:00+01:00` }, calendar: `Our calendar`, color: `#8040be`, own: true }] });
        if (action === `connect`) return reply({ url: `https://accounts.google.test/connect` });
        return reply({ ok: true });
      }
      if (url.pathname.endsWith(`/rpc/current_household`))
        return reply(homeFor(user));
      if (url.pathname.endsWith(`/rpc/save_meal_plan_item`)) {
        const household = homeFor(user);
        if (!household) return reply({ message: `Forbidden` }, 403);
        const existing = data.p_id ? mealPlans.find(item => item.id === data.p_id && item.household_id === household) : null;
        const title = data.p_recipe_id ? entryRows.find(item => item.id === data.p_recipe_id)?.title || `Saved recipe` : String(data.p_title || ``).trim();
        if (!title) return reply({ message: `Enter a meal name` }, 400);
        mealPlans = mealPlans.filter(item => item.id === existing?.id || !(item.household_id === household && item.week_start === data.p_week_start && item.day_index === data.p_day_index && item.meal_slot === data.p_meal_slot));
        const row = { id: existing?.id ?? crypto.randomUUID(), household_id: household, week_start: data.p_week_start, day_index: data.p_day_index, meal_slot: data.p_meal_slot, recipe_id: data.p_recipe_id ?? null, title, created_by: existing?.created_by ?? user, created_at: existing?.created_at ?? new Date().toISOString() };
        mealPlans = [...mealPlans.filter(item => item.id !== row.id), row];
        return reply(row);
      }
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
      if (url.pathname === `/rest/v1/folder_entries`) {
        const household = homeFor(user);
        if (!household || url.searchParams.get(`household_id`) && url.searchParams.get(`household_id`) !== `eq.${household}`)
          return reply({ message: `Forbidden` }, 403);
        if (method === `GET`) return reply(entryRows.filter((row) => row.household_id === household));
        if (failEntrySave) {
          failEntrySave = false;
          return reply({ message: `Synthetic entry storage failure` }, 503);
        }
        if (method === `POST`) {
          const items = Array.isArray(data) ? data : [data];
          if (items.some((item) => item.household_id !== household)) return reply({ message: `Forbidden` }, 403);
          const rows = items.map((item) => ({ ...item, id: crypto.randomUUID(), created_by: user, created_at: new Date().toISOString() }) as EntryRow);
          entryRows.push(...rows);
          if (delayedEntryWrite) await delayedEntryWrite;
          return reply(Array.isArray(data) ? rows : rows[0], 201);
        }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``);
        const row = entryRows.find((row) => row.id === id && row.household_id === household);
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) {
          Object.assign(row, data);
          return reply(row);
        }
        if (method === `DELETE`) {
          entryRows = entryRows.filter((row) => row.id !== id);
          return reply({ id });
        }
      }
      if (url.pathname === `/rest/v1/meal_plan_items`) {
        const household = homeFor(user);
        if (!household) return reply({ message: `Forbidden` }, 403);
        const week = url.searchParams.get(`week_start`)?.replace(`eq.`, ``);
        if (method === `GET`) return reply(mealPlans.filter(item => item.household_id === household && (!week || item.week_start === week)));
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``);
        const row = mealPlans.find(item => item.id === id && item.household_id === household);
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `DELETE`) { mealPlans = mealPlans.filter(item => item !== row); return reply({ id }); }
      }
      if (url.pathname === `/rest/v1/household_tasks`) {
        const household = homeFor(user);
        if (!household) return reply({ message: `Forbidden` }, 403);
        if (method === `GET`) return reply(householdTasks.filter(item => item.household_id === household));
        if (method === `POST`) {
          if (data.household_id !== household) return reply({ message: `Forbidden` }, 403);
          const row = { ...data, id: crypto.randomUUID(), created_by: user, completed_at: null, created_at: new Date().toISOString() }; householdTasks.push(row); return reply(row, 201);
        }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``); const row = householdTasks.find(item => item.id === id && item.household_id === household);
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) { Object.assign(row, data); return reply(row); }
        if (method === `DELETE`) { householdTasks = householdTasks.filter(item => item !== row); return reply({ id }); }
      }
      if ([`/rest/v1/shared_expenses`, `/rest/v1/partner_notes`, `/rest/v1/partner_note_reads`].includes(url.pathname)) {
        const household = homeFor(user); if (!household) return reply({ message: `Forbidden` }, 403);
        if (url.pathname.endsWith(`partner_note_reads`)) { if (method === `GET`) return reply(noteReads.filter(item => item.user_id === user)); if (method === `POST`) { const row = { ...data, read_at: new Date().toISOString() }; noteReads = [...noteReads.filter(item => !(item.note_id === row.note_id && item.user_id === row.user_id)), row]; return reply(row, 201); } }
        const rows = url.pathname.endsWith(`shared_expenses`) ? expenses : partnerNotes;
        if (method === `GET`) return reply(rows.filter(item => item.household_id === household));
        if (method === `POST`) { if (data.household_id !== household) return reply({ message: `Forbidden` }, 403); const row = { ...data, id: crypto.randomUUID(), created_by: user, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; rows.push(row); return reply(row, 201); }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``); const row = rows.find(item => item.id === id && item.household_id === household); if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) { Object.assign(row, data); return reply(row); } if (method === `DELETE`) { if (url.pathname.endsWith(`shared_expenses`)) expenses = expenses.filter(item => item !== row); else partnerNotes = partnerNotes.filter(item => item !== row); return reply({ id }); }
      }
      if ([`/rest/v1/pet_details`, `/rest/v1/pet_food`, `/rest/v1/pet_dislikes`].includes(url.pathname)) {
        const household = homeFor(user);
        const visible = (row: any) => familyRows.some(p => p.id === row.pet_id && p.kind === `pet` && p.household_id === household);
        const details = url.pathname.endsWith(`pet_details`);
        const food = url.pathname.endsWith(`pet_food`);
        const rows = details ? petDetails : food ? petFoods : petDislikes;
        const rawPet = url.searchParams.get(`pet_id`);
        const petFilter = rawPet?.startsWith(`eq.`) ? rawPet.slice(3) : null;
        const petIds = rawPet?.startsWith(`in.(`) ? rawPet.slice(4, -1).split(`,`) : null;
        const rawIds = url.searchParams.get(`id`);
        const selectedIds = rawIds?.startsWith(`in.(`) ? rawIds.slice(4, -1).split(`,`) : null;
        if (method === `GET`) return reply(rows.filter(row => visible(row) && (!petFilter || row.pet_id === petFilter) && (!petIds || petIds.includes(row.pet_id)) && (!selectedIds || selectedIds.includes(row.id))));
        if (method === `POST`) {
          if (!visible(data)) return reply({ message: `Forbidden` }, 403);
          const row = details ? data : { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
          if (details) petDetails = [...petDetails.filter(r => r.pet_id !== row.pet_id), row];
          else rows.push(row);
          return reply(row, 201);
        }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``);
        const row = rows.find(item => item.id === id && visible(item) && (!petFilter || item.pet_id === petFilter));
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) { Object.assign(row, data); return reply(row); }
        if (method === `DELETE`) {
          if (food) {
            petFoods = petFoods.filter(item => item !== row);
            rowsForShoppingReference(id);
          } else petDislikes = petDislikes.filter(item => item !== row);
          return reply({ id });
        }
      }
      if (url.pathname === `/rest/v1/shopping_favorites`) {
        const household = homeFor(user);
        if (!household) return reply({ message: `Forbidden` }, 403);
        const selectedCategory = url.searchParams.get(`category`)?.replace(`eq.`, ``);
        if (method === `GET`) {
          const ids = url.searchParams.get(`id`);
          const selectedIds = ids?.startsWith(`in.(`) ? ids.slice(4, -1).split(`,`) : null;
          return reply(favorites.filter(row => row.household_id === household && (!selectedCategory || row.category === selectedCategory) && (!selectedIds || selectedIds.includes(row.id))));
        }
        const key = (item: any) => [item.category, item.name, item.brand, item.flavor, item.size].map(value => String(value ?? '').trim().toLowerCase()).join('|');
        if (method === `POST`) {
          if (data.household_id !== household) return reply({ message: `Forbidden` }, 403);
          if (favorites.some(item => item.household_id === household && key(item) === key(data))) return reply({ code: `23505`, message: `Duplicate` }, 409);
          const row = { flavor: '', size: '', ...data, id: crypto.randomUUID(), created_at: new Date().toISOString(), created_by: user };
          favorites.push(row); return reply(row, 201);
        }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``);
        const row = favorites.find(item => item.id === id && item.household_id === household);
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) {
          const next = { ...row, ...data };
          if (key(next) !== key(row) && favorites.some(item => item.id !== id && item.household_id === household && key(item) === key(next))) return reply({ code: `23505`, message: `Duplicate` }, 409);
          Object.assign(row, data); return reply(row);
        }
        if (method === `DELETE`) { favorites = favorites.filter(item => item !== row); rows.forEach(item => { if ((item as Row & { favorite_id?: string | null }).favorite_id === id) (item as Row & { favorite_id?: string | null }).favorite_id = null; }); return reply({ id }); }
      }
      if (url.pathname === `/rest/v1/family_profiles`) {
        ++familyRequests;
        const household = homeFor(user);
        if (!household || url.searchParams.get(`household_id`) && url.searchParams.get(`household_id`) !== `eq.${household}`)
          return reply({ message: `Forbidden` }, 403);
        if (method === `GET`) {
          const snapshot = familyRows.filter((row) => row.household_id === household);
          if (delayedFamilyRead) await delayedFamilyRead;
          return reply(snapshot);
        }
        if (failFamilySave) {
          failFamilySave = false;
          return reply({ message: `Synthetic family storage failure` }, 503);
        }
        if (method === `POST`) {
          if (data.household_id !== household) return reply({ message: `Forbidden` }, 403);
          const row = { ...data, id: crypto.randomUUID(), created_by: user, created_at: new Date().toISOString() } as FamilyRow;
          familyRows.push(row);
          if (delayedFamilyWrite) await delayedFamilyWrite;
          return reply(row, 201);
        }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``);
        const row = familyRows.find((row) => row.id === id && row.household_id === household);
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) {
          row.name = data.name;
          row.animal_type = data.animal_type;
          row.birth_date = data.birth_date;
          return reply(row);
        }
        if (method === `DELETE`) {
          familyRows = familyRows.filter((row) => row.id !== id);
          return reply({ id });
        }
      }
      if (url.pathname === `/rest/v1/shopping_items`) {
        if (!homeFor(user)) return reply({ message: `Forbidden` }, 403);
        if (method === `GET`)
          return reply(
            rows.filter((row) => row.household_id === homeFor(user)),
          );
        if (method === `POST`) {
          if (failSave)
            return reply({ message: `Synthetic storage failure` }, 503);
          const batch = Array.isArray(data) ? data : [data];
          if (batch.some(item => item.household_id !== homeFor(user))) return reply({ message: `Forbidden` }, 403);
          const activeKeys = new Set(rows.filter(item => !item.bought && item.household_id === homeFor(user)).map(item => `${item.category}\u0000${item.name.trim().toLowerCase()}`));
          if (batch.some(item => {
            const key = `${item.category}\u0000${String(item.name).trim().toLowerCase()}`;
            if (activeKeys.has(key)) return true;
            activeKeys.add(key);
            return false;
          })) return reply({ code: `23505`, message: `This item is already active in your shared list` }, 409);
          const added = batch.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            created_by: user,
            created_at: new Date().toISOString(),
            bought: false,
          } as Row));
          rows = [...added, ...rows];
          return reply(Array.isArray(data) ? added : added[0], 201);
        }
        const id = url.searchParams.get(`id`)?.replace(`eq.`, ``);
        const row = rows.find(
          (row) => row.id === id && row.household_id === homeFor(user),
        );
        if (!row) return reply({ message: `Not found` }, 404);
        if (method === `PATCH`) {
          if (`bought` in data) row.bought = data.bought;
          if (`name` in data) row.name = data.name;
          if (`category` in data) row.category = data.category;
          if (`notes` in data) (row as Row & { notes: string }).notes = data.notes;
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
    seedLegacyRecipe: (title: string, notes: string, source?: string) => { entryRows.push({ id: crypto.randomUUID(), household_id: pocHome, kind: 'recipe', title, notes, created_by: pocMasha, created_at: new Date().toISOString(), ...(source ? { recipe_source_url: source } : {}) }); },
    seedRecipe: (title: string, ingredients: string, details: { instructions?: string; photo?: string } = {}) => { const id = crypto.randomUUID(); entryRows.push({ id, household_id: pocHome, kind: 'recipe', title, notes: '', recipe_ingredients: ingredients, recipe_instructions: details.instructions || '', ...(details.photo ? { recipe_image_url: details.photo } : {}), created_by: pocMasha, created_at: new Date().toISOString() }); return id; },
    seedTask: (title: string, due_date: string | null, priority: string, assignee = 'masha', completed_at: string | null = null) => { householdTasks.push({ id: crypto.randomUUID(), household_id: pocHome, title, due_date, priority, assignee, completed_at, created_at: new Date().toISOString() }); },
    seedShopping: (name: string, notes: string, bought = false) => { rows.push({ id: crypto.randomUUID(), household_id: pocHome, name, notes, category: 'Home', bought, created_by: pocMasha, created_at: new Date().toISOString() } as Row); },
    seedMeal: (week: string, slot: string, title: string, recipeId: string | null = null) => { mealPlans.push({ id: crypto.randomUUID(), household_id: pocHome, week_start: week, day_index: 0, meal_slot: slot, recipe_id: recipeId, title, created_at: new Date().toISOString() }); },
    meals: () => mealPlans.map(item => ({ ...item })),
    failNextEntrySave: () => { failEntrySave = true; },
    delayEntryWrites: () => { delayedEntryWrite = new Promise<void>((resolve) => { releaseEntryWrite = resolve; }); },
    releaseEntryWrites: () => { releaseEntryWrite?.(); delayedEntryWrite = null; releaseEntryWrite = null; },
    delayFamilyWrites: () => {
      delayedFamilyWrite = new Promise<void>((resolve) => { releaseFamilyWrite = resolve; });
    },
    releaseFamilyWrites: () => {
      releaseFamilyWrite?.();
      delayedFamilyWrite = null;
      releaseFamilyWrite = null;
    },
    failNextFamilySave: () => { failFamilySave = true; },
    familyRequestCount: () => familyRequests,
    delayFamilyReads: () => {
      delayedFamilyRead = new Promise<void>((resolve) => { releaseFamilyRead = resolve; });
    },
    releaseFamilyReads: () => {
      releaseFamilyRead?.();
      delayedFamilyRead = null;
      releaseFamilyRead = null;
    },
    failNextSave: () => {
      failSave = true;
    },
    failConfirmationMail: () => {
      failMail = true;
    },
  };
}
