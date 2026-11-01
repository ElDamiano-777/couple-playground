-- Two authenticated members per household. No private records are readable anonymously.
begin;
create schema together_private;
revoke all on schema together_private from public, anon, authenticated;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table public.household_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index household_members_household on public.household_members(household_id);
create table together_private.invitations (
  household_id uuid primary key references public.households(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  category text not null default 'Home' check (category in ('Home', 'Kids', 'Pets')),
  bought boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index shopping_items_household on public.shopping_items(household_id, created_at);

create function public.current_household() returns uuid
language sql stable security definer set search_path = ''
as $$ select household_id from public.household_members where user_id = (select auth.uid()) $$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.shopping_items enable row level security;
alter table together_private.invitations enable row level security;
revoke all on public.households, public.household_members, public.shopping_items from anon, authenticated;
grant select on public.households, public.household_members to authenticated;
grant select, delete on public.shopping_items to authenticated;
grant insert (household_id, name, category) on public.shopping_items to authenticated;
grant update (bought) on public.shopping_items to authenticated;
create policy household_read on public.households for select to authenticated
  using (id = (select public.current_household()));
create policy members_read on public.household_members for select to authenticated
  using (household_id = (select public.current_household()));
create policy shopping_read on public.shopping_items for select to authenticated
  using (household_id = (select public.current_household()));
create policy shopping_add on public.shopping_items for insert to authenticated
  with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy shopping_update on public.shopping_items for update to authenticated
  using (household_id = (select public.current_household()))
  with check (household_id = (select public.current_household()));
create policy shopping_delete on public.shopping_items for delete to authenticated
  using (household_id = (select public.current_household()));

create function public.create_household() returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if public.current_household() is not null then raise exception 'Already in a household'; end if;
  insert into public.households default values returning id into result;
  insert into public.household_members(user_id, household_id) values (auth.uid(), result);
  return result;
end $$;

create function public.create_household_invitation() returns text
language plpgsql security definer set search_path = '' as $$
declare target uuid; token text;
begin
  target := public.current_household();
  if target is null then raise exception 'Create a household first'; end if;
  -- All invitation mutations lock the household first, including redemption.
  perform 1 from public.households where id = target for update;
  if (select count(*) from public.household_members where household_id = target) >= 2
    then raise exception 'This household already has two people'; end if;
  token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into together_private.invitations(household_id, token_hash, expires_at)
    values (target, encode(sha256(convert_to(token, 'UTF8')), 'hex'), now() + interval '2 days')
    on conflict (household_id) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at;
  return token;
end $$;

create function public.join_household(invitation_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid; token_hash_value text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if public.current_household() is not null then raise exception 'Already in a household'; end if;
  if invitation_code is null or invitation_code !~ '^[0-9a-f]{64}$'
    then raise exception 'Invalid or expired invitation'; end if;
  token_hash_value := encode(sha256(convert_to(invitation_code, 'UTF8')), 'hex');
  select household_id into target from together_private.invitations where token_hash = token_hash_value;
  if target is null then raise exception 'Invalid or expired invitation'; end if;
  perform 1 from public.households where id = target for update;
  -- Recheck after locking: another request may have redeemed or replaced the code.
  if not exists (select 1 from together_private.invitations where household_id = target
      and token_hash = token_hash_value and expires_at > now())
    then raise exception 'Invalid or expired invitation'; end if;
  if (select count(*) from public.household_members where household_id = target) >= 2
    then raise exception 'This household already has two people'; end if;
  insert into public.household_members(user_id, household_id) values (auth.uid(), target);
  delete from together_private.invitations where household_id = target;
  return target;
end $$;

revoke all on function public.current_household(), public.create_household(), public.create_household_invitation(), public.join_household(text) from public, anon;
grant execute on function public.current_household(), public.create_household(), public.create_household_invitation(), public.join_household(text) to authenticated;
commit;
