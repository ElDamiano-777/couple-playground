\set ON_ERROR_STOP on
-- Run only in an empty disposable PostgreSQL instance, never in the live project.
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261101021000_account_deletion.sql
\ir ../migrations/20261105010000_prevent_duplicate_active_shopping_items.sql
insert into auth.users values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003'),
 ('00000000-0000-4000-8000-000000000004');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select public.create_household() as household \gset
select public.create_household_invitation() as invitation \gset
select public.create_household_invitation() as replacement \gset
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
-- A replaced invitation cannot be redeemed.
select set_config('test.old_invitation', :'invitation', false);
do $$ begin
 begin perform public.join_household(current_setting('test.old_invitation')); raise exception 'TEST FAILED';
 exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
end $$;
select public.join_household(:'replacement');
insert into public.shopping_items(household_id, name, category) values (:'household', 'Synthetic bread', 'Home');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin
 if (select count(*) from public.shopping_items) <> 1 then raise exception 'Partner cannot read'; end if;
 begin insert into public.shopping_items(household_id, name, category) values (public.current_household(), '  SYNTHETIC BREAD  ', 'Home'); raise exception 'TEST FAILED';
 exception when unique_violation then null; end;
end $$;
update public.shopping_items set bought = true;
insert into public.shopping_items(household_id, name, category) values (public.current_household(), 'Synthetic bread', 'Home');
-- A member cannot forge item ownership or change pair IDs.
do $$ begin
 begin update public.shopping_items set created_by = auth.uid(); raise exception 'TEST FAILED';
 exception when insufficient_privilege then null; end;
 begin insert into public.household_members values (gen_random_uuid(), gen_random_uuid(), now()); raise exception 'TEST FAILED';
 exception when insufficient_privilege then null; end;
 begin perform public.create_household_invitation(); raise exception 'TEST FAILED';
 exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
select set_config('test.used_invitation', :'replacement', false);
do $$ begin
 if (select count(*) from public.shopping_items) <> 0 or (select count(*) from public.household_members) <> 0 or (select count(*) from public.households) <> 0 then raise exception 'Third account can read'; end if;
 begin perform public.join_household(current_setting('test.used_invitation')); raise exception 'TEST FAILED';
 exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
end $$;
-- A foreign account cannot update/delete or insert into a known pair.
update public.shopping_items set bought = false;
delete from public.shopping_items;
select set_config('test.household', :'household', false);
do $$ begin
 begin insert into public.shopping_items(household_id, name) values (current_setting('test.household')::uuid, 'Foreign'); raise exception 'TEST FAILED';
 exception when insufficient_privilege then null; end;
end $$;
select public.create_household() as foreign_household \gset
select public.create_household_invitation() as expired \gset
reset role;
update together_private.invitations set expires_at = now() - interval '1 second';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', false);
select set_config('test.expired', :'expired', false);
do $$ begin
 begin perform public.join_household(current_setting('test.expired')); raise exception 'TEST FAILED';
 exception when raise_exception then if sqlerrm = 'TEST FAILED' then raise; end if; end;
end $$;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
 begin perform * from public.shopping_items; raise exception 'TEST FAILED';
 exception when insufficient_privilege then null; end;
 begin perform public.create_household(); raise exception 'TEST FAILED';
 exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
do $$ begin
 if (select count(*) from public.shopping_items where bought) <> 1 then raise exception 'Foreign writes changed data'; end if;
end $$;
delete from public.shopping_items;
insert into public.shopping_items(household_id, name) values (public.current_household(), 'Preserve for partner');
select public.delete_my_account();
do $$ begin
 if public.current_household() is not null then raise exception 'Deleted account retains membership'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin
 if (select count(*) from public.shopping_items where created_by is null) <> 1 then raise exception 'Partner purchases not preserved'; end if;
end $$;
select public.delete_my_account();
reset role;
select set_config('test.deleted_household', :'household', false);
do $$ begin
 if exists (select 1 from public.households where id = current_setting('test.deleted_household')::uuid) then raise exception 'Empty home was not deleted'; end if;
end $$;
select 'Shared access and forbidden direct requests passed' as result;
