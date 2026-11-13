-- Occasion lists belong to a household; their entries are independent of the main shopping list.
begin;
create table public.shopping_collections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  icon text not null default 'heart' check (icon in ('heart', 'star', 'gift', 'home', 'pet')),
  color text not null default 'purple' check (color in ('purple', 'mint', 'peach', 'pink', 'blue')),
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, id)
);
create table public.shopping_collection_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  collection_id uuid,
  builtin_key text check (builtin_key in ('party', 'daily', 'movie', 'weekend')),
  name text not null check (length(btrim(name)) between 1 and 200),
  category text not null check (category in ('Home', 'Pets', 'Kids')),
  notes text not null default '' check (length(notes) <= 20000),
  bought boolean not null default false,
  favorite_id uuid references public.shopping_favorites(id) on delete set null,
  pet_food_id uuid references public.pet_food(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((collection_id is null) <> (builtin_key is null)),
  foreign key (household_id, collection_id) references public.shopping_collections(household_id, id) on delete cascade
);
create index shopping_collections_household on public.shopping_collections(household_id, created_at);
create index shopping_collection_items_household on public.shopping_collection_items(household_id, collection_id, builtin_key);
alter table public.shopping_collections enable row level security;
alter table public.shopping_collection_items enable row level security;
revoke all on public.shopping_collections, public.shopping_collection_items from public, anon, authenticated;
grant select, delete on public.shopping_collections, public.shopping_collection_items to authenticated;
grant insert (household_id, name, icon, color) on public.shopping_collections to authenticated;
grant update (name, icon, color, archived) on public.shopping_collections to authenticated;
grant insert (household_id, collection_id, builtin_key, name, category, notes, favorite_id, pet_food_id) on public.shopping_collection_items to authenticated;
grant update (name, category, notes, bought) on public.shopping_collection_items to authenticated;
create policy collections_select on public.shopping_collections for select to authenticated using (household_id = (select public.current_household()));
create policy collections_insert on public.shopping_collections for insert to authenticated with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy collections_update on public.shopping_collections for update to authenticated using (household_id = (select public.current_household())) with check (household_id = (select public.current_household()));
create policy collections_delete on public.shopping_collections for delete to authenticated using (household_id = (select public.current_household()));
create policy collection_items_select on public.shopping_collection_items for select to authenticated using (household_id = (select public.current_household()));
create policy collection_items_insert on public.shopping_collection_items for insert to authenticated with check (household_id = (select public.current_household()) and created_by = (select auth.uid()) and (favorite_id is null or exists (select 1 from public.shopping_favorites f where f.id = favorite_id and f.household_id = (select public.current_household()))) and (pet_food_id is null or exists (select 1 from public.pet_food f join public.family_profiles p on p.id = f.pet_id where f.id = pet_food_id and p.household_id = (select public.current_household()))));
create policy collection_items_update on public.shopping_collection_items for update to authenticated using (household_id = (select public.current_household())) with check (household_id = (select public.current_household()));
create policy collection_items_delete on public.shopping_collection_items for delete to authenticated using (household_id = (select public.current_household()));
commit;
