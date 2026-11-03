-- Preserve the recipe yield exactly as supplied by its author.
begin;
alter table public.folder_entries add column recipe_servings text
  check (recipe_servings is null or (kind = 'recipe' and length(recipe_servings) <= 150));
grant insert (recipe_servings) on public.folder_entries to authenticated;
grant update (recipe_servings) on public.folder_entries to authenticated;
commit;
