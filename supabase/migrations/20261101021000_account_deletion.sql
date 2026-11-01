begin;
-- Removing one's account must not remove a remaining partner's purchases.
alter table public.shopping_items alter column created_by drop not null;
alter table public.shopping_items drop constraint shopping_items_created_by_fkey;
alter table public.shopping_items add constraint shopping_items_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid; actor uuid;
begin
  actor := auth.uid();
  if actor is null then raise exception 'Sign in first'; end if;
  target := public.current_household();
  if target is not null then
    perform 1 from public.households where id = target for update;
    delete from together_private.invitations where household_id = target;
  end if;
  delete from auth.users where id = actor;
  if target is not null and not exists (select 1 from public.household_members where household_id = target) then
    delete from public.households where id = target;
  end if;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
commit;
