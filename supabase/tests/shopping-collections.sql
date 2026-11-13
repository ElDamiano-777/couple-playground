\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261101050000_family_profiles.sql
\ir ../migrations/20261102010000_pet_details_and_food.sql
\ir ../migrations/20261103010000_shopping_favorites.sql
\ir ../migrations/20261113010000_shopping_collections.sql
insert into auth.users values ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002'), ('10000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select public.create_household() as home \gset
select public.create_household_invitation() as code \gset
insert into public.shopping_collections (household_id, name) values (public.current_household(), 'Birthday') returning id as collection \gset
insert into public.shopping_collection_items (household_id, collection_id, name, category, notes) values (public.current_household(), :'collection', 'Cake', 'Home', '2');
insert into public.shopping_collection_items (household_id, builtin_key, name, category) values (public.current_household(), 'party', 'Cake', 'Home');
insert into public.shopping_items (household_id, name, category) values (public.current_household(), 'Cake', 'Home');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.join_household(:'code');
update public.shopping_collection_items set bought = true where collection_id = :'collection';
do $$ begin if (select count(*) from public.shopping_collection_items where bought) <> 1 then raise exception 'partner update failed'; end if; end $$;
select set_config('test.collection', :'collection', false);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
select public.create_household();
do $$ begin
 if exists(select 1 from public.shopping_collection_items) or exists(select 1 from public.shopping_collections) then raise exception 'foreign household access'; end if;
 begin
  insert into public.shopping_collection_items (household_id, collection_id, name, category) values (public.current_household(), current_setting('test.collection')::uuid, 'Forbidden', 'Home');
  raise exception 'foreign collection insert succeeded';
 exception when foreign_key_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
delete from public.shopping_collections where id = :'collection';
do $$ begin if (select count(*) from public.shopping_items where name = 'Cake') <> 1 or (select count(*) from public.shopping_collection_items where builtin_key = 'party') <> 1 then raise exception 'unrelated items deleted'; end if; end $$;
