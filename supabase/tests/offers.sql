\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. Usage (from the repository root):
--   docker run ... postgres:17-alpine, copy supabase/ to /tmp/together-supabase and
--   saved Kaufland/ALDI pages to /tmp/offers-kaufland.html, /tmp/offers-aldi-overview.html,
--   /tmp/offers-aldi-page.html, then: psql -f /tmp/together-supabase/tests/offers.sql
\ir access.sql

create schema vault;
create table vault.decrypted_secrets(name text primary key, decrypted_secret text not null);
create schema net;
create table net._http_response(id bigint primary key, status_code integer, content text, timed_out boolean default false, error_msg text);
create sequence net.request_ids;
create table net.requests(id bigint primary key, url text, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{"Content-Type": "application/json"}', timeout_milliseconds integer default 5000) returns bigint language sql as $$select 0::bigint$$;
create function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$
declare id bigint := nextval('net.request_ids'); begin insert into net.requests values (id, url, headers); return id; end $$;
create schema cron;
create table cron.job(jobname text, schedule text);
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$insert into cron.job values (job_name, schedule) returning 1::bigint$$;

\ir ../migrations/20261102050000_shopping_item_edit.sql
\ir ../migrations/20261102060000_shopping_item_details.sql
\ir ../migrations/20261103010000_shopping_favorites.sql
\ir ../migrations/20261103020000_favorite_product_picker.sql
\ir ../migrations/20261104010000_web_push_notifications.sql
\ir ../migrations/20261106020000_fix_push_http_dispatch.sql
\ir ../migrations/20261106030000_task_push_events.sql
\ir ../migrations/20261116010000_store_offers.sql

do $$ begin
  if (select count(*) from cron.job where jobname like 'together-offers-%') <> 2 then raise exception 'TEST FAILED: offer jobs'; end if;
  if (select count(*) from public.offer_import_runs where status = 'running') <> 2 then raise exception 'TEST FAILED: initial runs'; end if;
  if public.offer_url_decode('Gek%C3%BChlte+Produkte') <> 'Gekühlte Produkte' then raise exception 'TEST FAILED: url decode'; end if;
  if public.offer_cents('4,79') <> 479 or public.offer_cents('1.99') <> 199 or public.offer_cents('ab 1,99') is not null then raise exception 'TEST FAILED: cents'; end if;
end $$;

-- Kaufland: first tick sends the request, the next one parses its answer.
\set kaufland `cat /tmp/offers-kaufland.html`
\set aldi_overview `cat /tmp/offers-aldi-overview.html`
\set aldi_page `cat /tmp/offers-aldi-page.html`
select public.offers_process_import();
select public.offers_process_import();
do $$ begin
  if (select count(*) from net.requests) <> 1 then raise exception 'TEST FAILED: one request at a time'; end if;
  if (select headers->>'User-Agent' from net.requests) not like 'CouplePlaygroundBot/%' then raise exception 'TEST FAILED: user agent'; end if;
end $$;
insert into net._http_response(id, status_code, content) select id, 200, :'kaufland' from net.requests where url like '%kaufland%';
select public.offers_process_import();
insert into net._http_response(id, status_code, content) select id, 200, :'aldi_overview' from net.requests where url = 'https://www.aldi-sued.de/angebote';
select public.offers_process_import();
-- Answer every queued ALDI theme page with the same saved page.
select set_config('offers.aldi_page', :'aldi_page', false) is not null as page_ready;
do $$ begin
  for i in 1..40 loop
    perform public.offers_process_import();
    insert into net._http_response(id, status_code, content)
      select request.id, 200, current_setting('offers.aldi_page') from net.requests request
      where not exists (select 1 from net._http_response done where done.id = request.id);
  end loop;
end $$;

select store, status, offer_count, error from public.offer_import_runs order by store;
select store, category, count(*) from public.offers group by 1, 2 order by 1, 2;
select store, title, brand, quantity_text, price_cents, regular_price_cents, base_price_text, valid_from, valid_to from public.offers order by store, title limit 12;

do $$ begin
  if (select count(*) from public.offers where store = 'kaufland') < 100 then raise exception 'TEST FAILED: Kaufland offers'; end if;
  if (select count(*) from public.offers where store = 'aldi_sued') < 5 then raise exception 'TEST FAILED: ALDI offers'; end if;
  if exists (select 1 from public.offers where category ~* '(bekleidung|elektro|garten)') then raise exception 'TEST FAILED: category filter'; end if;
  if exists (select 1 from public.offer_import_runs where status <> 'ok') then raise exception 'TEST FAILED: run status'; end if;
end $$;

-- A failed answer marks the run as failed instead of keeping old status.
select public.offers_start_import();
select public.offers_process_import();
insert into net._http_response(id, status_code, content) select max(id), 403, '' from net.requests;
select public.offers_process_import();
do $$ begin
  if (select status from public.offer_import_runs where store = 'kaufland' order by started_at desc limit 1) <> 'failed' then raise exception 'TEST FAILED: 403 run'; end if;
end $$;

-- Screenshot Offers stay inside the household; imported ones are public.
insert into auth.users values ('60000000-0000-4000-8000-000000000001'), ('60000000-0000-4000-8000-000000000002');
set role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', false);
select public.create_household();
insert into public.offers(store, household_id, title, price_cents, valid_from, valid_to)
  values ('netto', public.current_household(), 'Vollmilch 1 l', 99, current_date, current_date + 5);
do $$ begin
  begin
    insert into public.offers(store, household_id, title, price_cents, valid_from, valid_to) values ('netto', null, 'Fake', 1, current_date, current_date);
    raise exception 'TEST FAILED: global insert';
  exception when insufficient_privilege or check_violation then null; end;
  begin
    update public.offers set price_cents = 1;
    raise exception 'TEST FAILED: update';
  exception when insufficient_privilege then null; end;
  perform public.set_offer_notifications(true);
  if public.offer_notifications_enabled() is not true then raise exception 'TEST FAILED: offer setting'; end if;
end $$;
insert into public.shopping_favorites(household_id, category, name) values (public.current_household(), 'Home', 'Milch') returning id as favorite \gset
insert into public.offer_match_rejections(household_id, favorite_id, offer_key) values (public.current_household(), :'favorite', 'netto|vollmilch 1 l');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', false);
do $$ begin
  if exists (select 1 from public.offers where store = 'netto') then raise exception 'TEST FAILED: foreign screenshot read'; end if;
  if (select count(*) from public.offers) = 0 then raise exception 'TEST FAILED: public offers'; end if;
  if exists (select 1 from public.offer_match_rejections) then raise exception 'TEST FAILED: foreign rejection read'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  if exists (select 1 from public.offers where household_id is not null) then raise exception 'TEST FAILED: anon screenshot read'; end if;
  if (select count(*) from public.offer_import_runs) = 0 then raise exception 'TEST FAILED: anon runs'; end if;
end $$;
reset role;
select 'Offer tests passed';
