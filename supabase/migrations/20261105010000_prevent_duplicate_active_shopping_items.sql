-- Keep a single active purchase per normalized name/category/home across both members.
-- Bought history is intentionally excluded so a household can buy the same thing again.
begin;
create function public.prevent_duplicate_active_shopping_item() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.bought then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.household_id::text, 0));
  if exists (
    select 1 from public.shopping_items item
    where item.household_id = new.household_id
      and item.category = new.category
      and not item.bought
      and lower(btrim(item.name)) = lower(btrim(new.name))
      and item.id is distinct from new.id
  ) then
    raise exception 'This item is already active in your shared list' using errcode = '23505';
  end if;
  return new;
end $$;

create trigger shopping_items_no_active_duplicates
before insert or update of household_id, category, name, bought on public.shopping_items
for each row execute function public.prevent_duplicate_active_shopping_item();

revoke all on function public.prevent_duplicate_active_shopping_item() from public, anon, authenticated;
commit;
