-- Dates are optional and shared with the existing household collection.
alter table public.shopping_collections add column if not exists event_date date;
grant insert (event_date), update (event_date) on public.shopping_collections to authenticated;
