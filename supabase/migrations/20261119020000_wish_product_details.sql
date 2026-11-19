-- Optional product metadata; existing wishes and EUR prices remain unchanged.
begin;
alter table public.folder_entries
  add column wish_store text check (wish_store is null or length(wish_store) <= 150),
  add column wish_currency text check (wish_currency is null or wish_currency ~ '^[A-Z]{3}$');
grant insert (wish_store, wish_currency) on public.folder_entries to authenticated;
grant update (wish_store, wish_currency) on public.folder_entries to authenticated;
commit;
