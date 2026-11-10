-- Only the sender can see status, and an opened note is positive evidence that
-- it was released. No push delivery is inferred from a read receipt.
create function public.scheduled_love_note_status()
returns table(note_id uuid, status text)
language sql stable security definer set search_path = '' as $$
  select note.id,
    case
      when note.deliver_at > statement_timestamp() then 'scheduled'
      when exists (select 1 from public.partner_note_reads receipt
                   where receipt.note_id = note.id and receipt.user_id <> note.created_by
                     and receipt.read_at >= note.deliver_at) then 'delivered'
      else 'unconfirmed'
    end
  from public.partner_notes note
  where note.household_id = (select public.current_household())
    and note.created_by = (select auth.uid()) and note.deliver_at is not null;
$$;
revoke all on function public.scheduled_love_note_status() from public, anon;
grant execute on function public.scheduled_love_note_status() to authenticated;
