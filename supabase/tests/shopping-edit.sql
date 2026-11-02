\set ON_ERROR_STOP on
\ir access.sql
\ir ../migrations/20261102050000_shopping_item_edit.sql
insert into auth.users values ('40000000-0000-4000-8000-000000000001'), ('40000000-0000-4000-8000-000000000002'), ('40000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
select public.create_household();
select public.create_household_invitation() as code \gset
insert into public.shopping_items(household_id, name, category) values(public.current_household(), 'Original', 'Pets') returning id as item \gset
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', false);
select public.join_household(:'code');
update public.shopping_items set name = 'Partner edit', category = 'Kids' where id = :'item';
select set_config('test.item', :'item', false);
do $$ begin
  if not exists(select 1 from public.shopping_items where id = current_setting('test.item')::uuid and name = 'Partner edit' and category = 'Kids') then raise exception 'Partner edit failed'; end if;
  begin update public.shopping_items set household_id = public.current_household(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin update public.shopping_items set category = 'Invalid'; raise exception 'TEST FAILED'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', false);
select public.create_household();
do $$ declare changed integer; begin
  update public.shopping_items set name = 'Forbidden' where id = current_setting('test.item')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Foreign edit succeeded'; end if;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
do $$ begin
  if not exists(select 1 from public.shopping_items where id = current_setting('test.item')::uuid and name = 'Partner edit' and category = 'Kids') then raise exception 'Data changed unexpectedly'; end if;
end $$;
