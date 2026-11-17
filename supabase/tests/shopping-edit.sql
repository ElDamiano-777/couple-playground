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
reset role;
\ir ../migrations/20261102060000_shopping_item_details.sql
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
do $$ begin
  if not exists(select 1 from public.shopping_items where id = current_setting('test.item')::uuid and notes = '' and name = 'Partner edit') then raise exception 'Existing item changed'; end if;
end $$;
insert into public.shopping_items(household_id, name, category, notes) values
  (public.current_household(), 'Eggs', 'Home', '12 large'),
  (public.current_household(), 'Milk', 'Home', 'Oat');
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', false);
do $$ begin
  if (select count(*) from public.shopping_items where name in ('Eggs','Milk') and notes in ('12 large','Oat')) <> 2 then raise exception 'Partner cannot read details'; end if;
end $$;
update public.shopping_items set notes = '12 medium' where name = 'Eggs';
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', false);
do $$ declare changed integer; begin
  update public.shopping_items set notes = 'Forbidden' where name = 'Eggs';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Foreign edit succeeded'; end if;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
do $$ begin
  if not exists(select 1 from public.shopping_items where name = 'Eggs' and notes = '12 medium') then raise exception 'Details did not sync'; end if;
end $$;
do $$ begin
  begin
    insert into public.shopping_items(household_id, name, category, notes) values
      (public.current_household(), 'Should not be added', 'Home', ''),
      (public.current_household(), '', 'Home', '');
    raise exception 'TEST FAILED';
  exception when check_violation then null; end;
  if exists(select 1 from public.shopping_items where name = 'Should not be added') then raise exception 'Partial batch was saved'; end if;
end $$;
reset role;
\ir ../migrations/20261103010000_shopping_favorites.sql
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
select set_config('test.shopping_home', public.current_household()::text, false);
insert into public.shopping_favorites(household_id, category, name, brand, quantity, notes, photo)
values(public.current_household(), 'Home', 'Tea', 'Example', '2 boxes', 'Mint', 'data:image/jpeg;base64,YQ==') returning id as favorite \gset
select set_config('test.favorite', :'favorite', false);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', false);
do $$ begin
  if not exists(select 1 from public.shopping_favorites where id = current_setting('test.favorite')::uuid and photo is not null and name = 'Tea') then raise exception 'Partner cannot read favorite'; end if;
end $$;
update public.shopping_favorites set quantity = '3 boxes' where id = :'favorite';
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', false);
do $$ declare changed integer; begin
  if exists(select 1 from public.shopping_favorites where id = current_setting('test.favorite')::uuid) then raise exception 'Foreign read succeeded'; end if;
  update public.shopping_favorites set name = 'Forbidden' where id = current_setting('test.favorite')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Foreign edit succeeded'; end if;
  begin insert into public.shopping_favorites(household_id, category, name) values(current_setting('test.shopping_home')::uuid, 'Home', 'Forbidden'); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
do $$ begin
  if not exists(select 1 from public.shopping_favorites where id = current_setting('test.favorite')::uuid and quantity = '3 boxes' and photo is not null) then raise exception 'Favorite changed unexpectedly'; end if;
  begin update public.shopping_favorites set household_id = public.current_household(); raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
  begin update public.shopping_favorites set photo = repeat('a',1400001); raise exception 'TEST FAILED'; exception when check_violation then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from public.shopping_favorites; raise exception 'TEST FAILED'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
-- A pre-existing duplicate must not be removed or prevent unrelated edits.
insert into public.shopping_favorites(household_id, category, name, brand) values(public.current_household(), 'Home', 'Tea', 'Example');
reset role;
\ir ../migrations/20261103020000_favorite_product_picker.sql
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
do $$ begin
  if (select count(*) from public.shopping_favorites where name = 'Tea' and brand = 'Example') <> 2 then raise exception 'Existing favorites changed'; end if;
  if not exists(select 1 from public.shopping_favorites where id = current_setting('test.favorite')::uuid and photo is not null and flavor = '' and size = '') then raise exception 'Favorite photo or options changed'; end if;
  begin insert into public.shopping_favorites(household_id, category, name, brand) values(public.current_household(), 'Home', ' tea ', 'EXAMPLE'); raise exception 'TEST FAILED'; exception when unique_violation then null; end;
end $$;
update public.shopping_favorites set notes = 'Preserved edit' where id = :'favorite';
insert into public.shopping_favorites(household_id, category, name, brand, flavor, size) values(public.current_household(), 'Home', 'Tea', 'Example', 'Mint', 'Large');
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', false);
do $$ begin
  if not exists(select 1 from public.shopping_favorites where name = 'Tea' and flavor = 'Mint' and size = 'Large') then raise exception 'Partner cannot read options'; end if;
  begin insert into public.shopping_favorites(household_id, category, name, brand, flavor, size) values(public.current_household(), 'Home', 'tea', 'example', 'mint', 'large'); raise exception 'TEST FAILED'; exception when unique_violation then null; end;
end $$;
reset role;
\ir ../migrations/20261103030000_shopping_favorite_photo_reference.sql
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
insert into public.shopping_items(household_id, name, category, favorite_id) values(public.current_household(), 'Linked tea', 'Home', :'favorite') returning id as linked_item \gset
select set_config('test.linked_item', :'linked_item', false);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', false);
update public.shopping_items set bought = true, name = 'Renamed tea' where id = :'linked_item';
do $$ begin
  if not exists(select 1 from public.shopping_items s join public.shopping_favorites f on f.id = s.favorite_id where s.id = current_setting('test.linked_item')::uuid and s.bought and f.photo is not null) then raise exception 'Partner cannot access linked photo'; end if;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', false);
do $$ begin
  begin insert into public.shopping_items(household_id, name, category, favorite_id) values(public.current_household(), 'Forbidden link', 'Home', current_setting('test.favorite')::uuid); raise exception 'TEST FAILED'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
delete from public.shopping_favorites where id = :'favorite';
do $$ begin
  if not exists(select 1 from public.shopping_items where id = current_setting('test.linked_item')::uuid and favorite_id is null and name = 'Renamed tea') then raise exception 'Favorite deletion changed shopping item'; end if;
end $$;
-- Reproduce the scanner failure, then verify the fix preserves existing photos and access rules.
insert into public.shopping_favorites(household_id, category, name, photo) values(public.current_household(), 'Home', 'Existing photo', 'data:image/jpeg;base64,YQ==') returning id as existing_photo \gset
do $$ begin
  begin
    insert into public.shopping_favorites(household_id, category, name, photo) values(public.current_household(), 'Home', 'Scanned product', 'https://images.openfoodfacts.org/images/products/590/front.jpg');
    raise exception 'Expected the old photo constraint to reject a barcode image URL';
  exception when check_violation then null; end;
end $$;
reset role;
\ir ../migrations/20261117010000_favorite_barcode_photos.sql
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', false);
insert into public.shopping_favorites(household_id, category, name, brand, quantity, photo) values(public.current_household(), 'Home', 'Scanned product', 'Example', '1 kg', 'https://images.openfoodfacts.org/images/products/590/front.jpg') returning id as barcode_favorite \gset
select set_config('test.barcode_favorite', :'barcode_favorite', false);
select set_config('test.existing_photo', :'existing_photo', false);
do $$ begin
  if not exists(select 1 from public.shopping_favorites where id = current_setting('test.existing_photo')::uuid and photo = 'data:image/jpeg;base64,YQ==') then raise exception 'Existing photo changed'; end if;
  begin insert into public.shopping_favorites(household_id, category, name, photo) values(public.current_household(), 'Home', 'Unsafe photo', 'https://images.openfoodfacts.org.attacker.test/front.jpg'); raise exception 'Unsafe photo accepted'; exception when check_violation then null; end;
  begin insert into public.shopping_favorites(household_id, category, name, photo) values(public.current_household(), 'Home', 'Insecure photo', 'http://images.openfoodfacts.org/front.jpg'); raise exception 'Insecure photo accepted'; exception when check_violation then null; end;
  begin insert into public.shopping_favorites(household_id, category, name, brand, photo) values(public.current_household(), 'Home', 'Scanned product', 'Example', 'https://images.openfoodfacts.org/front.jpg'); raise exception 'Duplicate accepted'; exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', false);
do $$ begin
  if not exists(select 1 from public.shopping_favorites where id = current_setting('test.barcode_favorite')::uuid and name = 'Scanned product' and brand = 'Example' and quantity = '1 kg' and photo = 'https://images.openfoodfacts.org/images/products/590/front.jpg') then raise exception 'Partner cannot read scanned favorite'; end if;
end $$;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', false);
do $$ begin if exists(select 1 from public.shopping_favorites where id = current_setting('test.barcode_favorite')::uuid) then raise exception 'Foreign household can read scanned favorite'; end if; end $$;
