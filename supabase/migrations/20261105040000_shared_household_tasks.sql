-- Shared household tasks remain visible only to the two members of one home.
begin;
create table public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 300),
  assignee text not null default 'both' check (assignee in ('masha', 'damian', 'both')),
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  completed_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index household_tasks_visible on public.household_tasks(household_id, completed_at, due_date, created_at);
alter table public.household_tasks enable row level security;
revoke all on public.household_tasks from anon, authenticated;
grant select, delete on public.household_tasks to authenticated;
grant insert (household_id, title, assignee, due_date, priority) on public.household_tasks to authenticated;
grant update (title, assignee, due_date, priority, completed_at) on public.household_tasks to authenticated;
create policy household_tasks_read on public.household_tasks for select to authenticated using (household_id = (select public.current_household()));
create policy household_tasks_add on public.household_tasks for insert to authenticated with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy household_tasks_update on public.household_tasks for update to authenticated using (household_id = (select public.current_household())) with check (household_id = (select public.current_household()));
create policy household_tasks_delete on public.household_tasks for delete to authenticated using (household_id = (select public.current_household()));
create function public.touch_household_task() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger household_tasks_touch before update on public.household_tasks for each row execute function public.touch_household_task();
revoke all on function public.touch_household_task() from public, anon, authenticated;
commit;
