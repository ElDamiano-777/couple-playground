\set ON_ERROR_STOP on
-- All accounts, keys and endpoints are synthetic. This file requires an empty test database.
\ir access.sql
create role service_role;
\ir ../migrations/20261101040000_shopping_push.sql
insert into auth.users values ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002'), ('10000000-0000-4000-8000-000000000003');
create function pg_temp.check_true(value boolean) returns void language plpgsql as $$ begin
  if value is distinct from true then raise exception 'Push assertion failed'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.create_household() as pair \gset
select public.create_household_invitation() as code \gset
select pg_temp.check_true(public.push_configuration() is null);
insert into public.shopping_items(household_id, name) values(public.current_household(), 'Historical synthetic item');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.join_household(:'code');
reset role;
select pg_temp.check_true((select count(*) = 0 from together_private.push_jobs));
-- Public test key is a structurally valid uncompressed EC point; never sent externally.
update together_private.push_settings set enabled = true, public_key = 'B' || repeat('A', 86);
select set_config('test.subscription', jsonb_build_object('endpoint', 'https://web.push.apple.com/synthetic-partner', 'keys', jsonb_build_object('p256dh', 'B' || repeat('A', 86), 'auth', repeat('A', 22)))::text, false);
set role authenticated;
select pg_temp.check_true(public.push_configuration()->>'publicKey' is not null);
select public.register_push_subscription(current_setting('test.subscription')::jsonb) as device \gset
select pg_temp.check_true(public.register_push_subscription(current_setting('test.subscription')::jsonb) = :'device');
do $$ begin
 begin perform * from public.push_subscriptions; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
do $$ begin
  begin perform public.register_push_subscription(jsonb_set(current_setting('test.subscription')::jsonb, '{endpoint}', '"https://127.0.0.1/internal"')); raise exception 'TEST FAILED';
  exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
  begin perform public.register_push_subscription(jsonb_set(current_setting('test.subscription')::jsonb, '{keys,auth}', '"bad"')); raise exception 'TEST FAILED';
  exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
  begin perform public.claim_push_jobs(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin perform public.push_delivery(gen_random_uuid(), gen_random_uuid()); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin perform public.finish_push_job(gen_random_uuid(), gen_random_uuid(), 'sent'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin perform * from together_private.push_jobs; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin delete from public.push_subscriptions; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$ begin
 begin perform * from public.push_subscriptions; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
do $$ begin
  begin perform public.register_push_subscription(current_setting('test.subscription')::jsonb); raise exception 'TEST FAILED';
  exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
end $$;
select public.unregister_push_subscription('https://web.push.apple.com/synthetic-partner');
insert into public.shopping_items(household_id, name) values(public.current_household(), 'Synthetic private purchase') returning id as item \gset
update public.shopping_items set bought = true where id = :'item';
update public.shopping_items set bought = true where id = :'item';
update public.shopping_items set bought = false where id = :'item';
delete from public.shopping_items where id = :'item';
reset role;
select pg_temp.check_true((select count(*) = 3 and count(distinct kind) = 3 from together_private.push_jobs));
select pg_temp.check_true((select bool_and(recipient_id <> actor_id and recipient_id = '10000000-0000-4000-8000-000000000002') from together_private.push_jobs));
set role service_role;
select id as job, claim_token as token from public.claim_push_jobs() limit 1 \gset
select pg_temp.check_true(public.push_delivery(:'job', :'token')->>'endpoint' = 'https://web.push.apple.com/synthetic-partner');
select pg_temp.check_true((select count(*) = 0 from public.claim_push_jobs()));
select pg_temp.check_true(public.push_delivery(:'job', gen_random_uuid()) is null);
select public.finish_push_job(:'job', gen_random_uuid(), 'sent');
select pg_temp.check_true(public.push_delivery(:'job', :'token') is not null);
select public.finish_push_job(:'job', :'token', 'retry');
reset role;
select pg_temp.check_true((select attempts = 1 and claim_token is null and available_at > now() from together_private.push_jobs where id = :'job'));
-- Membership revocation prevents delivery even after an earlier claim.
select id as member_job, claim_token as member_token from together_private.push_jobs where claim_token is not null limit 1 \gset
set role service_role;
select pg_temp.check_true(public.push_delivery(:'member_job', :'member_token') is not null);
reset role;
delete from public.household_members where user_id = '10000000-0000-4000-8000-000000000002';
set role service_role;
select pg_temp.check_true(public.push_delivery(:'member_job', :'member_token') is null);
reset role;
insert into public.household_members(user_id, household_id) values('10000000-0000-4000-8000-000000000002', :'pair');
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select public.create_household();
do $$ begin
 begin perform * from public.push_subscriptions; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
select public.unregister_push_subscription('https://web.push.apple.com/synthetic-partner');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
do $$ begin
  for i in 1..4 loop
    perform public.register_push_subscription(jsonb_set(current_setting('test.subscription')::jsonb, '{endpoint}', to_jsonb('https://web.push.apple.com/synthetic-' || i)));
  end loop;
  begin perform public.register_push_subscription(jsonb_set(current_setting('test.subscription')::jsonb, '{endpoint}', '"https://web.push.apple.com/sixth"')); raise exception 'TEST FAILED';
  exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
end $$;
select public.unregister_push_subscription('https://web.push.apple.com/synthetic-partner');
reset role;
select pg_temp.check_true((select count(*) = 0 from together_private.push_jobs));
-- Exhausted and expired entries are removed; permanent provider errors revoke the device.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
insert into public.shopping_items(household_id, name) values(public.current_household(), 'Retry synthetic');
reset role;
update together_private.push_jobs set attempts = 5, available_at = now() - interval '1 second';
set role service_role;
select pg_temp.check_true((select count(*) = 0 from public.claim_push_jobs()));
reset role;
select pg_temp.check_true((select count(*) = 0 from together_private.push_jobs));
set role authenticated;
insert into public.shopping_items(household_id, name) values(public.current_household(), 'Expiry synthetic');
reset role;
update together_private.push_jobs set expires_at = now() - interval '1 second';
set role service_role;
select pg_temp.check_true((select count(*) = 0 from public.claim_push_jobs()));
reset role;
set role authenticated;
insert into public.shopping_items(household_id, name) values(public.current_household(), 'Gone synthetic');
reset role;
set role service_role;
select id as job, claim_token as token from public.claim_push_jobs() limit 1 \gset
select public.finish_push_job(:'job', :'token', 'gone');
select pg_temp.check_true(public.push_delivery(:'job', :'token') is null);
reset role;
select pg_temp.check_true((select count(*) = 3 from public.push_subscriptions));
set role anon;
do $$ begin
 begin perform public.push_configuration(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin perform public.register_push_subscription('{}'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin perform public.claim_push_jobs(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin perform * from public.push_subscriptions; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Push access, queue, leases, revocation, retries and expiry passed';
