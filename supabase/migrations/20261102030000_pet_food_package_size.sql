-- Preserve existing products and let both partners record package sizes.
begin;
alter table public.pet_food add column package_size text not null default '' check (length(package_size) <= 100);
grant insert (package_size), update (package_size) on public.pet_food to authenticated;
commit;
