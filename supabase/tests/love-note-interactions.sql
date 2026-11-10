\set ON_ERROR_STOP on
-- Disposable PostgreSQL only.
create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261105050000_shared_expenses_and_partner_notes.sql
\ir ../migrations/20261110030000_scheduled_love_notes.sql
\ir ../migrations/20261110060000_love_note_reactions_favorites.sql
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'), ('00000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.create_household() as household \gset
insert into public.partner_notes(household_id,sender,body) values (:'household','masha','Letter') returning id as note \gset
insert into public.partner_notes(household_id,sender,body,deliver_at) values (:'household','masha','Future',clock_timestamp()+interval '5 seconds') returning id as future_note \gset
select set_config('test.note', :'note',false),set_config('test.future', :'future_note',false);
insert into public.partner_note_reactions(note_id,user_id,reaction) values (:'note',auth.uid(),'❤️');
insert into public.partner_note_favorites(note_id,user_id) values (:'note',auth.uid());
do $$ begin
 begin insert into public.partner_note_reactions(note_id,user_id,reaction) values (current_setting('test.future')::uuid,auth.uid(),'🥰'); raise exception 'Pending reaction accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.partner_note_favorites(note_id,user_id) values (current_setting('test.future')::uuid,auth.uid()); raise exception 'Pending favorite accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.partner_note_reactions(note_id,user_id,reaction) values (current_setting('test.note')::uuid,auth.uid(),'😂'); raise exception 'Duplicate reaction accepted'; exception when unique_violation then null; end;
end $$;
select public.create_household_invitation() as invitation \gset
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.join_household(:'invitation');
do $$ begin
 if (select count(*) from public.partner_note_reactions) <> 0 then raise exception 'Unopened reaction visible'; end if;
 if (select count(*) from public.partner_note_favorites) <> 0 then raise exception 'Other user favorite visible'; end if;
 begin insert into public.partner_note_reactions(note_id,user_id,reaction) values (current_setting('test.note')::uuid,auth.uid(),'😂'); raise exception 'Unopened reaction accepted'; exception when insufficient_privilege then null; end;
 insert into public.partner_note_favorites(note_id,user_id) values (current_setting('test.note')::uuid,auth.uid());
 insert into public.partner_note_reads(note_id,user_id) values (current_setting('test.note')::uuid,auth.uid());
 insert into public.partner_note_reactions(note_id,user_id,reaction) values (current_setting('test.note')::uuid,auth.uid(),'🥰');
 if (select count(*) from public.partner_note_reactions) <> 2 then raise exception 'Both reactions not visible'; end if;
 update public.partner_note_reactions set reaction='😂' where note_id=current_setting('test.note')::uuid and user_id=auth.uid();
 update public.partner_note_reactions set reaction='😂' where user_id <> auth.uid(); if found then raise exception 'Other reaction updated'; end if;
 delete from public.partner_note_favorites where user_id <> auth.uid(); if found then raise exception 'Other favorite deleted'; end if;
 begin insert into public.partner_note_reactions(note_id,user_id,reaction) values (current_setting('test.note')::uuid,'00000000-0000-4000-8000-000000000003','😂'); raise exception 'Forged reaction accepted'; exception when insufficient_privilege then null; end;
 delete from public.partner_note_reactions where user_id=auth.uid();
 if (select count(*) from public.partner_note_reactions) <> 1 then raise exception 'Reaction removal failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ begin if (select count(*) from public.partner_note_reactions) <> 0 or (select count(*) from public.partner_note_favorites) <> 0 then raise exception 'Outsider can read interactions'; end if; end $$;
select pg_sleep(5.5);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ begin
 insert into public.partner_note_reactions(note_id,user_id,reaction) values (current_setting('test.future')::uuid,auth.uid(),'❤️');
 insert into public.partner_note_favorites(note_id,user_id) values (current_setting('test.future')::uuid,auth.uid());
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$ begin
 if exists(select 1 from public.partner_note_reactions where note_id=current_setting('test.future')::uuid) then raise exception 'Reaction visible before opening'; end if;
 insert into public.partner_note_reads(note_id,user_id) values (current_setting('test.future')::uuid,auth.uid());
 if (select count(*) from public.partner_note_reactions where note_id=current_setting('test.future')::uuid) <> 1 then raise exception 'Released reaction not visible after opening'; end if;
 if exists(select 1 from public.partner_note_favorites where note_id=current_setting('test.future')::uuid) then raise exception 'Partner favorite leaked'; end if;
end $$;
