-- Optional calendar dates share the existing household boundary; no existing card is backfilled.
begin;
alter table public.family_profiles add column birth_date date;
alter table public.family_profiles add constraint family_birth_date_valid check (
  birth_date is null or (
    isfinite(birth_date)
    and birth_date >= date '0001-01-01'
    and birth_date <= (current_timestamp at time zone 'UTC')::date
  )
);
grant insert (birth_date), update (birth_date) on public.family_profiles to authenticated;
commit;
