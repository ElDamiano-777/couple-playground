-- Note metadata remains available for envelopes. The message body is never
-- directly selectable: this function releases it only to the sender or to a
-- recipient who has opened the already-released note.
revoke select on public.partner_notes from public, anon, authenticated;
revoke select (body) on public.partner_notes from public, anon, authenticated;
grant select (id, household_id, sender, created_by, created_at, updated_at, deliver_at, photo_count)
  on public.partner_notes to authenticated;

create function public.list_private_partner_notes()
returns table (
  id uuid, household_id uuid, sender text, created_by uuid,
  created_at timestamptz, updated_at timestamptz, deliver_at timestamptz,
  photo_count smallint, body text, opened boolean
)
language sql stable security definer set search_path = '' as $$
  select note.id, note.household_id, note.sender, note.created_by,
    note.created_at, note.updated_at, note.deliver_at, note.photo_count,
    case when note.created_by = (select auth.uid()) or receipt.opened then note.body else null end,
    receipt.opened
  from public.partner_notes note
  cross join lateral (select exists (
    select 1 from public.partner_note_reads r
    where r.note_id = note.id and r.user_id = (select auth.uid())
  ) as opened) receipt
  where note.household_id = (select public.current_household())
    and (note.created_by = (select auth.uid()) or note.deliver_at is null or note.deliver_at <= statement_timestamp())
  order by note.created_at desc;
$$;
revoke all on function public.list_private_partner_notes() from public, anon;
grant execute on function public.list_private_partner_notes() to authenticated;

-- Search receives only searchable text fields; it never receives unread
-- envelope metadata, attachment data, or unreleased recipient-side notes.
create function public.searchable_partner_notes()
returns table (sender text, body text, created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select note.sender, note.body, note.created_at
  from public.list_private_partner_notes() note
  where note.body is not null;
$$;
revoke all on function public.searchable_partner_notes() from public, anon;
grant execute on function public.searchable_partner_notes() to authenticated;
