-- The relationship date belongs to the household, not either individual member.
alter table public.households add column relationship_start_date date;
alter table public.households add constraint relationship_start_date_not_future
  check (relationship_start_date <= current_date);
grant update (relationship_start_date) on public.households to authenticated;
create policy household_relationship_date_update on public.households for update to authenticated
  using (id = (select public.current_household()))
  with check (id = (select public.current_household()));
