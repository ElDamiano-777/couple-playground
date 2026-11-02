-- Add optional shopping details without changing existing items.
begin;
alter table public.shopping_items add column notes text not null default '' check (length(notes) <= 1000);
grant insert (notes), update (notes) on public.shopping_items to authenticated;
commit;
