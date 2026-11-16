-- Weekly store offers (see docs/offers-plan.md).
--
-- Kaufland (Düren branch DE4183) and ALDI SÜD are read by the database itself:
-- pg_cron queues requests, pg_net fetches one public offer page at a time with an
-- honest User-Agent, and the minute job parses finished responses. No browser
-- access, no secrets and no Edge Function are involved. Lidl, REWE, Netto and
-- EDEKA cannot be read automatically; household members add their Offers from
-- Brochure screenshots, visible only to their own household.
begin;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  store text not null check (store in ('kaufland', 'aldi_sued', 'lidl', 'rewe', 'netto', 'edeka')),
  origin text not null default 'screenshot' check (origin in ('import', 'screenshot')),
  household_id uuid references public.households(id) on delete cascade,
  source_id text not null default gen_random_uuid()::text check (length(source_id) between 1 and 200),
  title text not null check (length(btrim(title)) between 1 and 200),
  brand text not null default '' check (length(brand) <= 120),
  quantity_text text not null default '' check (length(quantity_text) <= 160),
  price_cents integer not null check (price_cents between 1 and 1000000),
  regular_price_cents integer check (regular_price_cents is null or regular_price_cents between 1 and 1000000),
  base_price_text text not null default '' check (length(base_price_text) <= 160),
  category text not null default '' check (length(category) <= 80),
  valid_from date not null,
  valid_to date not null,
  source_url text not null default '' check (length(source_url) <= 500),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  imported_at timestamptz not null default now(),
  check (valid_to >= valid_from and valid_to - valid_from <= 31),
  check ((origin = 'import') = (household_id is null))
);
create unique index offers_import_unique on public.offers(store, source_id, valid_from) where origin = 'import';
create index offers_current on public.offers(valid_to, store);
create index offers_household on public.offers(household_id) where household_id is not null;

-- One row per Store and import run; the app shows a note when the latest run failed.
create table public.offer_import_runs (
  id uuid primary key default gen_random_uuid(),
  store text not null check (store in ('kaufland', 'aldi_sued')),
  status text not null default 'running' check (status in ('running', 'ok', 'failed')),
  offer_count integer not null default 0,
  error text not null default '' check (length(error) <= 300),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index offer_import_runs_latest on public.offer_import_runs(store, started_at desc);

-- Private request queue. Requests are sent one at a time to stay polite.
create table public.offer_import_requests (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.offer_import_runs(id) on delete cascade,
  kind text not null check (kind in ('kaufland', 'aldi_overview', 'aldi_page')),
  url text not null,
  offer_date date,
  category text not null default '',
  request_id bigint,
  status text not null default 'queued' check (status in ('queued', 'sent', 'done', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index offer_import_requests_open on public.offer_import_requests(status, id) where status in ('queued', 'sent');

-- "Doesn't match": hides one Favorite/Offer pairing for the household for good.
create table public.offer_match_rejections (
  household_id uuid not null references public.households(id) on delete cascade,
  favorite_id uuid not null references public.shopping_favorites(id) on delete cascade,
  offer_key text not null check (length(offer_key) between 1 and 400),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (household_id, favorite_id, offer_key)
);

alter table public.offers enable row level security;
alter table public.offer_import_runs enable row level security;
alter table public.offer_import_requests enable row level security;
alter table public.offer_match_rejections enable row level security;
revoke all on public.offers, public.offer_import_runs, public.offer_import_requests, public.offer_match_rejections from anon, authenticated;

-- Imported Offers are public advertising; screenshot Offers stay inside the household.
grant select on public.offers, public.offer_import_runs to anon, authenticated;
grant insert (store, household_id, title, brand, quantity_text, price_cents, regular_price_cents, base_price_text, category, valid_from, valid_to) on public.offers to authenticated;
grant delete on public.offers to authenticated;
create policy offers_public_read on public.offers for select to anon using (household_id is null);
create policy offers_read on public.offers for select to authenticated
  using (household_id is null or household_id = (select public.current_household()));
create policy offers_screenshot_insert on public.offers for insert to authenticated
  with check (origin = 'screenshot' and household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy offers_screenshot_delete on public.offers for delete to authenticated
  using (origin = 'screenshot' and household_id = (select public.current_household()));
create policy offer_import_runs_read on public.offer_import_runs for select to anon, authenticated using (true);

grant select, insert, delete on public.offer_match_rejections to authenticated;
create policy offer_match_rejections_read on public.offer_match_rejections for select to authenticated
  using (household_id = (select public.current_household()));
create policy offer_match_rejections_insert on public.offer_match_rejections for insert to authenticated
  with check (household_id = (select public.current_household()) and created_by = (select auth.uid())
    and exists (select 1 from public.shopping_favorites favorite where favorite.id = favorite_id and favorite.household_id = offer_match_rejections.household_id));
create policy offer_match_rejections_delete on public.offer_match_rejections for delete to authenticated
  using (household_id = (select public.current_household()));

-- Weekly offer push, off until each person switches it on.
alter table public.notification_preferences add column offers_enabled boolean not null default false;
alter table public.push_deliveries drop constraint if exists push_deliveries_kind_check;
alter table public.push_deliveries add constraint push_deliveries_kind_check
  check (kind in ('item_added', 'item_purchased', 'task_added', 'shopping_reminder', 'offers_weekly'));

-- Browser clients cannot touch notification_preferences directly; these two
-- functions read and change only the caller's own offer setting.
create function public.offer_notifications_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select offers_enabled from public.notification_preferences where user_id = (select auth.uid())), false)
$$;

create function public.set_offer_notifications(enabled boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare home uuid := public.current_household();
begin
  if auth.uid() is null or home is null then raise exception 'No household'; end if;
  insert into public.notification_preferences(user_id, household_id, offers_enabled)
    values (auth.uid(), home, enabled)
    on conflict (user_id) do update set offers_enabled = excluded.offers_enabled, household_id = excluded.household_id, updated_at = now();
  return enabled;
end $$;

-- Helpers for parsing fetched pages.
create function public.offer_text(value text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(replace(replace(replace(replace(replace(replace(coalesce(value, ''),
    '&amp;', '&'), '&#39;', ''''), '&quot;', '"'), '&lt;', '<'), '&gt;', '>'), '&#x2028;', ' '),
    '\s+', ' ', 'g'))
$$;

create function public.offer_cents(value text) returns integer
language sql immutable set search_path = '' as $$
  select case when replace(btrim(coalesce(value, '')), ',', '.') ~ '^[0-9]{1,5}(\.[0-9]{1,2})?$'
    then nullif(round(replace(btrim(value), ',', '.')::numeric * 100)::integer, 0) end
$$;

create function public.offer_url_decode(value text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(convert_from(string_agg(
    case when part[1] is not null then decode(substr(part[1], 2), 'hex') else convert_to(part[2], 'UTF8') end,
    ''::bytea order by position), 'UTF8'), '')
  from regexp_matches(replace(coalesce(value, ''), '+', ' '), '(%[0-9A-Fa-f]{2})|([^%]+|%)', 'g') with ordinality as match(part, position)
$$;

-- Food, drugstore, household, pet and baby only (decision 6 in the plan).
create function public.offer_category_allowed(category text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(coalesce(category, '')) ~ '(obst|gemüse|fleisch|geflügel|wurst|fisch|molkerei|fette|tiefkühl|feinkost|konserven|grundnahrung|kaffee|tee|süß|knabber|getränk|drogerie|tiernahrung|frisch|gekühlt|marken|bio|haushalt|reinigung|kosmetik|baby|käse|backwaren|lebensmittel|snack)'
    and lower(coalesce(category, '')) !~ '(elektro|technik|garten|bekleidung|mode|spielzeug|reisen|deko|möbel|heimwerk|sport|auto)'
$$;

create function public.offers_parse_kaufland(content text, run uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  start_at integer := strpos(content, '{"component":"OfferTemplate"');
  rest text;
  payload jsonb;
  category jsonb;
  item jsonb;
  saved integer := 0;
  heading text;
  name text;
begin
  if start_at = 0 then raise exception 'Kaufland offer data not found'; end if;
  rest := substr(content, start_at);
  payload := regexp_replace(left(rest, strpos(rest, '</script>') - 1), ';?\s*$', '')::jsonb;
  for category in select value from jsonb_array_elements(payload #> '{props,offerData,cycles,0,categories}') loop
    continue when coalesce((category->>'main')::boolean, false) is false or not public.offer_category_allowed(category->>'displayName');
    for item in select value from jsonb_array_elements(category->'offers') loop
      heading := public.offer_text(item->>'title');
      name := coalesce(nullif(public.offer_text(item->>'subtitle'), ''), nullif(heading, ''), public.offer_text(item->>'detailTitle'));
      continue when name = '' or public.offer_cents(item->>'price') is null or (item->>'salesFrom') is null or (item->>'salesTo') is null;
      insert into public.offers(store, origin, household_id, source_id, title, brand, quantity_text, price_cents, regular_price_cents, base_price_text, category, valid_from, valid_to, source_url, created_by)
      values ('kaufland', 'import', null, left(item->>'offerId', 200), left(name, 200),
        left(case when nullif(public.offer_text(item->>'subtitle'), '') is not null then heading else '' end, 120),
        left(public.offer_text(item->>'unit'), 160), public.offer_cents(item->>'price'), public.offer_cents(item->>'formattedOldPrice'),
        left(btrim(public.offer_text(item->>'formattedBasePrice'), '()'), 160), left(public.offer_text(category->>'displayName'), 80),
        (item->>'salesFrom')::date, (item->>'salesTo')::date, 'https://filiale.kaufland.de/angebote/uebersicht.html', null)
      on conflict (store, source_id, valid_from) where origin = 'import' do update set
        title = excluded.title, brand = excluded.brand, quantity_text = excluded.quantity_text, price_cents = excluded.price_cents,
        regular_price_cents = excluded.regular_price_cents, base_price_text = excluded.base_price_text, category = excluded.category,
        valid_to = excluded.valid_to, imported_at = now();
      saved := saved + 1;
    end loop;
  end loop;
  update public.offer_import_runs set offer_count = offer_count + saved where id = run;
  return saved;
end $$;

create function public.offers_parse_aldi_overview(content text, run uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare link text[]; queued integer := 0; theme text;
begin
  for link in select distinct match from regexp_matches(content, 'href="/angebote/([0-9]{4}-[0-9]{2}-[0-9]{2})\?theme=([^"&]+)"', 'g') as found(match) loop
    theme := public.offer_url_decode(link[2]);
    continue when link[1]::date not between current_date - 6 and current_date + 7 or not public.offer_category_allowed(theme);
    insert into public.offer_import_requests(run_id, kind, url, offer_date, category)
      values (run, 'aldi_page', 'https://www.aldi-sued.de/angebote/' || link[1] || '?theme=' || link[2], link[1]::date, left(theme, 80));
    queued := queued + 1;
  end loop;
  if queued = 0 then raise exception 'ALDI offer pages not found'; end if;
  return queued;
end $$;

create function public.offers_parse_aldi_page(content text, run uuid, offer_date date, theme text, page_url text) returns integer
language plpgsql security definer set search_path = '' as $$
declare tile text; saved integer := 0; name text; price integer;
begin
  for tile in select part from unnest(string_to_array(content, 'id="product-tile-')) with ordinality as split(part, position) where position > 1 loop
    name := public.offer_text(substring(tile from 'class="product-tile__name"[^>]*><p[^>]*>([^<]*)</p>'));
    price := public.offer_cents(substring(tile from 'class="base-price__regular"><(?:span|ins[^>]*)>([0-9]{1,5},[0-9]{2})[^0-9<]{0,8}€'));
    continue when name = '' or price is null or substring(tile from '^([0-9]{1,40})"') is null;
    insert into public.offers(store, origin, household_id, source_id, title, brand, quantity_text, price_cents, regular_price_cents, base_price_text, category, valid_from, valid_to, source_url, created_by)
    values ('aldi_sued', 'import', null, substring(tile from '^([0-9]{1,40})"'), left(name, 200),
      left(public.offer_text(substring(tile from 'class="product-tile__brandname"[^>]*><p[^>]*>([^<]*)</p>')), 120),
      left(public.offer_text(substring(tile from 'class="product-tile__unit-of-measurement"><p>([^<]*)</p>')), 160), price,
      public.offer_cents(substring(tile from 'class="base-price__was-price"><del[^>]*>([0-9]{1,5},[0-9]{2})[^0-9<]{0,8}€')),
      left(btrim(public.offer_text(substring(tile from 'class="product-tile__comparison-price"><p>([^<]*)</p>')), '()'), 160),
      left(theme, 80), offer_date, offer_date + 6, left(page_url, 500), null)
    on conflict (store, source_id, valid_from) where origin = 'import' do update set
      title = excluded.title, brand = excluded.brand, quantity_text = excluded.quantity_text, price_cents = excluded.price_cents,
      regular_price_cents = excluded.regular_price_cents, base_price_text = excluded.base_price_text, category = excluded.category,
      imported_at = now();
    saved := saved + 1;
  end loop;
  update public.offer_import_runs set offer_count = offer_count + saved where id = run;
  return saved;
end $$;

-- Queues a fresh run for both Stores. Called Monday and Thursday morning.
create function public.offers_start_import() returns void
language plpgsql security definer set search_path = '' as $$
declare run uuid;
begin
  update public.offer_import_runs set status = 'failed', error = 'Replaced by a newer run', finished_at = now() where status = 'running';
  update public.offer_import_requests set status = 'failed' where status in ('queued', 'sent');
  insert into public.offer_import_runs(store) values ('kaufland') returning id into run;
  insert into public.offer_import_requests(run_id, kind, url) values (run, 'kaufland', 'https://filiale.kaufland.de/angebote/uebersicht.storeName=DE4183.html');
  insert into public.offer_import_runs(store) values ('aldi_sued') returning id into run;
  insert into public.offer_import_requests(run_id, kind, url) values (run, 'aldi_overview', 'https://www.aldi-sued.de/angebote');
end $$;

-- Runs every minute: parses a finished response, then sends the next request.
create function public.offers_process_import() returns void
language plpgsql security definer set search_path = '' as $$
declare
  request public.offer_import_requests;
  response record;
  failure text;
begin
  if to_regclass('net._http_response') is null or to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is null then return; end if;
  select * into request from public.offer_import_requests where status = 'sent' order by id limit 1;
  if found then
    execute 'select status_code, content, timed_out, error_msg from net._http_response where id = $1' into response using request.request_id;
    if response is null and request.sent_at > now() - interval '10 minutes' then return; end if;
    failure := case
      when response is null then 'No answer'
      when response.timed_out then 'Timed out'
      when response.status_code is distinct from 200 then 'HTTP ' || coalesce(response.status_code::text, response.error_msg, '?')
    end;
    if failure is null then
      begin
        if request.kind = 'kaufland' then perform public.offers_parse_kaufland(response.content, request.run_id);
        elsif request.kind = 'aldi_overview' then perform public.offers_parse_aldi_overview(response.content, request.run_id);
        else perform public.offers_parse_aldi_page(response.content, request.run_id, request.offer_date, request.category, request.url);
        end if;
      exception when others then failure := left(sqlerrm, 200);
      end;
    end if;
    update public.offer_import_requests set status = case when failure is null then 'done' else 'failed' end where id = request.id;
    if failure is not null and request.kind <> 'aldi_page' then
      update public.offer_import_runs set status = 'failed', error = left(failure, 300), finished_at = now() where id = request.run_id;
      update public.offer_import_requests set status = 'failed' where run_id = request.run_id and status = 'queued';
    end if;
    update public.offer_import_runs run set status = case when run.offer_count > 0 then 'ok' else 'failed' end,
        error = case when run.offer_count > 0 then '' else coalesce(nullif(run.error, ''), 'No offers found') end, finished_at = now()
      where run.id = request.run_id and run.status = 'running'
        and not exists (select 1 from public.offer_import_requests open where open.run_id = run.id and open.status in ('queued', 'sent'));
  end if;
  select * into request from public.offer_import_requests where status = 'queued' order by id limit 1;
  if found then
    execute 'select net.http_get(url := $1, headers := $2, timeout_milliseconds := 30000)' into request.request_id
      using request.url, jsonb_build_object('User-Agent', 'CouplePlaygroundBot/0.1 (personal use)', 'Accept-Language', 'de-DE');
    update public.offer_import_requests set status = 'sent', request_id = request.request_id, sent_at = now() where id = request.id;
  end if;
  delete from public.offers where valid_to < current_date - 28;
  delete from public.offer_import_requests where created_at < now() - interval '14 days';
  delete from public.offer_import_runs where started_at < now() - interval '60 days';
end $$;

revoke all on function public.offer_notifications_enabled(), public.set_offer_notifications(boolean) from public, anon;
grant execute on function public.offer_notifications_enabled(), public.set_offer_notifications(boolean) to authenticated;
revoke all on function public.offers_parse_kaufland(text, uuid), public.offers_parse_aldi_overview(text, uuid),
  public.offers_parse_aldi_page(text, uuid, date, text, text), public.offers_start_import(), public.offers_process_import()
  from public, anon, authenticated;

do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    -- 03:30 UTC is 04:30/05:30 in Düren; Kaufland and ALDI publish the new week before that.
    perform cron.schedule('together-offers-import', '30 3 * * 1,4', $job$select public.offers_start_import()$job$);
    perform cron.schedule('together-offers-process', '* * * * *', $job$select public.offers_process_import()$job$);
  end if;
  -- Load the current week right away instead of waiting for Thursday.
  perform public.offers_start_import();
end $$;

commit;
