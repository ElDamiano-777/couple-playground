\set ON_ERROR_STOP on
\ir access.sql

-- Hosted Supabase provides these schemas. Disposable PostgreSQL uses minimal
-- stubs so this test can exercise the real migration and trigger behavior.
create schema vault;
create table vault.decrypted_secrets(name text primary key, decrypted_secret text not null);
create schema net;
create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language sql as $$select 1::bigint$$;
create schema cron;
create table cron.job(jobname text);
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$select 1::bigint$$;

\ir ../migrations/20261104010000_web_push_notifications.sql

insert into auth.users values
  ('50000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002'),
  ('50000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', false);
select public.create_household();
select public.create_household_invitation() as code \gset
insert into public.shopping_items(household_id, name, category) values(public.current_household(), 'Coffee', 'Home') returning id as coffee \gset
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', false);
select public.join_household(:'code');
update public.shopping_items set bought = true where id = :'coffee';

reset role;
do $$ begin
  if (select count(*) from public.push_events where kind = 'item_added' and item_name = 'Coffee') <> 1 then raise exception 'Item-add event missing'; end if;
  if (select count(*) from public.push_events where kind = 'item_purchased' and item_name = 'Coffee' and actor_id = '50000000-0000-4000-8000-000000000002') <> 1 then raise exception 'Purchase event missing or wrong actor'; end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', false);
do $$ begin
  begin perform * from public.push_events; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin perform * from public.push_subscriptions; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin perform * from public.push_deliveries; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
reset role;

insert into public.push_subscriptions(user_id, endpoint, p256dh, auth)
  values ('50000000-0000-4000-8000-000000000001', 'https://push.example/device', 'key', 'auth');
do $$ begin
  begin
    insert into public.push_subscriptions(user_id, endpoint, p256dh, auth)
      values ('50000000-0000-4000-8000-000000000001', 'https://push.example/device', 'other', 'other');
    raise exception 'TEST FAILED';
  exception when unique_violation then null;
  end;
end $$;
