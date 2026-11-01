-- Explicitly requested POC accounts. No real email address or existing membership is changed.
-- Password is stored only as a bcrypt verifier; the browser never contains the password.
begin;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'masha@poc.together.invalid', '$2a$10$G5qrKErSWbTWiPbWaX7Ai.URUVsbPfL4lyCtjX9uSMD7g6gHGMiS2', now(),
   '', '', '', '', '{"provider":"email","providers":["email"],"together_poc":true}', '{"display_name":"Masha"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'damian@poc.together.invalid', '$2a$10$G5qrKErSWbTWiPbWaX7Ai.URUVsbPfL4lyCtjX9uSMD7g6gHGMiS2', now(),
   '', '', '', '', '{"provider":"email","providers":["email"],"together_poc":true}', '{"display_name":"Damian"}', false, now(), now());
insert into auth.identities(user_id, provider_id, provider, identity_data, created_at, updated_at)
select id, id::text, 'email', jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now()
from auth.users where id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002');
insert into public.households(id) values ('d0000000-0000-4000-8000-000000000003');
insert into public.household_members(user_id, household_id) values
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003'),
  ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003');

-- The shared POC identities must remain available; ordinary account lifecycle stays unchanged.
create function together_private.preserve_poc_accounts() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002') then
    if tg_op = 'DELETE' then raise exception 'POC accounts cannot be deleted'; end if;
    if new.id is distinct from old.id or new.email is distinct from old.email
      or new.encrypted_password is distinct from old.encrypted_password
      or new.email_change is distinct from old.email_change
      or new.email_confirmed_at is distinct from old.email_confirmed_at
      or new.deleted_at is distinct from old.deleted_at
      or new.banned_until is distinct from old.banned_until
      or new.raw_app_meta_data is distinct from old.raw_app_meta_data then
      raise exception 'POC login credentials cannot be changed';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function together_private.preserve_poc_accounts() from public, anon, authenticated;
create trigger preserve_together_poc_accounts before update or delete on auth.users
for each row execute function together_private.preserve_poc_accounts();
commit;
