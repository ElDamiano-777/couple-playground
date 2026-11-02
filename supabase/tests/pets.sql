\set ON_ERROR_STOP on
\ir family.sql
\ir ../migrations/20261102010000_pet_details_and_food.sql
insert into auth.users values ('30000000-0000-4000-8000-000000000001'), ('30000000-0000-4000-8000-000000000002'), ('30000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select public.create_household();
select public.create_household_invitation() as code \gset
insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'pet', 'Pet') returning id as pet_id \gset
insert into public.pet_details(pet_id, likes, photo) values(:'pet_id', 'Play', 'data:image/jpeg;base64,YQ==');
insert into public.pet_food(pet_id, name, photo) values(:'pet_id', 'Dinner', 'data:image/jpeg;base64,YQ==');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', false);
select public.join_household(:'code');
select pg_temp.check_true((select likes = 'Play' from public.pet_details where pet_id = :'pet_id'));
select pg_temp.check_true((select name = 'Dinner' from public.pet_food where pet_id = :'pet_id'));
insert into public.pet_details(pet_id, likes) values (:'pet_id', 'Sleep') on conflict (pet_id) do update set pet_id = excluded.pet_id, likes = excluded.likes;
select pg_temp.check_true((select likes = 'Sleep' from public.pet_details where pet_id = :'pet_id'));
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
select public.create_household();
select pg_temp.check_true((select count(*) = 0 from public.pet_details));
select pg_temp.check_true((select count(*) = 0 from public.pet_food));
select set_config('test.pet_id', :'pet_id', false);
do $$ begin
  begin insert into public.pet_details(pet_id) values(current_setting('test.pet_id')::uuid); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin insert into public.pet_food(pet_id, name) values(current_setting('test.pet_id')::uuid, 'Forbidden'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from public.pet_details; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin perform * from public.pet_food; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
reset role;
\ir ../migrations/20261102020000_pet_food_preferences.sql
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select pg_temp.check_true((select name = 'Dinner' and notes = '' and photo is not null from public.pet_food where pet_id = :'pet_id'));
update public.pet_food set notes = 'Dinner note', food_type = 'Wet' where pet_id = :'pet_id';
insert into public.pet_dislikes(pet_id, ingredient, food_type, notes) values(:'pet_id', 'Chicken', 'Wet', 'Preference');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', false);
select pg_temp.check_true((select notes = 'Dinner note' from public.pet_food where pet_id = :'pet_id'));
select pg_temp.check_true((select ingredient = 'Chicken' and food_type = 'Wet' from public.pet_dislikes where pet_id = :'pet_id'));
update public.pet_dislikes set ingredient = 'Turkey' where pet_id = :'pet_id';
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
select pg_temp.check_true((select count(*) = 0 from public.pet_dislikes));
with changed as (update public.pet_dislikes set ingredient = 'Forged' where pet_id = :'pet_id' returning 1) select pg_temp.check_true((select count(*) = 0 from changed));
with changed as (delete from public.pet_food where pet_id = :'pet_id' returning 1) select pg_temp.check_true((select count(*) = 0 from changed));
do $$ begin
  begin insert into public.pet_dislikes(pet_id, ingredient, food_type) values(current_setting('test.pet_id')::uuid, 'Forbidden', 'Wet'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select pg_temp.check_true((select ingredient = 'Turkey' from public.pet_dislikes where pet_id = :'pet_id'));
select pg_temp.check_true((select name = 'Dinner' and photo is not null from public.pet_food where pet_id = :'pet_id'));
reset role;
set role anon;
do $$ begin
  begin perform * from public.pet_dislikes; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
reset role;
\ir ../migrations/20261102030000_pet_food_package_size.sql
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select pg_temp.check_true((select name = 'Dinner' and photo is not null and notes = 'Dinner note' and package_size = '' from public.pet_food where pet_id = :'pet_id'));
update public.pet_food set package_size = '1.8 kg' where pet_id = :'pet_id';
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', false);
select pg_temp.check_true((select package_size = '1.8 kg' and photo is not null from public.pet_food where pet_id = :'pet_id'));
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
select pg_temp.check_true((select count(*) = 0 from public.pet_food));
