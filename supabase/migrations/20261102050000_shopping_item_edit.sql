-- Let household members edit names and categories without moving items between homes.
begin;
grant update (name, category) on public.shopping_items to authenticated;
commit;
