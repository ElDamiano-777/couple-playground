-- Link shopping items to existing pet foods without copying their photos.
begin;
alter table public.shopping_items add column pet_food_id uuid references public.pet_food(id) on delete set null;
grant insert (pet_food_id) on public.shopping_items to authenticated;
create index shopping_items_pet_food on public.shopping_items(pet_food_id) where pet_food_id is not null;
alter table public.shopping_items drop constraint shopping_items_notes_check;
alter table public.shopping_items add constraint shopping_items_notes_check check (length(notes) <= 20000);
create function public.check_shopping_item_pet_food_home() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.pet_food_id is not null and not exists (
    select 1 from public.pet_food f join public.family_profiles p on p.id = f.pet_id
    where f.id = new.pet_food_id and p.household_id = new.household_id and p.kind = 'pet'
  ) then
    raise exception 'Pet food is not in this home' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger shopping_item_pet_food_home before insert or update of pet_food_id, household_id on public.shopping_items
  for each row execute function public.check_shopping_item_pet_food_home();
commit;
