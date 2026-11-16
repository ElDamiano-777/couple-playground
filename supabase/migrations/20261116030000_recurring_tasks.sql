-- Each completed occurrence can create at most one successor, in the same transaction.
begin;
alter table public.household_tasks
  add column notes text not null default '' check (length(notes) <= 10000),
  add column repeat_rule text not null default 'never' check (repeat_rule in ('never', 'daily', 'weekly', 'biweekly', 'monthly', 'weekdays')),
  add column repeat_days smallint[] not null default '{}',
  add column repeat_anchor smallint check (repeat_anchor between 1 and 31),
  add column recurrence_parent_id uuid references public.household_tasks(id) on delete set null,
  add constraint task_repeat_date_required check (repeat_rule = 'never' or due_date is not null),
  add constraint task_repeat_days_valid check (repeat_days <@ array[0,1,2,3,4,5,6]::smallint[] and (repeat_rule <> 'weekdays' or cardinality(repeat_days) > 0));
create unique index household_task_one_successor on public.household_tasks(recurrence_parent_id) where recurrence_parent_id is not null;
grant insert (notes, repeat_rule, repeat_days, repeat_anchor), update (notes, repeat_rule, repeat_days, repeat_anchor) on public.household_tasks to authenticated;

create function public.create_next_task_occurrence() returns trigger
language plpgsql security definer set search_path = '' as $$
declare next_date date; month_start date; anchor_day integer;
begin
  if old.completed_at is not null or new.completed_at is null or new.repeat_rule = 'never' then return new; end if;
  case new.repeat_rule
    when 'daily' then next_date := new.due_date + 1;
    when 'weekly' then next_date := new.due_date + 7;
    when 'biweekly' then next_date := new.due_date + 14;
    when 'monthly' then
      month_start := (date_trunc('month', new.due_date::timestamp) + interval '1 month')::date;
      anchor_day := coalesce(new.repeat_anchor, extract(day from new.due_date)::integer);
      next_date := month_start + least(anchor_day - 1, extract(day from (month_start + interval '1 month - 1 day'))::integer - 1);
    when 'weekdays' then
      select new.due_date + step into next_date from generate_series(1, 7) as step
        where extract(dow from new.due_date + step)::smallint = any(new.repeat_days) order by step limit 1;
  end case;
  insert into public.household_tasks(household_id, title, assignee, due_date, priority, notes, repeat_rule, repeat_days, repeat_anchor, recurrence_parent_id, created_by)
    values (new.household_id, new.title, new.assignee, next_date, new.priority, new.notes, new.repeat_rule, new.repeat_days, new.repeat_anchor, new.id, coalesce(auth.uid(), new.created_by))
    on conflict (recurrence_parent_id) where recurrence_parent_id is not null do nothing;
  return new;
end $$;
create trigger household_task_next_occurrence after update of completed_at on public.household_tasks
  for each row execute function public.create_next_task_occurrence();
revoke all on function public.create_next_task_occurrence() from public, anon, authenticated;
commit;
