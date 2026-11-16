\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.household_tasks (
 id uuid primary key default gen_random_uuid(), household_id uuid not null, title text not null,
 assignee text not null default 'both', due_date date, priority text not null default 'normal', completed_at timestamptz,
 created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.household_tasks enable row level security;
grant select, delete on public.household_tasks to authenticated;
grant insert (household_id, title, assignee, due_date, priority) on public.household_tasks to authenticated;
grant update (title, assignee, due_date, priority, completed_at) on public.household_tasks to authenticated;
create policy tasks_access on public.household_tasks for all to authenticated using (household_id = current_setting('test.household')::uuid) with check (household_id = current_setting('test.household')::uuid);
\ir ../migrations/20261116030000_recurring_tasks.sql
set role authenticated;
select set_config('test.household', '10000000-0000-4000-8000-000000000001', false);
select set_config('test.user_id', '20000000-0000-4000-8000-000000000001', false);
insert into public.household_tasks(household_id, title, assignee, due_date, priority, notes, repeat_rule) values (current_setting('test.household')::uuid, 'Weekly', 'damian', '2026-11-16', 'high', 'Bring bags', 'weekly') returning id as weekly \gset
select set_config('test.user_id', '20000000-0000-4000-8000-000000000002', false);
update public.household_tasks set completed_at = now() where id = :'weekly';
update public.household_tasks set completed_at = null where id = :'weekly';
update public.household_tasks set completed_at = now() where id = :'weekly';
do $$ begin
 if (select count(*) from public.household_tasks where title = 'Weekly') <> 2 then raise exception 'duplicate or missing successor'; end if;
 if not exists (select 1 from public.household_tasks where title = 'Weekly' and completed_at is null and due_date = '2026-11-23' and assignee = 'damian' and priority = 'high' and notes = 'Bring bags') then raise exception 'weekly successor lost data'; end if;
end $$;
insert into public.household_tasks(household_id, title, due_date, repeat_rule) values (current_setting('test.household')::uuid, 'Daily', '2026-11-16', 'daily'), (current_setting('test.household')::uuid, 'Fortnight', '2026-11-16', 'biweekly');
update public.household_tasks set completed_at = now() where title in ('Daily', 'Fortnight');
do $$ begin
 if not exists (select 1 from public.household_tasks where title = 'Daily' and completed_at is null and due_date = '2026-11-17') then raise exception 'daily schedule failed'; end if;
 if not exists (select 1 from public.household_tasks where title = 'Fortnight' and completed_at is null and due_date = '2026-11-30') then raise exception 'fortnight schedule failed'; end if;
 begin
  insert into public.household_tasks(household_id, title, repeat_rule) values (current_setting('test.household')::uuid, 'No due date', 'daily');
  raise exception 'recurrence without date succeeded';
 exception when check_violation then null; end;
end $$;
insert into public.household_tasks(household_id, title, due_date, repeat_rule, repeat_days) values (current_setting('test.household')::uuid, 'Weekdays', '2026-11-16', 'weekdays', array[1,4]::smallint[]) returning id as weekdays \gset
update public.household_tasks set completed_at = now() where id = :'weekdays';
do $$ begin if not exists (select 1 from public.household_tasks where title = 'Weekdays' and completed_at is null and due_date = '2026-11-19') then raise exception 'weekday schedule failed'; end if; end $$;
insert into public.household_tasks(household_id, title, due_date, repeat_rule, repeat_anchor) values (current_setting('test.household')::uuid, 'Monthly', '2026-01-31', 'monthly', 31) returning id as monthly \gset
update public.household_tasks set completed_at = now() where id = :'monthly';
update public.household_tasks set completed_at = now() where title = 'Monthly' and completed_at is null;
do $$ begin if not exists (select 1 from public.household_tasks where title = 'Monthly' and completed_at is null and due_date = '2026-03-31') then raise exception 'month-end anchor failed'; end if; end $$;
update public.household_tasks set repeat_rule = 'never' where title = 'Monthly' and completed_at is null;
update public.household_tasks set completed_at = now() where title = 'Monthly' and completed_at is null;
do $$ begin if (select count(*) from public.household_tasks where title = 'Monthly') <> 3 then raise exception 'stopping recurrence failed'; end if; end $$;
select set_config('test.household', '10000000-0000-4000-8000-000000000002', false);
do $$ begin if exists (select 1 from public.household_tasks) then raise exception 'cross-household access'; end if; end $$;
