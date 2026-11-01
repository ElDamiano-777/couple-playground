-- Prepared only: an administrator must configure VAPID and explicitly enable delivery.
begin;
create table together_private.push_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  public_key text check (public_key ~ '^B[A-Za-z0-9_-]{86}$')
);
insert into together_private.push_settings default values;
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;
-- No browser SELECT policy or table grants: subscriptions are write-only through own-account RPCs.

create function public.push_configuration() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when enabled and public_key is not null and auth.uid() is not null
    then jsonb_build_object('publicKey', public_key) else null end
  from together_private.push_settings where singleton
$$;

-- Exact provider hosts only; no credentials, custom ports, fragments or arbitrary URLs.
create function together_private.valid_push_endpoint(endpoint text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(length(endpoint) between 20 and 2048 and endpoint ~
    '^https://(web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com)/[A-Za-z0-9_/?=&%+.,~:-]+$', false)
$$;

create function public.register_push_subscription(subscription jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; target text := subscription->>'endpoint';
  key_value text := subscription->'keys'->>'p256dh'; auth_value text := subscription->'keys'->>'auth';
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if public.current_household() is null then raise exception 'Join a household first'; end if;
  if public.push_configuration() is null then raise exception 'Notifications are not configured'; end if;
  if not together_private.valid_push_endpoint(target)
    or key_value is null or key_value !~ '^B[A-Za-z0-9_-]{86}$'
    or auth_value is null or auth_value !~ '^[A-Za-z0-9_-]{22}$'
    then raise exception 'Invalid push subscription'; end if;
  if octet_length(decode(translate(key_value, '-_', '+/') || '=', 'base64')) <> 65
    or get_byte(decode(translate(key_value, '-_', '+/') || '=', 'base64'), 0) <> 4
    or octet_length(decode(translate(auth_value, '-_', '+/') || '==', 'base64')) <> 16
    then raise exception 'Invalid push subscription'; end if;
  -- Serialize registrations for this account to enforce the device cap.
  perform 1 from auth.users where id = auth.uid() for update;
  select id into result from public.push_subscriptions where endpoint = target and user_id = auth.uid();
  if result is null and (select count(*) from public.push_subscriptions where user_id = auth.uid()) >= 5
    then raise exception 'Device limit reached'; end if;
  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth)
    values(auth.uid(), target, key_value, auth_value)
    on conflict(endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth
      where public.push_subscriptions.user_id = auth.uid()
    returning id into result;
  if result is null then raise exception 'Subscription belongs to another account'; end if;
  return result;
end $$;

create function public.unregister_push_subscription(endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions s where s.endpoint = unregister_push_subscription.endpoint and s.user_id = auth.uid()
$$;

create table together_private.push_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  item_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  kind text not null check (kind in ('added', 'bought', 'unbought')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day',
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  claim_token uuid,
  unique(event_id, subscription_id)
);
create index push_jobs_available on together_private.push_jobs(available_at);
alter table together_private.push_jobs enable row level security;
alter table together_private.push_settings enable row level security;
revoke all on together_private.push_jobs, together_private.push_settings from public, anon, authenticated;

create function together_private.queue_shopping_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare event uuid := gen_random_uuid(); change_kind text;
begin
  if auth.uid() is null or not exists (select 1 from together_private.push_settings where enabled and public_key is not null)
    or not exists (select 1 from public.household_members where user_id = auth.uid() and household_id = new.household_id)
    then return new; end if;
  if tg_op = 'INSERT' then change_kind := 'added';
  elsif old.bought is distinct from new.bought then change_kind := case when new.bought then 'bought' else 'unbought' end;
  else return new; end if;
  insert into together_private.push_jobs(event_id, item_id, household_id, actor_id, recipient_id, subscription_id, kind)
    select event, new.id, new.household_id, auth.uid(), m.user_id, s.id, change_kind
    from public.household_members m join public.push_subscriptions s on s.user_id = m.user_id
    where m.household_id = new.household_id and m.user_id <> auth.uid();
  return new;
end $$;
create trigger shopping_push after insert or update of bought on public.shopping_items
  for each row execute function together_private.queue_shopping_push();

-- Only the service role can claim or inspect deliveries; browser sessions cannot send pushes.
create function public.claim_push_jobs() returns table(id uuid, claim_token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  delete from together_private.push_jobs j where j.expires_at <= now() or (j.attempts >= 5 and j.available_at <= now());
  if not exists (select 1 from together_private.push_settings where enabled and public_key is not null) then return; end if;
  return query with pending as (
    select j.id from together_private.push_jobs j where j.available_at <= now() and j.attempts < 5
    order by j.available_at for update skip locked limit 10
  ) update together_private.push_jobs j set claim_token = gen_random_uuid(), attempts = attempts + 1,
    available_at = now() + interval '2 minutes' from pending p where p.id = j.id
    returning j.id, j.claim_token;
end $$;

create function public.push_delivery(job_id uuid, token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('endpoint', s.endpoint, 'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth),
    'eventId', j.event_id, 'kind', j.kind)
  from together_private.push_jobs j join public.push_subscriptions s on s.id = j.subscription_id and s.user_id = j.recipient_id
  join public.household_members m on m.user_id = j.recipient_id and m.household_id = j.household_id
  join public.household_members a on a.user_id = j.actor_id and a.household_id = j.household_id
  where j.id = job_id and j.claim_token = token and j.available_at > now() and j.expires_at > now()
    and j.recipient_id <> j.actor_id
    and exists (select 1 from together_private.push_settings where enabled and public_key is not null)
$$;

create function public.finish_push_job(job_id uuid, token uuid, outcome text) returns void
language plpgsql security definer set search_path = '' as $$
declare device uuid;
begin
  select subscription_id into device from together_private.push_jobs where id = job_id and claim_token = token for update;
  if device is null then return; end if;
  if outcome = 'gone' then delete from public.push_subscriptions where id = device;
  elsif outcome in ('sent', 'skip') then delete from together_private.push_jobs where id = job_id;
  elsif outcome = 'retry' then
    update together_private.push_jobs set claim_token = null,
      available_at = now() + make_interval(secs => least(3600, 30 * (2 ^ attempts)::integer)) where id = job_id;
  else raise exception 'Invalid delivery outcome'; end if;
end $$;

revoke all on function public.push_configuration(), public.register_push_subscription(jsonb), public.unregister_push_subscription(text) from public, anon;
grant execute on function public.push_configuration(), public.register_push_subscription(jsonb), public.unregister_push_subscription(text) to authenticated;
revoke all on function public.claim_push_jobs(), public.push_delivery(uuid, uuid), public.finish_push_job(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_push_jobs(), public.push_delivery(uuid, uuid), public.finish_push_job(uuid, uuid, text) to service_role;
revoke all on function together_private.valid_push_endpoint(text), together_private.queue_shopping_push() from public, anon, authenticated;
commit;
