-- Household favorites are independent of purchases, including their private photos.
begin;
create table public.shopping_favorites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category text not null check (category in ('Home', 'Pets', 'Kids')),
  name text not null check (length(btrim(name)) between 1 and 200),
  brand text not null default '' check (length(brand) <= 150),
  quantity text not null default '' check (length(quantity) <= 150),
  notes text not null default '' check (length(notes) <= 600),
  photo text check (photo is null or (length(photo) <= 1400000 and photo ~ '^data:image/(jpeg|png|webp);base64,')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index shopping_favorites_home_category on public.shopping_favorites(household_id, category, created_at);
alter table public.shopping_favorites enable row level security;
revoke all on public.shopping_favorites from public, anon, authenticated;
grant select, delete on public.shopping_favorites to authenticated;
grant insert (household_id, category, name, brand, quantity, notes, photo) on public.shopping_favorites to authenticated;
grant update (category, name, brand, quantity, notes, photo) on public.shopping_favorites to authenticated;
create policy shopping_favorites_read on public.shopping_favorites for select to authenticated
  using (household_id = (select public.current_household()));
create policy shopping_favorites_add on public.shopping_favorites for insert to authenticated
  with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy shopping_favorites_update on public.shopping_favorites for update to authenticated
  using (household_id = (select public.current_household())) with check (household_id = (select public.current_household()));
create policy shopping_favorites_delete on public.shopping_favorites for delete to authenticated
  using (household_id = (select public.current_household()));
commit;
