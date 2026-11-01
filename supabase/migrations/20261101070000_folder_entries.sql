-- Small shared records for the three requested folders, under existing household membership.
begin;
create table public.folder_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null check (kind in ('recipe', 'wish', 'place')),
  title text not null check (title = btrim(title) and length(title) between 1 and 150 and title ~ '\S'),
  notes text not null default '' check (length(notes) <= 20000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index folder_entries_household on public.folder_entries(household_id, kind, created_at, id);
alter table public.folder_entries enable row level security;
revoke all on public.folder_entries from public, anon, authenticated;
grant select, delete on public.folder_entries to authenticated;
grant insert (household_id, kind, title, notes) on public.folder_entries to authenticated;
grant update (title, notes) on public.folder_entries to authenticated;
create policy folder_entries_read on public.folder_entries for select to authenticated
  using (household_id = (select public.current_household()));
create policy folder_entries_add on public.folder_entries for insert to authenticated
  with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy folder_entries_update on public.folder_entries for update to authenticated
  using (household_id = (select public.current_household()))
  with check (household_id = (select public.current_household()));
create policy folder_entries_delete on public.folder_entries for delete to authenticated
  using (household_id = (select public.current_household()));
commit;
