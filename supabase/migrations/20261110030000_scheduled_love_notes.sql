-- Pending letters are visible only to their author. PostgreSQL releases them
-- automatically at the chosen instant; no client or scheduler can release early.
alter table public.partner_notes add column deliver_at timestamptz;
grant insert (deliver_at), update (deliver_at) on public.partner_notes to authenticated;
drop policy partner_notes_read on public.partner_notes;
create policy partner_notes_read on public.partner_notes for select to authenticated
  using (household_id = (select public.current_household()) and
    (created_by = (select auth.uid()) or deliver_at is null or deliver_at <= clock_timestamp()));
drop policy partner_notes_update on public.partner_notes;
create policy partner_notes_update on public.partner_notes for update to authenticated
  using (household_id = (select public.current_household()) and created_by = (select auth.uid()) and
    (deliver_at is null or deliver_at > clock_timestamp()))
  with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
drop policy partner_notes_delete on public.partner_notes;
create policy partner_notes_delete on public.partner_notes for delete to authenticated
  using (household_id = (select public.current_household()) and created_by = (select auth.uid()) and
    (deliver_at is null or deliver_at > clock_timestamp()));

create function public.validate_scheduled_partner_note() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    -- Keep account/household cascade deletion working.
    if pg_trigger_depth() = 1 and old.deliver_at is not null and old.deliver_at <= clock_timestamp() then
      raise exception 'This surprise has already been delivered';
    end if;
    return old;
  elsif tg_op = 'INSERT' then
    if new.deliver_at is not null and new.deliver_at <= clock_timestamp() then
      raise exception 'Delivery must be in the future';
    end if;
  else
    if old.deliver_at is not null and old.deliver_at <= clock_timestamp() then
      raise exception 'This surprise has already been delivered';
    end if;
    if old.deliver_at is null and new.deliver_at is not null then
      raise exception 'An already sent note cannot be scheduled';
    end if;
    if old.deliver_at is not null and (new.deliver_at is null or new.deliver_at <= clock_timestamp()) then
      raise exception 'Delivery must be in the future';
    end if;
  end if;
  return new;
end $$;
create trigger validate_scheduled_partner_note before insert or update or delete on public.partner_notes
  for each row execute function public.validate_scheduled_partner_note();
revoke all on function public.validate_scheduled_partner_note() from public, anon, authenticated;
