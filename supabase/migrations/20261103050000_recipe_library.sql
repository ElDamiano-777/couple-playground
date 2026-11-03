-- Keep existing recipe entries and notes while adding optional library details.
begin;
alter table public.folder_entries
  add column recipe_category text check (recipe_category is null or (kind = 'recipe' and recipe_category in ('Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'))),
  add column preparation_minutes integer check (preparation_minutes is null or (kind = 'recipe' and preparation_minutes between 1 and 10080)),
  add column recipe_photo text check (recipe_photo is null or (kind = 'recipe' and length(recipe_photo) <= 1400000 and recipe_photo ~ '^data:image/(jpeg|png|webp);base64,'));
grant insert (recipe_category, preparation_minutes, recipe_photo) on public.folder_entries to authenticated;
grant update (recipe_category, preparation_minutes, recipe_photo) on public.folder_entries to authenticated;
commit;
