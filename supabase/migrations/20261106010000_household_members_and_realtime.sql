-- Member names are data owned by an authenticated household, never a local role.
begin;

create table public.household_member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index household_member_profiles_household on public.household_member_profiles(household_id, user_id);
alter table public.household_member_profiles enable row level security;
revoke all on public.household_member_profiles from anon, authenticated;
grant select on public.household_member_profiles to authenticated;
create policy household_member_profiles_read on public.household_member_profiles for select to authenticated
  using (household_id = (select public.current_household()));

insert into public.household_member_profiles(user_id, household_id, display_name)
select member.user_id, member.household_id,
  coalesce(nullif(btrim(user_record.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(user_record.email, ''), '@', 1), ''), concat('Member ', left(member.user_id::text, 8)))
from public.household_members member
join auth.users user_record on user_record.id = member.user_id
on conflict (user_id) do nothing;

create function public.member_display_name(target_user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select profile.display_name from public.household_member_profiles profile
  where profile.user_id = target_user_id and profile.household_id = (select public.current_household())
$$;
revoke all on function public.member_display_name(uuid) from public, anon;
grant execute on function public.member_display_name(uuid) to authenticated;

create function public.touch_household_member_profile() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger household_member_profiles_touch before update on public.household_member_profiles for each row execute function public.touch_household_member_profile();
revoke all on function public.touch_household_member_profile() from public, anon, authenticated;

create or replace function public.create_household() returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; member_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if public.current_household() is not null then raise exception 'Already in a household'; end if;
  select coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(email, ''), '@', 1), ''), concat('Member ', left(id::text, 8))) into member_name from auth.users where id = auth.uid();
  insert into public.households default values returning id into result;
  insert into public.household_members(user_id, household_id) values (auth.uid(), result);
  insert into public.household_member_profiles(user_id, household_id, display_name) values (auth.uid(), result, member_name);
  return result;
end $$;

create or replace function public.join_household(invitation_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid; token_hash_value text; member_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if public.current_household() is not null then raise exception 'Already in a household'; end if;
  if invitation_code is null or invitation_code !~ '^[0-9a-f]{64}$' then raise exception 'Invalid or expired invitation'; end if;
  token_hash_value := encode(sha256(convert_to(invitation_code, 'UTF8')), 'hex');
  select household_id into target from together_private.invitations where token_hash = token_hash_value;
  if target is null then raise exception 'Invalid or expired invitation'; end if;
  perform 1 from public.households where id = target for update;
  if not exists (select 1 from together_private.invitations where household_id = target and token_hash = token_hash_value and expires_at > now()) then raise exception 'Invalid or expired invitation'; end if;
  if (select count(*) from public.household_members where household_id = target) >= 2 then raise exception 'This household already has two people'; end if;
  select coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(email, ''), '@', 1), ''), concat('Member ', left(id::text, 8))) into member_name from auth.users where id = auth.uid();
  insert into public.household_members(user_id, household_id) values (auth.uid(), target);
  insert into public.household_member_profiles(user_id, household_id, display_name) values (auth.uid(), target, member_name);
  delete from together_private.invitations where household_id = target;
  return target;
end $$;

do $$
declare table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach table_name in array array['shopping_items', 'folder_entries', 'meal_plan_items', 'household_tasks'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

commit;
