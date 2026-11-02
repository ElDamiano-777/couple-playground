-- Extend existing food without changing old products or photos.
begin;
alter table public.pet_food add column notes text not null default '' check (length(notes) <= 4000);
grant insert (notes), update (notes) on public.pet_food to authenticated;
create table public.pet_dislikes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.family_profiles(id) on delete cascade,
  ingredient text not null check (length(btrim(ingredient)) between 1 and 150),
  food_type text not null check (food_type in ('Wet', 'Dry', 'Treats', 'Other')),
  notes text not null default '' check (length(notes) <= 4000),
  created_at timestamptz not null default now()
);
create index pet_dislikes_pet on public.pet_dislikes(pet_id, created_at);
alter table public.pet_dislikes enable row level security;
revoke all on public.pet_dislikes from public, anon, authenticated;
grant select, delete on public.pet_dislikes to authenticated;
grant insert (pet_id, ingredient, food_type, notes) on public.pet_dislikes to authenticated;
grant update (ingredient, food_type, notes) on public.pet_dislikes to authenticated;
create policy pet_dislikes_home on public.pet_dislikes for all to authenticated
  using (exists (select 1 from public.family_profiles p where p.id = pet_id and p.kind = 'pet' and p.household_id = (select public.current_household())))
  with check (exists (select 1 from public.family_profiles p where p.id = pet_id and p.kind = 'pet' and p.household_id = (select public.current_household())));
commit;
