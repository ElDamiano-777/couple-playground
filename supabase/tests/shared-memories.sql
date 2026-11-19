\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261119030000_shared_memories.sql
create function pg_temp.check_true(value boolean) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'Memory assertion failed'; end if; end $$;
insert into auth.users values ('30000000-0000-4000-8000-000000000001'), ('30000000-0000-4000-8000-000000000002'), ('30000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',false);
select public.create_household() as pair \gset
select public.create_household_invitation() as invitation \gset
insert into public.shared_memories(household_id,title,event_date,story,photos,cover_index) values(public.current_household(),'A moment','2025-01-02','Our story','["data:image/jpeg;base64,dGVzdA==","data:image/jpeg;base64,dGVzdA==","data:image/jpeg;base64,dGVzdA==","data:image/jpeg;base64,dGVzdA==","data:image/jpeg;base64,dGVzdA=="]',2) returning id as memory \gset
select set_config('test.memory', :'memory', false);
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',false);
select public.join_household(:'invitation');
select pg_temp.check_true((select jsonb_array_length(photos)=5 and cover_index=2 and story='Our story' from public.shared_memories where id=:'memory'));
update public.shared_memories set title='Together', story='More of our story' where id=:'memory' and revision=1;
select pg_temp.check_true((select title='Together' and story='More of our story' and jsonb_array_length(photos)=5 and revision=2 from public.shared_memories where id=:'memory'));
update public.shared_memories set title='Stale' where id=:'memory' and revision=1;
select pg_temp.check_true((select title='Together' from public.shared_memories where id=:'memory'));
do $$ begin
 begin insert into public.shared_memories(household_id,title,event_date,photos) values(public.current_household(),'Invalid','2025-01-01','["http://public.example/image.jpg"]'); raise exception 'Invalid photo allowed'; exception when check_violation then null; end;
 begin insert into public.shared_memories(household_id,title,event_date,photos) values(public.current_household(),'Too many','2025-01-01','["data:image/jpeg;base64,dA==","data:image/jpeg;base64,dA==","data:image/jpeg;base64,dA==","data:image/jpeg;base64,dA==","data:image/jpeg;base64,dA==","data:image/jpeg;base64,dA=="]'); raise exception 'Six photos allowed'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',false);
select public.create_household();
select pg_temp.check_true((select count(*)=0 from public.shared_memories));
update public.shared_memories set title='Foreign' where id=:'memory';
delete from public.shared_memories where id=:'memory';
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',false);
select pg_temp.check_true((select title='Together' and jsonb_array_length(photos)=5 from public.shared_memories where id=:'memory'));
set role anon;
select set_config('request.jwt.claim.sub','',false);
do $$ begin begin perform * from public.shared_memories; raise exception 'Anonymous access allowed'; exception when insufficient_privilege then null; end; end $$;
