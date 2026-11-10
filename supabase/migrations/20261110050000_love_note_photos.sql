-- Use the existing private, household-protected database photo storage.
-- Photo writes and the accompanying note are committed as one transaction.
alter table public.partner_notes add column photo_count smallint not null default 0 check (photo_count between 0 and 5);
alter table public.partner_notes drop constraint partner_notes_body_check;
alter table public.partner_notes add constraint partner_notes_content_check
  check (length(body) <= 2000 and (length(btrim(body)) > 0 or photo_count > 0));

create table public.partner_note_photos (
  note_id uuid not null references public.partner_notes(id) on delete cascade,
  position smallint not null check (position between 0 and 4),
  data_url text not null check (length(data_url) <= 1400000 and data_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'),
  primary key (note_id, position)
);
alter table public.partner_note_photos enable row level security;
revoke all on public.partner_note_photos from anon, authenticated;
grant select on public.partner_note_photos to authenticated;
create policy partner_note_photos_read on public.partner_note_photos for select to authenticated
  using (exists (
    select 1 from public.partner_notes note
    where note.id = note_id and (note.created_by = (select auth.uid()) or exists (
      select 1 from public.partner_note_reads receipt
      where receipt.note_id = note.id and receipt.user_id = (select auth.uid())
    ))
  ));

create function public.save_partner_note_photos(
  p_note_id uuid, p_expected_delivery timestamptz, p_expected_updated_at timestamptz, p_sender text,
  p_body text, p_delivery timestamptz, p_photos jsonb
) returns public.partner_notes
language plpgsql security definer set search_path = '' as $$
declare
  home uuid := public.current_household();
  actor uuid := auth.uid();
  saved public.partner_notes;
  photo jsonb;
  photo_index integer := 0;
begin
  if actor is null or home is null then raise exception 'Sign in to your shared space'; end if;
  if p_sender not in ('masha', 'damian') or p_sender is null then raise exception 'Invalid sender'; end if;
  if p_body is null or length(p_body) > 2000 or jsonb_typeof(p_photos) is distinct from 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'Invalid note'; end if;
  if length(btrim(p_body)) = 0 and jsonb_array_length(p_photos) = 0 then raise exception 'Add a message or photo'; end if;
  for photo in select * from jsonb_array_elements(p_photos) loop
    if jsonb_typeof(photo) <> 'string' or length(photo #>> '{}') > 1400000 or (photo #>> '{}') !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$' then
      raise exception 'Invalid photo';
    end if;
  end loop;
  if p_note_id is null then
    insert into public.partner_notes(household_id, sender, body, deliver_at, photo_count)
      values(home, p_sender, btrim(p_body), p_delivery, jsonb_array_length(p_photos)) returning * into saved;
  else
    select * into saved from public.partner_notes where id = p_note_id and household_id = home and created_by = actor for update;
    if not found then raise exception 'Note unavailable'; end if;
    if saved.deliver_at is distinct from p_expected_delivery or saved.updated_at is distinct from p_expected_updated_at then raise exception 'Note changed'; end if;
    if saved.deliver_at is not null and saved.deliver_at <= clock_timestamp() then raise exception 'Surprise already delivered'; end if;
    if saved.deliver_at is null and p_delivery is not null then raise exception 'An already sent note cannot be scheduled'; end if;
    update public.partner_notes set body = btrim(p_body), deliver_at = p_delivery, photo_count = jsonb_array_length(p_photos)
      where id = p_note_id returning * into saved;
    delete from public.partner_note_photos where note_id = saved.id;
  end if;
  for photo in select * from jsonb_array_elements(p_photos) loop
    insert into public.partner_note_photos(note_id, position, data_url) values (saved.id, photo_index, photo #>> '{}');
    photo_index := photo_index + 1;
  end loop;
  return saved;
end $$;
revoke all on function public.save_partner_note_photos(uuid,timestamptz,timestamptz,text,text,timestamptz,jsonb) from public, anon;
grant execute on function public.save_partner_note_photos(uuid,timestamptz,timestamptz,text,text,timestamptz,jsonb) to authenticated;
