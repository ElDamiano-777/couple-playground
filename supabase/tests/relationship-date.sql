\set ON_ERROR_STOP on
-- Run in an empty disposable PostgreSQL instance.
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261110010000_relationship_start_date.sql
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'), ('00000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select public.create_household() as household \gset
update public.households set relationship_start_date = '2020-02-29' where id = :'household';
select public.create_household_invitation() as invitation \gset
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select public.join_household(:'invitation');
do $$ begin
 if (select relationship_start_date from public.households) <> date '2020-02-29' then raise exception 'Partner cannot read date'; end if;
 update public.households set relationship_start_date = '2021-01-01';
 begin update public.households set relationship_start_date = current_date + 1; raise exception 'Future date accepted'; exception when check_violation then null; end;
 begin update public.households set id = gen_random_uuid(); raise exception 'Household ID update accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
do $$ begin
 if (select count(*) from public.households) <> 0 then raise exception 'Outsider can read household'; end if;
 update public.households set relationship_start_date = '2000-01-01';
 if found then raise exception 'Outsider can update household'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin
 if (select relationship_start_date from public.households) <> date '2021-01-01' then raise exception 'Partner edit not shared'; end if;
end $$;
