\set ON_ERROR_STOP on
-- Bootstrap only the relevant real migrations in an empty disposable database.
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
\ir ../migrations/20261101070000_folder_entries.sql
create function pg_temp.check_true(value boolean) returns void language plpgsql as $$ begin
 if value is distinct from true then raise exception 'Folder assertion failed'; end if;
end $$;
insert into auth.users values
 ('30000000-0000-4000-8000-000000000001'),
 ('30000000-0000-4000-8000-000000000002'),
 ('30000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select public.create_household() as pair \gset
select public.create_household_invitation() as invitation \gset
insert into public.folder_entries(household_id, kind, title, notes) values(public.current_household(), 'recipe', 'Synthetic recipe', E'First line\nSecond line') returning id as recipe \gset
insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'wish', 'Synthetic wish');
insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'place', 'Synthetic place');
select pg_temp.check_true((select count(*) = 3 and count(distinct kind) = 3 and bool_and(created_by = auth.uid()) from public.folder_entries));
select pg_temp.check_true((select notes = '' from public.folder_entries where kind = 'wish'));
select pg_temp.check_true((select notes = E'First line\nSecond line' from public.folder_entries where id = :'recipe'));
-- Upgrade an existing recipe in place; old notes and identity must survive.
reset role;
\ir ../migrations/20261103050000_recipe_library.sql
\ir ../migrations/20261103060000_recipe_import.sql
\ir ../migrations/20261103070000_recipe_servings.sql
set role authenticated;
select pg_temp.check_true((select notes = E'First line\nSecond line' and recipe_category is null and preparation_minutes is null and recipe_photo is null from public.folder_entries where id = :'recipe'));
select set_config('test.recipe', :'recipe', false);
update public.folder_entries set recipe_category = 'Breakfast', preparation_minutes = 20, recipe_photo = 'data:image/jpeg;base64,dGVzdA==', recipe_source_url = 'https://example.com/recipe', recipe_ingredients = '2 eggs', recipe_instructions = 'Mix', recipe_servings = '4 servings' where id = :'recipe';
do $$ begin
 begin update public.folder_entries set recipe_category = 'Invalid' where id = current_setting('test.recipe', true)::uuid; raise exception 'TEST FAILED'; exception when check_violation then null; end;
end $$;
select set_config('test.pair', :'pair', false);
select set_config('test.recipe', :'recipe', false);
do $$ begin
 begin insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'other', 'Invalid'); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'recipe', ''); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'wish', E'\t'); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'place', ' padded '); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'recipe', repeat('a',151)); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'recipe', null); raise exception 'TEST FAILED'; exception when not_null_violation then null; end;
 begin update public.folder_entries set notes = repeat('a',20001); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin update public.folder_entries set notes = null; raise exception 'TEST FAILED'; exception when not_null_violation then null; end;
 begin insert into public.folder_entries(id, household_id, kind, title) values(gen_random_uuid(), public.current_household(), 'wish', 'Forged'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin insert into public.folder_entries(household_id, kind, title, created_by) values(public.current_household(), 'wish', 'Forged', auth.uid()); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin insert into public.folder_entries(household_id, kind, title, created_at) values(public.current_household(), 'wish', 'Forged', now()); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.folder_entries set id = gen_random_uuid(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.folder_entries set kind = 'place'; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.folder_entries set household_id = public.current_household(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.folder_entries set created_by = auth.uid(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.folder_entries set created_at = now(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', false);
select public.join_household(:'invitation');
select pg_temp.check_true((select count(*) = 3 from public.folder_entries));
select pg_temp.check_true((select recipe_category = 'Breakfast' and preparation_minutes = 20 and recipe_photo = 'data:image/jpeg;base64,dGVzdA==' and recipe_source_url = 'https://example.com/recipe' and recipe_ingredients = '2 eggs' and recipe_instructions = 'Mix' and recipe_servings = '4 servings' from public.folder_entries where id = :'recipe'));
update public.folder_entries set title = 'Partner edited ' || kind, notes = E'Partner first line\nPartner second line';
insert into public.folder_entries(household_id, kind, title, notes)
 select public.current_household(), kind, repeat('a',150), repeat('b',20000) from unnest(array['recipe', 'wish', 'place']) as kind;
select pg_temp.check_true((select count(*) = 3 and bool_and(length(notes) = 20000) from public.folder_entries where title = repeat('a',150)));
delete from public.folder_entries where title = repeat('a',150);
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select pg_temp.check_true((select count(*) = 3 and bool_and(title = 'Partner edited ' || kind and notes = E'Partner first line\nPartner second line') from public.folder_entries));
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
select public.create_household() as foreign_pair \gset
select pg_temp.check_true((select count(*) = 0 from public.folder_entries));
select pg_temp.check_true((select count(*) = 0 from public.folder_entries where id = :'recipe'));
update public.folder_entries set title = 'Foreign', notes = 'Foreign' where id = :'recipe';
delete from public.folder_entries where id = :'recipe';
do $$ begin
 begin insert into public.folder_entries(household_id, kind, title) values(current_setting('test.pair')::uuid, 'recipe', 'Foreign insert'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
insert into public.folder_entries(household_id, kind, title) values(public.current_household(), 'wish', 'Foreign own record');
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
 begin perform title, notes from public.folder_entries where id = current_setting('test.recipe')::uuid; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin insert into public.folder_entries(household_id, kind, title) values(current_setting('test.pair')::uuid, 'place', 'Anonymous'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.folder_entries set notes = 'Anonymous' where id = current_setting('test.recipe')::uuid; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin delete from public.folder_entries where id = current_setting('test.recipe')::uuid; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select pg_temp.check_true((select count(*) = 3 and bool_and(title = 'Partner edited ' || kind and notes = E'Partner first line\nPartner second line') from public.folder_entries));
select public.delete_my_account();
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', false);
select pg_temp.check_true((select count(*) = 3 and bool_and(created_by is null) from public.folder_entries));
update public.folder_entries set notes = 'Preserved for partner';
select pg_temp.check_true((select count(*) = 3 and bool_and(notes = 'Preserved for partner') from public.folder_entries));
select public.delete_my_account();
reset role;
select pg_temp.check_true(not exists(select 1 from public.folder_entries where household_id = :'pair'));
select pg_temp.check_true(not exists(select 1 from public.households where id = :'pair'));
select pg_temp.check_true((select count(*) = 1 from public.folder_entries where household_id = :'foreign_pair'));
select 'Folder entries: three kinds, partner CRUD, multiline notes, isolation, constraints, immutable identity and account cleanup passed';
