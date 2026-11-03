-- Keep public post captions with the existing household-protected recipes.
begin;
alter table public.folder_entries add column recipe_caption text not null default ''
  check (length(recipe_caption) <= 20000 and (kind = 'recipe' or recipe_caption = ''));
grant insert (recipe_caption) on public.folder_entries to authenticated;
grant update (recipe_caption) on public.folder_entries to authenticated;
commit;
