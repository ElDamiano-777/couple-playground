\set ON_ERROR_STOP on
-- Run only in an empty disposable PostgreSQL instance.
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261110020000_shared_love_notes.sql
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'), ('00000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select public.create_household() as household \gset
insert into public.shared_love_notes(household_id, title, body) values (:'household', 'Title', 'Body') returning id as note \gset
select public.create_household_invitation() as invitation \gset
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select public.join_household(:'invitation');
do $$ begin
 if (select count(*) from public.shared_love_notes) <> 1 then raise exception 'Partner cannot read shared note'; end if;
 update public.shared_love_notes set title = 'Edited' where revision = 1;
 if not found then raise exception 'Partner cannot edit shared note'; end if;
 update public.shared_love_notes set body = 'Stale overwrite' where revision = 1;
 if found then raise exception 'Stale edit overwrote current note'; end if;
 begin update public.shared_love_notes set revision = 1; raise exception 'Revision can be forged'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
do $$ begin
 if (select count(*) from public.shared_love_notes) <> 0 then raise exception 'Outsider can read notes'; end if;
 update public.shared_love_notes set body = 'Outside'; if found then raise exception 'Outsider can edit'; end if;
 delete from public.shared_love_notes; if found then raise exception 'Outsider can delete'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin if (select title from public.shared_love_notes) <> 'Edited' then raise exception 'Shared edit not visible'; end if; end $$;
reset role;
delete from auth.users where id = '00000000-0000-4000-8000-000000000001';
do $$ begin if (select count(*) from public.shared_love_notes where created_by is null) <> 1 then raise exception 'Account deletion should preserve shared notes'; end if; end $$;
