-- Extend existing per-pet preferences without changing saved dislikes.
begin;
alter table public.pet_dislikes add column category text not null default 'dislike'
  check (category in ('like', 'dislike', 'note'));
alter table public.pet_dislikes drop constraint pet_dislikes_food_type_check;
alter table public.pet_dislikes add constraint pet_dislikes_food_type_check
  check (food_type in ('Wet', 'Dry', 'Treats', 'Other') or (food_type = '' and category in ('like', 'note')));
grant insert (category) on public.pet_dislikes to authenticated;
commit;
