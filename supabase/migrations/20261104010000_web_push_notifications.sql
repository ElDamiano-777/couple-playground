-- Web Push is delivered only by the Edge Function. Browser clients never read
-- subscriptions or event logs, and private VAPID material never enters SQL.
begin;

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  new_item_enabled boolean not null default true,
  purchased_enabled boolean not null default true,
  reminder_enabled boolean not null default false,
  reminder_weekday smallint not null default 0 check (reminder_weekday between 0 and 6),
  reminder_time time not null default time '18:00',
  timezone text not null default 'Europe/Berlin' check (length(timezone) between 1 and 64),
  updated_at timestamptz not null default now()
);
create index notification_preferences_household on public.notification_preferences(household_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (length(endpoint) between 1 and 4096),
  p256dh text not null check (length(p256dh) between 1 and 512),
  auth text not null check (length(auth) between 1 and 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create table public.push_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  shopping_item_id uuid not null,
  kind text not null check (kind in ('item_added', 'item_purchased')),
  item_name text not null check (length(item_name) between 1 and 200),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index push_events_pending on public.push_events(created_at) where processed_at is null;

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique check (length(dedupe_key) between 1 and 300),
  event_id uuid references public.push_events(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete cascade,
  kind text not null check (kind in ('item_added', 'item_purchased', 'shopping_reminder')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error_code integer
);
create index push_deliveries_recipient on public.push_deliveries(recipient_id, created_at);

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_events enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.notification_preferences, public.push_subscriptions, public.push_events, public.push_deliveries from anon, authenticated;
-- Preferences are returned and mutated through an authenticated Edge Function.
-- This keeps endpoint keys and delivery metadata server-only.

create function public.touch_notification_preferences() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger notification_preferences_touch before update on public.notification_preferences
  for each row execute function public.touch_notification_preferences();

-- The database records an immutable event at the same time as the shopping
-- mutation. A failed push request must never roll back a shopping-list change.
create function public.record_shopping_push_event() returns trigger
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

  -- Extensions are enabled by the project owner. Until then, still save the
  -- event; incomplete notification setup must never block a list mutation.
  if to_regclass('vault.decrypted_secrets') is null
    or to_regprocedure('net.http_post(text,jsonb,jsonb)') is null then
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
create trigger shopping_push_event after insert or update of bought on public.shopping_items
  for each row execute function public.record_shopping_push_event();

-- A minute-level schedule processes any event that raced the committing
-- transaction and sends reminders at the member's selected local minute.
create function public.run_together_push_schedule() returns void
language plpgsql security definer set search_path = '' as $$
declare internal_token text;
begin
  if to_regclass('vault.decrypted_secrets') is null
    or to_regprocedure('net.http_post(text,jsonb,jsonb)') is null then
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
do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    if not exists (select 1 from cron.job where jobname = 'together-push-schedule') then
      perform cron.schedule('together-push-schedule', '* * * * *', $schedule$select public.run_together_push_schedule()$schedule$);
    end if;
  end if;
end $$;

revoke all on function public.touch_notification_preferences(), public.record_shopping_push_event(), public.run_together_push_schedule() from public, anon, authenticated;
commit;
