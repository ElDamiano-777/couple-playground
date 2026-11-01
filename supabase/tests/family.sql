\set ON_ERROR_STOP on
-- Isolated synthetic accounts/data only; never run on a hosted database.
\ir access.sql
\ir ../migrations/20261101050000_family_profiles.sql
insert into auth.users values
 ('20000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000003');
create function pg_temp.check_true(value boolean) returns void language plpgsql as $$ begin
  if value is distinct from true then raise exception 'Family assertion failed'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
select public.create_household() as pair \gset
select public.create_household_invitation() as invitation \gset
insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'child', 'Synthetic child') returning id as child \gset
insert into public.family_profiles(household_id, kind, name, animal_type) values(public.current_household(), 'pet', 'Synthetic pet', 'Cat') returning id as pet \gset
select pg_temp.check_true((select count(*) = 2 and bool_and(created_by = auth.uid()) from public.family_profiles));
select set_config('test.pair', :'pair', false);
select set_config('test.child', :'child', false);
select set_config('test.pet', :'pet', false);
-- Clients cannot forge IDs/authorship/timestamps or move/change the kind of a profile.
do $$ begin
 begin insert into public.family_profiles(id, household_id, kind, name) values(gen_random_uuid(), public.current_household(), 'child', 'Forged'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin insert into public.family_profiles(household_id, kind, name, created_by) values(public.current_household(), 'child', 'Forged', auth.uid()); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.family_profiles set created_by = auth.uid(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.family_profiles set household_id = public.current_household(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.family_profiles set kind = 'pet'; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.family_profiles set id = gen_random_uuid(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.family_profiles set created_at = now(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 -- Validate meaningful bounded fields, including direct API writes.
 begin insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'adult', 'Invalid'); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'child', ''); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'child', E'\t'); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'child', ' padded '); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'child', repeat('a',101)); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'child', null); raise exception 'TEST FAILED'; exception when not_null_violation then null; end;
 begin insert into public.family_profiles(household_id, kind, name, animal_type) values(public.current_household(), 'child', 'Invalid', 'Cat'); raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin update public.family_profiles set animal_type = 'Cat' where kind = 'child'; raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin update public.family_profiles set animal_type = '' where kind = 'pet'; raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin update public.family_profiles set animal_type = ' Cat ' where kind = 'pet'; raise exception 'TEST FAILED'; exception when check_violation then null; end;
 begin update public.family_profiles set animal_type = repeat('a',81) where kind = 'pet'; raise exception 'TEST FAILED'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
select public.join_household(:'invitation');
select pg_temp.check_true((select count(*) = 2 from public.family_profiles));
update public.family_profiles set name = 'Partner renamed child' where id = :'child';
update public.family_profiles set name = 'Partner renamed pet', animal_type = 'Dog' where id = :'pet';
insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'pet', 'Optional type') returning id as removable \gset
select pg_temp.check_true((select animal_type is null from public.family_profiles where id = :'removable'));
delete from public.family_profiles where id = :'removable';
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
select pg_temp.check_true((select name = 'Partner renamed child' from public.family_profiles where id = :'child'));
select pg_temp.check_true((select name = 'Partner renamed pet' and animal_type = 'Dog' from public.family_profiles where id = :'pet'));
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', false);
select public.create_household() as foreign_pair \gset
select pg_temp.check_true((select count(*) = 0 from public.family_profiles));
update public.family_profiles set name = 'Foreign overwrite' where id = :'child';
delete from public.family_profiles where id = :'pet';
do $$ begin
 begin insert into public.family_profiles(household_id, kind, name) values(current_setting('test.pair')::uuid, 'child', 'Foreign insert'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
insert into public.family_profiles(household_id, kind, name) values(public.current_household(), 'pet', 'Foreign own pet');
select pg_temp.check_true((select count(*) = 1 from public.family_profiles));
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
 begin perform * from public.family_profiles; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin insert into public.family_profiles(household_id, kind, name) values(current_setting('test.pair')::uuid, 'child', 'Anonymous'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin update public.family_profiles set name = 'Anonymous'; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
 begin delete from public.family_profiles; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
select pg_temp.check_true((select count(*) = 2 from public.family_profiles));
select pg_temp.check_true((select name = 'Partner renamed child' from public.family_profiles where id = :'child'));
select public.delete_my_account();
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
select pg_temp.check_true((select count(*) = 2 and bool_and(created_by is null) from public.family_profiles));
update public.family_profiles set name = 'Preserved after creator deletion' where id = :'child';
delete from public.family_profiles where id = :'pet';
select pg_temp.check_true((select count(*) = 1 from public.family_profiles));
select public.delete_my_account();
reset role;
select pg_temp.check_true(not exists(select 1 from public.family_profiles where household_id = :'pair'));
select pg_temp.check_true(not exists(select 1 from public.households where id = :'pair'));
select pg_temp.check_true((select count(*) = 1 from public.family_profiles where household_id = :'foreign_pair'));
select 'Family member CRUD, field constraints, isolation, forgery rejection and account deletion passed';
