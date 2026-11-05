-- Google Calendar credentials are only read by the private Edge Function.
begin;

create table public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null check (length(encrypted_refresh_token) between 1 and 2048),
  token_iv text not null check (length(token_iv) between 1 and 128),
  google_email text check (length(google_email) <= 320),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_calendar_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null check (length(calendar_id) between 1 and 1024),
  selected boolean not null default true,
  visible_to_partner boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, calendar_id)
);

create table public.google_calendar_oauth_states (
  state text primary key check (length(state) between 32 and 256),
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index google_calendar_oauth_states_expires on public.google_calendar_oauth_states(expires_at);

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_preferences enable row level security;
alter table public.google_calendar_oauth_states enable row level security;
revoke all on public.google_calendar_connections, public.google_calendar_preferences, public.google_calendar_oauth_states from anon, authenticated;

create function public.touch_google_calendar_connection() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger google_calendar_connections_touch before update on public.google_calendar_connections
for each row execute function public.touch_google_calendar_connection();

create function public.touch_google_calendar_preference() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger google_calendar_preferences_touch before update on public.google_calendar_preferences
for each row execute function public.touch_google_calendar_preference();

revoke all on function public.touch_google_calendar_connection(), public.touch_google_calendar_preference() from public, anon, authenticated;
commit;
