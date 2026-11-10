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
\ir ../migrations/20261105050000_shared_expenses_and_partner_notes.sql
\ir ../migrations/20261110030000_scheduled_love_notes.sql
\ir ../migrations/20261110040000_scheduled_note_status.sql
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'), ('00000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select public.create_household() as household \gset
insert into public.partner_notes(household_id,sender,body) values (:'household','masha','Immediate');
insert into public.partner_notes(household_id,sender,body,deliver_at) values (:'household','masha','Secret',clock_timestamp()+interval '4 seconds') returning id as note \gset
select set_config('test.note_id', :'note', false);
update public.partner_notes set body='Edited secret' where id=:'note';
do $$ begin if (select status from public.scheduled_love_note_status() where note_id=current_setting('test.note_id')::uuid) <> 'scheduled' then raise exception 'Scheduled status incorrect'; end if; end $$;
insert into public.partner_notes(household_id,sender,body,deliver_at) values (:'household','masha','Cancelled',clock_timestamp()+interval '1 day');
delete from public.partner_notes where body='Cancelled';
do $$ begin
 begin update public.partner_notes set deliver_at=clock_timestamp()-interval '1 second' where id=current_setting('test.note_id')::uuid; raise exception 'Past update accepted'; exception when raise_exception then if sqlerrm = 'Past update accepted' then raise; end if; end;
 begin insert into public.partner_notes(household_id,sender,body,deliver_at) values (public.current_household(),'masha','Past',clock_timestamp()-interval '1 second'); raise exception 'Past insert accepted'; exception when raise_exception then if sqlerrm = 'Past insert accepted' then raise; end if; end;
end $$;
select public.create_household_invitation() as invitation \gset
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select public.join_household(:'invitation');
do $$ begin
 if (select count(*) from public.partner_notes) <> 1 then raise exception 'Scheduled note visible before delivery'; end if;
 if (select count(*) from public.scheduled_love_note_status()) <> 0 then raise exception 'Recipient can see sender status'; end if;
 if exists(select 1 from public.partner_notes where id=current_setting('test.note_id')::uuid) then raise exception 'Scheduled metadata visible'; end if;
 begin insert into public.partner_note_reads(note_id,user_id) values (current_setting('test.note_id')::uuid,auth.uid()); raise exception 'Premature read accepted'; exception when insufficient_privilege then null; end;
end $$;
select pg_sleep(4.5);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin if (select status from public.scheduled_love_note_status() where note_id=current_setting('test.note_id')::uuid) <> 'unconfirmed' then raise exception 'Unopened note was marked delivered'; end if; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
do $$ begin
 if (select count(*) from public.partner_notes where id=current_setting('test.note_id')::uuid and body='Edited secret') <> 1 then raise exception 'Scheduled note not released once'; end if;
 if exists(select 1 from public.partner_note_reads where note_id=current_setting('test.note_id')::uuid) then raise exception 'Delivered note is not unread'; end if;
 insert into public.partner_note_reads(note_id,user_id) values (current_setting('test.note_id')::uuid,auth.uid());
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin
 if (select status from public.scheduled_love_note_status() where note_id=current_setting('test.note_id')::uuid) <> 'delivered' then raise exception 'Opened note not confirmed'; end if;
 delete from public.partner_notes where id=current_setting('test.note_id')::uuid;
 if found then raise exception 'Delivered surprise was cancelled'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
do $$ begin if (select count(*) from public.partner_notes) <> 0 then raise exception 'Outsider can read notes'; end if; end $$;
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
do $$ begin if exists(select 1 from public.partner_notes) then raise exception 'Account deletion failed to cascade'; end if; end $$;
