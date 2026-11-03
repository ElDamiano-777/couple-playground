-- Imported recipe fields remain private to the existing shared household.
begin;
alter table public.folder_entries
  add column recipe_source_url text check (recipe_source_url is null or (kind = 'recipe' and length(recipe_source_url) <= 4096 and recipe_source_url ~ '^https?://')),
  add column recipe_image_url text check (recipe_image_url is null or (kind = 'recipe' and length(recipe_image_url) <= 4096 and recipe_image_url ~ '^https?://')),
  add column recipe_ingredients text not null default '' check (length(recipe_ingredients) <= 20000 and (kind = 'recipe' or recipe_ingredients = '')),
  add column recipe_instructions text not null default '' check (length(recipe_instructions) <= 20000 and (kind = 'recipe' or recipe_instructions = ''));
grant insert (recipe_source_url, recipe_image_url, recipe_ingredients, recipe_instructions) on public.folder_entries to authenticated;
grant update (recipe_source_url, recipe_image_url, recipe_ingredients, recipe_instructions) on public.folder_entries to authenticated;
commit;
