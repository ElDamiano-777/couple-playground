-- Extend existing wishes in place; legacy wishes with no author remain readable.
begin;
alter table public.folder_entries
  add column wish_photo text check (wish_photo is null or (length(wish_photo) <= 1400000 and wish_photo ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$')),
  add column wish_url text check (wish_url is null or (length(wish_url) <= 2048 and wish_url ~ '^https?://')),
  add column wish_price_cents integer check (wish_price_cents is null or wish_price_cents between 0 and 100000000),
  add column wish_priority text not null default 'idea' check (wish_priority in ('idea', 'want', 'dream')),
  add column wish_fulfilled_at timestamptz;
grant insert (wish_photo, wish_url, wish_price_cents, wish_priority, wish_fulfilled_at) on public.folder_entries to authenticated;
grant update (wish_photo, wish_url, wish_price_cents, wish_priority, wish_fulfilled_at) on public.folder_entries to authenticated;
drop policy folder_entries_update on public.folder_entries;
create policy folder_entries_update on public.folder_entries for update to authenticated
  using (household_id = (select public.current_household()) and (kind <> 'wish' or created_by = (select auth.uid())))
  with check (household_id = (select public.current_household()) and (kind <> 'wish' or created_by = (select auth.uid())));
drop policy folder_entries_delete on public.folder_entries;
create policy folder_entries_delete on public.folder_entries for delete to authenticated
  using (household_id = (select public.current_household()) and (kind <> 'wish' or created_by = (select auth.uid())));

-- Plans are not part of the shared wish, a shared feed, or a push event.
create table public.wish_gift_plans (
  wish_id uuid not null references public.folder_entries(id) on delete cascade,
  planner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (wish_id, planner_id)
);
alter table public.wish_gift_plans enable row level security;
revoke all on public.wish_gift_plans from public, anon, authenticated;
grant select, delete on public.wish_gift_plans to authenticated;
grant insert (wish_id) on public.wish_gift_plans to authenticated;
create policy gift_plans_read on public.wish_gift_plans for select to authenticated
  using (planner_id = (select auth.uid()) and exists (select 1 from public.folder_entries w where w.id = wish_id and w.kind = 'wish' and w.created_by <> (select auth.uid()) and w.household_id = (select public.current_household())));
create policy gift_plans_add on public.wish_gift_plans for insert to authenticated
  with check (planner_id = (select auth.uid()) and exists (select 1 from public.folder_entries w where w.id = wish_id and w.kind = 'wish' and w.created_by <> (select auth.uid()) and w.household_id = (select public.current_household())));
create policy gift_plans_delete on public.wish_gift_plans for delete to authenticated
  using (planner_id = (select auth.uid()) and exists (select 1 from public.folder_entries w where w.id = wish_id and w.kind = 'wish' and w.created_by <> (select auth.uid()) and w.household_id = (select public.current_household())));
commit;
