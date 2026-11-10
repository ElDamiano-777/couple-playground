-- Shared notes are separate from personal letters and scoped to the household.
create table public.shared_love_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 150),
  body text not null check (length(btrim(body)) between 1 and 10000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create index shared_love_notes_household_created on public.shared_love_notes(household_id, created_at desc);
alter table public.shared_love_notes enable row level security;
revoke all on public.shared_love_notes from anon, authenticated;
grant select, delete on public.shared_love_notes to authenticated;
grant insert (household_id, title, body), update (title, body) on public.shared_love_notes to authenticated;
create policy shared_love_notes_read on public.shared_love_notes for select to authenticated using (household_id = (select public.current_household()));
create policy shared_love_notes_add on public.shared_love_notes for insert to authenticated with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy shared_love_notes_update on public.shared_love_notes for update to authenticated using (household_id = (select public.current_household())) with check (household_id = (select public.current_household()));
create policy shared_love_notes_delete on public.shared_love_notes for delete to authenticated using (household_id = (select public.current_household()));
create function public.touch_shared_love_note() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); new.revision := old.revision + 1; return new; end $$;
create trigger shared_love_note_touch before update on public.shared_love_notes for each row execute function public.touch_shared_love_note();
revoke all on function public.touch_shared_love_note() from public, anon, authenticated;
