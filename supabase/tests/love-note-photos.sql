\set ON_ERROR_STOP on
-- Disposable PostgreSQL only; all images below are synthetic.
create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
\ir ../migrations/20261101020000_shared_shopping.sql
\ir ../migrations/20261105050000_shared_expenses_and_partner_notes.sql
\ir ../migrations/20261110030000_scheduled_love_notes.sql
\ir ../migrations/20261110050000_love_note_photos.sql
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'), ('00000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select public.create_household() as household \gset
select (public.save_partner_note_photos(null,null,null,'masha','',null,'["data:image/jpeg;base64,YWJj"]'::jsonb)).id as immediate \gset
select (public.save_partner_note_photos(null,null,null,'masha','Surprise',clock_timestamp()+interval '4 seconds','["data:image/png;base64,YWJj"]'::jsonb)).id as surprise \gset
select set_config('test.immediate', :'immediate', false), set_config('test.surprise', :'surprise', false);
do $$ begin
 if (select count(*) from public.partner_note_photos) <> 2 then raise exception 'Author cannot see photos'; end if;
 begin perform public.save_partner_note_photos(null,null,null,'masha','',null,'[]'::jsonb); raise exception 'Empty note accepted'; exception when raise_exception then if sqlerrm='Empty note accepted' then raise; end if; end;
 begin perform public.save_partner_note_photos(null,null,null,'masha','hello',null,'["data:text/html;base64,YWJj"]'::jsonb); raise exception 'Invalid format accepted'; exception when raise_exception then if sqlerrm='Invalid format accepted' then raise; end if; end;
 begin perform public.save_partner_note_photos(null,null,null,'masha','hello',null,'["data:image/jpeg;base64,YWJj","data:image/jpeg;base64,YWJj","data:image/jpeg;base64,YWJj","data:image/jpeg;base64,YWJj","data:image/jpeg;base64,YWJj","data:image/jpeg;base64,YWJj"]'::jsonb); raise exception 'Too many photos accepted'; exception when raise_exception then if sqlerrm='Too many photos accepted' then raise; end if; end;
 if (select count(*) from public.partner_notes) <> 2 then raise exception 'Failed save left a broken note'; end if;
end $$;
do $$ declare original public.partner_notes; begin
 select * into original from public.partner_notes where id=current_setting('test.surprise')::uuid;
 perform public.save_partner_note_photos(original.id,original.deliver_at,original.updated_at,'masha','Updated',original.deliver_at,'["data:image/jpeg;base64,ZGVm","data:image/png;base64,YWJj"]'::jsonb);
 if (select count(*) from public.partner_note_photos where note_id=original.id) <> 2 then raise exception 'Scheduled attachment edit failed'; end if;
 begin perform public.save_partner_note_photos(original.id,original.deliver_at,original.updated_at,'masha','Stale',original.deliver_at,'[]'::jsonb); raise exception 'Stale edit accepted'; exception when raise_exception then if sqlerrm='Stale edit accepted' then raise; end if; end;
 if (select count(*) from public.partner_note_photos where note_id=original.id) <> 2 then raise exception 'Failed save removed attachments'; end if;
end $$;
select public.create_household_invitation() as invitation \gset
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select public.join_household(:'invitation');
do $$ begin
 if (select count(*) from public.partner_notes) <> 1 then raise exception 'Pending surprise visible'; end if;
 if (select count(*) from public.partner_note_photos) <> 0 then raise exception 'Photos visible before opening'; end if;
 begin insert into public.partner_note_reads(note_id,user_id) values (current_setting('test.surprise')::uuid,auth.uid()); raise exception 'Early read accepted'; exception when insufficient_privilege then null; end;
 insert into public.partner_note_reads(note_id,user_id) values (current_setting('test.immediate')::uuid,auth.uid());
 if (select count(*) from public.partner_note_photos) <> 1 then raise exception 'Opened photo inaccessible'; end if;
end $$;
select pg_sleep(4.5);
do $$ begin
 if (select count(*) from public.partner_notes) <> 2 then raise exception 'Surprise not released'; end if;
 if (select count(*) from public.partner_note_photos) <> 1 then raise exception 'Unopened surprise photo visible'; end if;
 insert into public.partner_note_reads(note_id,user_id) values (current_setting('test.surprise')::uuid,auth.uid());
 if (select count(*) from public.partner_note_photos) <> 3 then raise exception 'Opened surprise photo inaccessible'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
do $$ begin if (select count(*) from public.partner_note_photos) <> 0 then raise exception 'Outsider can read photos'; end if; end $$;
