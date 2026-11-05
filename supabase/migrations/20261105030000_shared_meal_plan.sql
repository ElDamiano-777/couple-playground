-- One replaceable meal per day and meal slot. Recipes stay references, custom meals keep their own title.
begin;

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start date not null,
  day_index smallint not null check (day_index between 0 and 6),
  meal_slot text not null check (meal_slot in ('Breakfast', 'Lunch', 'Dinner')),
  recipe_id uuid references public.folder_entries(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, week_start, day_index, meal_slot)
);
create index meal_plan_items_household_week on public.meal_plan_items(household_id, week_start, day_index, meal_slot);
alter table public.meal_plan_items enable row level security;
revoke all on public.meal_plan_items from anon, authenticated;
grant select, delete on public.meal_plan_items to authenticated;
create policy meal_plan_read on public.meal_plan_items for select to authenticated using (household_id = (select public.current_household()));
create policy meal_plan_delete on public.meal_plan_items for delete to authenticated using (household_id = (select public.current_household()));

create function public.save_meal_plan_item(p_id uuid, p_week_start date, p_day_index smallint, p_meal_slot text, p_recipe_id uuid, p_title text) returns public.meal_plan_items
language plpgsql security definer set search_path = '' as $$
declare home uuid; result public.meal_plan_items; recipe_title text;
begin
  home := public.current_household();
  if home is null then raise exception 'Connect your home first'; end if;
  if p_week_start is null or extract(isodow from p_week_start) <> 1 or p_day_index not between 0 and 6 or p_meal_slot not in ('Breakfast', 'Lunch', 'Dinner') then raise exception 'Invalid meal slot'; end if;
  if p_recipe_id is not null then
    select title into recipe_title from public.folder_entries where id = p_recipe_id and household_id = home and kind = 'recipe';
    if recipe_title is null then raise exception 'Recipe is not in this home'; end if;
  elsif length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Enter a meal name';
  end if;
  if p_id is not null then
    delete from public.meal_plan_items where household_id = home and week_start = p_week_start and day_index = p_day_index and meal_slot = p_meal_slot and id <> p_id;
    update public.meal_plan_items set week_start = p_week_start, day_index = p_day_index, meal_slot = p_meal_slot, recipe_id = p_recipe_id, title = coalesce(recipe_title, btrim(p_title)), updated_at = now()
      where id = p_id and household_id = home returning * into result;
    if result.id is null then raise exception 'Meal was not found'; end if;
  else
    insert into public.meal_plan_items(household_id, week_start, day_index, meal_slot, recipe_id, title, created_by)
      values(home, p_week_start, p_day_index, p_meal_slot, p_recipe_id, coalesce(recipe_title, btrim(p_title)), auth.uid())
      on conflict (household_id, week_start, day_index, meal_slot) do update set recipe_id = excluded.recipe_id, title = excluded.title, updated_at = now()
      returning * into result;
  end if;
  return result;
end $$;
revoke all on function public.save_meal_plan_item(uuid, date, smallint, text, uuid, text) from public, anon;
grant execute on function public.save_meal_plan_item(uuid, date, smallint, text, uuid, text) to authenticated;
commit;
