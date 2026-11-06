-- Push notifications for newly added household tasks. Tasks reuse the existing
-- push_events/push_deliveries pipeline; the recipient's "new items" preference
-- also covers new tasks. Existing events and deliveries are unchanged.
begin;

alter table public.push_events drop constraint if exists push_events_kind_check;
alter table public.push_events add constraint push_events_kind_check
  check (kind in ('item_added', 'item_purchased', 'task_added'));
alter table public.push_events alter column shopping_item_id drop not null;
alter table public.push_events add column task_id uuid;

alter table public.push_deliveries drop constraint if exists push_deliveries_kind_check;
alter table public.push_deliveries add constraint push_deliveries_kind_check
  check (kind in ('item_added', 'item_purchased', 'task_added', 'shopping_reminder'));

-- Shared by the shopping and task triggers. A failed dispatch must never roll
-- back the change that caused it; the minute schedule retries recent events.
create function public.dispatch_push_event(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare internal_token text;
begin
  if to_regclass('vault.decrypted_secrets') is null
    or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return;
  end if;
  select decrypted_secret into internal_token
    from vault.decrypted_secrets where name = 'together_push_delivery_token' limit 1;
  if internal_token is null then return; end if;
  begin
    perform net.http_post(
      url := 'https://lyewmhtufesdccisqmin.supabase.co/functions/v1/push-delivery',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-together-push-token', internal_token),
      body := jsonb_build_object('mode', 'event', 'event_id', p_event_id)
    );
  exception when others then
    raise warning 'Together push dispatch queue unavailable: %', sqlerrm;
  end;
end $$;

create or replace function public.record_shopping_push_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare event_id uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.push_events(household_id, actor_id, shopping_item_id, kind, item_name)
      values (new.household_id, new.created_by, new.id, 'item_added', new.name)
      returning id into event_id;
  elsif new.bought is true and old.bought is false then
    insert into public.push_events(household_id, actor_id, shopping_item_id, kind, item_name)
      values (new.household_id, auth.uid(), new.id, 'item_purchased', new.name)
      returning id into event_id;
  else
    return new;
  end if;
  perform public.dispatch_push_event(event_id);
  return new;
end $$;

create function public.record_task_push_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare event_id uuid;
begin
  insert into public.push_events(household_id, actor_id, task_id, kind, item_name)
    values (new.household_id, new.created_by, new.id, 'task_added', left(btrim(new.title), 200))
    returning id into event_id;
  perform public.dispatch_push_event(event_id);
  return new;
end $$;
create trigger household_task_push_event after insert on public.household_tasks
  for each row execute function public.record_task_push_event();

revoke all on function public.dispatch_push_event(uuid), public.record_task_push_event() from public, anon, authenticated;
commit;
