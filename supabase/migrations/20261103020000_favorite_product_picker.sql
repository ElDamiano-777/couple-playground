-- Add structured product options while preserving all existing favorites and items.
begin;
alter table public.shopping_favorites add column flavor text not null default '' check (length(flavor) <= 150);
alter table public.shopping_favorites add column size text not null default '' check (length(size) <= 150);
grant insert (flavor, size), update (flavor, size) on public.shopping_favorites to authenticated;
alter table public.shopping_items drop constraint shopping_items_notes_check;
alter table public.shopping_items add constraint shopping_items_notes_check check (length(notes) <= 2000);

-- Serialize favorite identity changes per home so concurrent saves cannot create duplicates.
-- Existing duplicates stay untouched, and edits that do not change identity still work.
create function public.prevent_duplicate_shopping_favorite() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and
    lower(btrim(new.name)) = lower(btrim(old.name)) and
    lower(btrim(new.brand)) = lower(btrim(old.brand)) and
    lower(btrim(new.flavor)) = lower(btrim(old.flavor)) and
    lower(btrim(new.size)) = lower(btrim(old.size)) and new.category = old.category then
    return new;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.household_id::text, 0));
  if exists (select 1 from public.shopping_favorites f where f.household_id = new.household_id
    and f.category = new.category and lower(btrim(f.name)) = lower(btrim(new.name))
    and lower(btrim(f.brand)) = lower(btrim(new.brand)) and lower(btrim(f.flavor)) = lower(btrim(new.flavor))
    and lower(btrim(f.size)) = lower(btrim(new.size)) and f.id <> new.id) then
    raise exception 'This product is already in favorites' using errcode = '23505';
  end if;
  return new;
end $$;
create trigger shopping_favorites_no_duplicates before insert or update on public.shopping_favorites
  for each row execute function public.prevent_duplicate_shopping_favorite();
commit;
