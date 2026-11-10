-- Reactions are shared within the household; bookmarks belong only to their owner.
create table public.partner_note_reactions (
  note_id uuid not null references public.partner_notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('❤️', '🥰', '😂')),
  primary key (note_id, user_id)
);
create table public.partner_note_favorites (
  note_id uuid not null references public.partner_notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (note_id, user_id)
);
alter table public.partner_note_reactions enable row level security;
alter table public.partner_note_favorites enable row level security;
revoke all on public.partner_note_reactions, public.partner_note_favorites from anon, authenticated;
grant select, delete on public.partner_note_reactions to authenticated;
grant insert (note_id, user_id, reaction), update (reaction) on public.partner_note_reactions to authenticated;
grant select, delete on public.partner_note_favorites to authenticated;
grant insert (note_id, user_id) on public.partner_note_favorites to authenticated;

-- The existing note policy scopes the lookup to the household. Require a
-- release for everyone, and a read receipt before a recipient can react.
create policy partner_note_reactions_read on public.partner_note_reactions for select to authenticated
  using (exists (select 1 from public.partner_notes note where note.id = note_id
    and (note.deliver_at is null or note.deliver_at <= clock_timestamp())
    and (note.created_by = (select auth.uid()) or exists (select 1 from public.partner_note_reads receipt where receipt.note_id = note.id and receipt.user_id = (select auth.uid())))));
create policy partner_note_reactions_add on public.partner_note_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes note where note.id = note_id
    and (note.deliver_at is null or note.deliver_at <= clock_timestamp())
    and (note.created_by = (select auth.uid()) or exists (select 1 from public.partner_note_reads receipt where receipt.note_id = note.id and receipt.user_id = (select auth.uid())))));
create policy partner_note_reactions_update on public.partner_note_reactions for update to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes note where note.id = note_id
    and (note.deliver_at is null or note.deliver_at <= clock_timestamp())
    and (note.created_by = (select auth.uid()) or exists (select 1 from public.partner_note_reads receipt where receipt.note_id = note.id and receipt.user_id = (select auth.uid())))))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes note where note.id = note_id
    and (note.deliver_at is null or note.deliver_at <= clock_timestamp())
    and (note.created_by = (select auth.uid()) or exists (select 1 from public.partner_note_reads receipt where receipt.note_id = note.id and receipt.user_id = (select auth.uid())))));
create policy partner_note_reactions_delete on public.partner_note_reactions for delete to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes note where note.id = note_id
    and (note.deliver_at is null or note.deliver_at <= clock_timestamp())
    and (note.created_by = (select auth.uid()) or exists (select 1 from public.partner_note_reads receipt where receipt.note_id = note.id and receipt.user_id = (select auth.uid())))));

-- A bookmark is private even from the other household member. Unopened
-- letters may be bookmarked without revealing their content in the UI.
create policy partner_note_favorites_read on public.partner_note_favorites for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes note where note.id = note_id and (note.deliver_at is null or note.deliver_at <= clock_timestamp())));
create policy partner_note_favorites_add on public.partner_note_favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes note where note.id = note_id and (note.deliver_at is null or note.deliver_at <= clock_timestamp())));
create policy partner_note_favorites_delete on public.partner_note_favorites for delete to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes note where note.id = note_id and (note.deliver_at is null or note.deliver_at <= clock_timestamp())));
