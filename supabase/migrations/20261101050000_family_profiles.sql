-- Shared child/pet cards. Household membership remains the sole visibility boundary.
begin;
create table public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null check (kind in ('child', 'pet')),
  name text not null check (name = btrim(name) and length(name) between 1 and 100 and name ~ '\S'),
  animal_type text check (animal_type = btrim(animal_type) and length(animal_type) between 1 and 80 and animal_type ~ '\S'),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint family_child_has_no_animal_type check (kind = 'pet' or animal_type is null)
);
create index family_profiles_household on public.family_profiles(household_id, created_at, id);
alter table public.family_profiles enable row level security;
revoke all on public.family_profiles from public, anon, authenticated;
grant select, delete on public.family_profiles to authenticated;
grant insert (household_id, kind, name, animal_type) on public.family_profiles to authenticated;
grant update (name, animal_type) on public.family_profiles to authenticated;
create policy family_read on public.family_profiles for select to authenticated
  using (household_id = (select public.current_household()));
create policy family_add on public.family_profiles for insert to authenticated
  with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy family_update on public.family_profiles for update to authenticated
  using (household_id = (select public.current_household()))
  with check (household_id = (select public.current_household()));
create policy family_delete on public.family_profiles for delete to authenticated
  using (household_id = (select public.current_household()));
commit;
