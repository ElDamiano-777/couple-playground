\set ON_ERROR_STOP on
-- Synthetic accounts and notes in an empty disposable PostgreSQL instance only.
create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261105050000_shared_expenses_and_partner_notes.sql
\ir ../migrations/20261110030000_scheduled_love_notes.sql
\ir ../migrations/20261110040000_scheduled_note_status.sql
\ir ../migrations/20261110050000_love_note_photos.sql
\ir ../migrations/20261110060000_love_note_reactions_favorites.sql
insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.create_household() as home \gset
select (public.save_partner_note_photos(null,null,null,'masha','Masha synthetic secret',null,'["data:image/jpeg;base64,YWJj"]')).id as masha_note \gset
select (public.save_partner_note_photos(null,null,null,'masha','Synthetic future',clock_timestamp()+interval '6 seconds','["data:image/jpeg;base64,YWJj"]')).id as future_note \gset
select (public.save_partner_note_photos(null,null,null,'masha','Synthetic cancel',clock_timestamp()+interval '1 hour','[]')).id as cancel_note \gset
select public.create_household_invitation() as invitation \gset
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.join_household(:'invitation');
select (public.save_partner_note_photos(null,null,null,'damian','Damian synthetic secret',null,'["data:image/jpeg;base64,YWJj"]')).id as damian_note \gset
select (public.save_partner_note_photos(null,null,null,'damian','Previously opened',null,'[]')).id as old_note \gset
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
insert into public.partner_note_reads(note_id,user_id) values (:'old_note',auth.uid());
select set_config('test.masha',:'masha_note',false),set_config('test.damian',:'damian_note',false),set_config('test.old',:'old_note',false),set_config('test.future',:'future_note',false),set_config('test.cancel',:'cancel_note',false);
reset role;
\ir ../migrations/20261110070000_seal_unread_love_notes.sql
set role authenticated;
do $$ begin
 begin perform body from public.partner_notes; raise exception 'Direct body query succeeded'; exception when insufficient_privilege then null; end;
 begin perform row_to_json(note) from public.partner_notes note; raise exception 'Whole row query succeeded'; exception when insufficient_privilege then null; end;
 begin perform id from public.partner_notes where body like '%secret%'; raise exception 'Body filter succeeded'; exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.partner_notes where id=current_setting('test.damian')::uuid) then raise exception 'Envelope metadata unavailable'; end if;
 if (select body from public.list_private_partner_notes() where id=current_setting('test.damian')::uuid) is not null then raise exception 'Unread Damian note leaked'; end if;
 if exists(select 1 from public.searchable_partner_notes() where body='Damian synthetic secret') then raise exception 'Unread note searchable'; end if;
 if (select body from public.list_private_partner_notes() where id=current_setting('test.old')::uuid) <> 'Previously opened' then raise exception 'Existing read receipt lost'; end if;
 if (select body from public.list_private_partner_notes() where id=current_setting('test.masha')::uuid) <> 'Masha synthetic secret' then raise exception 'Sender cannot read own note'; end if;
 delete from public.partner_notes where id=current_setting('test.cancel')::uuid;
 if not found then raise exception 'Scheduled cancellation failed'; end if;
 perform public.save_partner_note_photos(current_setting('test.masha')::uuid,null,(select updated_at from public.partner_notes where id=current_setting('test.masha')::uuid),'masha','Masha synthetic secret',null,'["data:image/jpeg;base64,YWJj"]');
 if (select count(*) from public.partner_note_photos where note_id=current_setting('test.masha')::uuid) <> 1 then raise exception 'Sent photo editing failed'; end if;
 if exists(select 1 from public.partner_note_photos where note_id=current_setting('test.damian')::uuid) then raise exception 'Unread attachment leaked'; end if;
 insert into public.partner_note_favorites(note_id,user_id) values(current_setting('test.damian')::uuid,auth.uid());
 insert into public.partner_note_reads(note_id,user_id) values(current_setting('test.damian')::uuid,auth.uid());
 if (select body from public.list_private_partner_notes() where id=current_setting('test.damian')::uuid) <> 'Damian synthetic secret' then raise exception 'Opened body unavailable'; end if;
 if not exists(select 1 from public.searchable_partner_notes() where body='Damian synthetic secret') then raise exception 'Opened note not searchable'; end if;
 if (select count(*) from public.partner_note_photos where note_id=current_setting('test.damian')::uuid) <> 1 then raise exception 'Opened photo unavailable'; end if;
 insert into public.partner_note_reactions(note_id,user_id,reaction) values(current_setting('test.damian')::uuid,auth.uid(),'❤️');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$ begin
 begin perform body from public.partner_notes; raise exception 'Direct body query succeeded'; exception when insufficient_privilege then null; end;
 if (select body from public.list_private_partner_notes() where id=current_setting('test.masha')::uuid) is not null then raise exception 'Unread Masha note leaked'; end if;
 if exists(select 1 from public.list_private_partner_notes() where id=current_setting('test.future')::uuid) then raise exception 'Future surprise metadata leaked'; end if;
 if exists(select 1 from public.searchable_partner_notes() where body='Synthetic future') then raise exception 'Future surprise searchable'; end if;
 if exists(select 1 from public.partner_note_photos where note_id=current_setting('test.future')::uuid) then raise exception 'Future attachment leaked'; end if;
 if (select body from public.list_private_partner_notes() where id=current_setting('test.damian')::uuid) <> 'Damian synthetic secret' then raise exception 'Sender cannot read own note'; end if;
 insert into public.partner_note_reads(note_id,user_id) values(current_setting('test.masha')::uuid,auth.uid());
 if (select body from public.list_private_partner_notes() where id=current_setting('test.masha')::uuid) <> 'Masha synthetic secret' then raise exception 'Opening Masha note failed'; end if;
 if (select count(*) from public.partner_note_photos where note_id=current_setting('test.masha')::uuid) <> 1 then raise exception 'Opened photo unavailable'; end if;
 insert into public.partner_note_reactions(note_id,user_id,reaction) values(current_setting('test.masha')::uuid,auth.uid(),'🥰');
 insert into public.partner_note_favorites(note_id,user_id) values(current_setting('test.masha')::uuid,auth.uid());
end $$;
select pg_sleep(6.5);
do $$ begin
 if (select body from public.list_private_partner_notes() where id=current_setting('test.future')::uuid) is not null then raise exception 'Released but unopened surprise leaked'; end if;
 insert into public.partner_note_reads(note_id,user_id) values(current_setting('test.future')::uuid,auth.uid());
 if (select body from public.list_private_partner_notes() where id=current_setting('test.future')::uuid) <> 'Synthetic future' then raise exception 'Opened surprise unavailable'; end if;
 if (select count(*) from public.partner_note_photos where note_id=current_setting('test.future')::uuid) <> 1 then raise exception 'Opened surprise photo unavailable'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ begin if exists(select 1 from public.list_private_partner_notes()) or exists(select 1 from public.partner_note_photos) then raise exception 'Outsider access'; end if; end $$;
