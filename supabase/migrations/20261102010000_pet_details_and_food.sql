-- Pet details and food remain private to the pet's household.
begin;
create table public.pet_details (
  pet_id uuid primary key references public.family_profiles(id) on delete cascade,
  photo text check (photo is null or (length(photo) <= 1400000 and photo ~ '^data:image/(jpeg|png|webp);base64,')),
  likes text not null default '' check (length(likes) <= 4000),
  dislikes text not null default '' check (length(dislikes) <= 4000),
  important_notes text not null default '' check (length(important_notes) <= 4000)
);
create table public.pet_food (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.family_profiles(id) on delete cascade,
  photo text check (photo is null or (length(photo) <= 1400000 and photo ~ '^data:image/(jpeg|png|webp);base64,')),
  brand text not null default '' check (length(brand) <= 150),
  name text not null check (length(btrim(name)) between 1 and 150),
  flavor text not null default '' check (length(flavor) <= 150),
  food_type text not null default '' check (length(food_type) <= 150),
  created_at timestamptz not null default now()
);
create index pet_food_pet on public.pet_food(pet_id, created_at);
alter table public.pet_details enable row level security;
alter table public.pet_food enable row level security;
revoke all on public.pet_details, public.pet_food from public, anon, authenticated;
grant select, delete on public.pet_details, public.pet_food to authenticated;
grant insert (pet_id, photo, likes, dislikes, important_notes) on public.pet_details to authenticated;
grant update (pet_id, photo, likes, dislikes, important_notes) on public.pet_details to authenticated;
grant insert (pet_id, photo, brand, name, flavor, food_type) on public.pet_food to authenticated;
grant update (photo, brand, name, flavor, food_type) on public.pet_food to authenticated;
create policy pet_details_home on public.pet_details for all to authenticated
  using (exists (select 1 from public.family_profiles p where p.id = pet_id and p.kind = 'pet' and p.household_id = (select public.current_household())))
  with check (exists (select 1 from public.family_profiles p where p.id = pet_id and p.kind = 'pet' and p.household_id = (select public.current_household())));
create policy pet_food_home on public.pet_food for all to authenticated
  using (exists (select 1 from public.family_profiles p where p.id = pet_id and p.kind = 'pet' and p.household_id = (select public.current_household())))
  with check (exists (select 1 from public.family_profiles p where p.id = pet_id and p.kind = 'pet' and p.household_id = (select public.current_household())));
commit;
