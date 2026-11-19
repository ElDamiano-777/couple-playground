\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261101070000_folder_entries.sql
insert into auth.users values ('30000000-0000-4000-8000-000000000001'), ('30000000-0000-4000-8000-000000000002'), ('30000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',false);
select public.create_household() as pair \gset
select public.create_household_invitation() as invitation \gset
insert into public.folder_entries(household_id,kind,title,notes) values(public.current_household(),'wish','Existing','Preserved') returning id as oldwish \gset
insert into public.folder_entries(household_id,kind,title) values(public.current_household(),'place','Shared place') returning id as sharedplace \gset
reset role;
\ir ../migrations/20261119010000_personal_wishlists.sql
create function pg_temp.check_true(value boolean) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'Wishlist assertion failed'; end if; end $$;
set role authenticated;
select pg_temp.check_true((select title='Existing' and notes='Preserved' and wish_priority='idea' from public.folder_entries where id=:'oldwish'));
insert into public.folder_entries(household_id,kind,title,wish_url,wish_photo,wish_price_cents,wish_priority,notes) values(public.current_household(),'wish','Masha wish','https://example.com/item','data:image/jpeg;base64,dGVzdA==',2500,'dream','Blue') returning id as mashawish \gset
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',false);
select public.join_household(:'invitation');
select pg_temp.check_true((select count(*)=2 from public.folder_entries where kind='wish'));
update public.folder_entries set title='Partner can edit place' where id=:'sharedplace';
select pg_temp.check_true((select title='Partner can edit place' from public.folder_entries where id=:'sharedplace'));
update public.folder_entries set title='Forbidden' where id=:'mashawish';
delete from public.folder_entries where id=:'mashawish';
select pg_temp.check_true((select title='Masha wish' from public.folder_entries where id=:'mashawish'));
insert into public.wish_gift_plans(wish_id) values(:'mashawish');
select pg_temp.check_true((select count(*)=1 from public.wish_gift_plans));
insert into public.folder_entries(household_id,kind,title) values(public.current_household(),'wish','Damian wish') returning id as damianwish \gset
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',false);
select pg_temp.check_true((select count(*)=0 from public.wish_gift_plans));
insert into public.wish_gift_plans(wish_id) values(:'damianwish');
select pg_temp.check_true((select count(*)=1 from public.wish_gift_plans));
update public.folder_entries set wish_fulfilled_at=now() where id=:'mashawish';
select pg_temp.check_true((select wish_fulfilled_at is not null from public.folder_entries where id=:'mashawish'));
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',false);
select pg_temp.check_true((select count(*)=1 and bool_and(wish_id=:'mashawish') from public.wish_gift_plans));
delete from public.wish_gift_plans where wish_id=:'mashawish';
select pg_temp.check_true((select count(*)=0 from public.wish_gift_plans));
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',false);
select public.create_household();
select set_config('test.foreign_wish', :'mashawish', false);
do $$ begin begin insert into public.wish_gift_plans(wish_id) values(current_setting('test.foreign_wish')::uuid); raise exception 'Foreign plan unexpectedly allowed'; exception when insufficient_privilege then null; end; end $$;
select pg_temp.check_true((select count(*)=0 from public.folder_entries));
select pg_temp.check_true((select count(*)=0 from public.wish_gift_plans));
set role anon;
select set_config('request.jwt.claim.sub','',false);
do $$ begin
  begin perform * from public.wish_gift_plans; raise exception 'Anonymous plan access unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
