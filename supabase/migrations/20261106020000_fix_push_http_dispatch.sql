-- net.http_post has five parameters (url, body, params, headers, timeout). The
-- earlier availability check looked for a three-argument signature that does not
-- exist, so push dispatch returned early and never called the Edge Function.
-- Replace both dispatch functions with the correct check. CREATE OR REPLACE keeps
-- the existing triggers, cron job and revoked privileges.
begin;

create or replace function public.record_shopping_push_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare event_id uuid; internal_token text;
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

  -- Until the extensions and token exist, still save the event; incomplete
  -- notification setup must never block a list mutation.
  if to_regclass('vault.decrypted_secrets') is null
    or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return new;
  end if;
  select decrypted_secret into internal_token
    from vault.decrypted_secrets where name = 'together_push_delivery_token' limit 1;
  if internal_token is null then return new; end if;
  begin
    perform net.http_post(
      url := 'https://lyewmhtufesdccisqmin.supabase.co/functions/v1/push-delivery',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-together-push-token', internal_token),
      body := jsonb_build_object('mode', 'event', 'event_id', event_id)
    );
  exception when others then
    raise warning 'Together push dispatch queue unavailable: %', sqlerrm;
  end;
  return new;
end $$;

create or replace function public.run_together_push_schedule() returns void
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
      body := jsonb_build_object('mode', 'scheduled')
    );
  exception when others then
    raise warning 'Together push schedule unavailable: %', sqlerrm;
  end;
end $$;

commit;
