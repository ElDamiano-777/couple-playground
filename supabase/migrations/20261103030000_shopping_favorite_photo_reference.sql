-- Reference the original favorite instead of copying its photo into shopping items.
begin;
alter table public.shopping_items add column favorite_id uuid references public.shopping_favorites(id) on delete set null;
grant insert (favorite_id) on public.shopping_items to authenticated;
create index shopping_items_favorite on public.shopping_items(favorite_id) where favorite_id is not null;
create function public.check_shopping_item_favorite_home() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.favorite_id is not null and not exists (
    select 1 from public.shopping_favorites f where f.id = new.favorite_id and f.household_id = new.household_id
  ) then
    raise exception 'Favorite is not in this home' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger shopping_item_favorite_home before insert or update of favorite_id, household_id on public.shopping_items
  for each row execute function public.check_shopping_item_favorite_home();
commit;
