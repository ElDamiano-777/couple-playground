-- Shared photo memories remain inside the authenticated household database.
begin;
create function public.valid_memory_photos(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) <> 'array' then false else
    jsonb_array_length(value) <= 5 and not exists (
      select 1 from jsonb_array_elements(value) item
      where jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 700000
        or (item #>> '{}') !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
    ) end
$$;
create table public.shared_memories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 150),
  event_date date not null,
  story text not null default '' check (length(story) <= 20000),
  location text not null default '' check (length(location) <= 200),
  category text check (category is null or category in ('Date Night','Birthday','Anniversary','Travel','Everyday Moments','Other')),
  photos jsonb not null default '[]'::jsonb check (public.valid_memory_photos(photos)),
  cover_index smallint not null default 0 check (cover_index >= 0 and (jsonb_array_length(photos) = 0 and cover_index = 0 or cover_index < jsonb_array_length(photos))),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create index shared_memories_household_date on public.shared_memories(household_id, event_date desc, created_at desc);
alter table public.shared_memories enable row level security;
revoke all on public.shared_memories from public, anon, authenticated;
grant select, delete on public.shared_memories to authenticated;
grant insert (household_id,title,event_date,story,location,category,photos,cover_index) on public.shared_memories to authenticated;
grant update (title,event_date,story,location,category,photos,cover_index) on public.shared_memories to authenticated;
create policy shared_memories_read on public.shared_memories for select to authenticated using (household_id = (select public.current_household()));
create policy shared_memories_add on public.shared_memories for insert to authenticated with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy shared_memories_update on public.shared_memories for update to authenticated using (household_id = (select public.current_household())) with check (household_id = (select public.current_household()));
create policy shared_memories_delete on public.shared_memories for delete to authenticated using (household_id = (select public.current_household()));
create function public.touch_shared_memory() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); new.revision := old.revision + 1; return new; end $$;
create trigger shared_memory_touch before update on public.shared_memories for each row execute function public.touch_shared_memory();
revoke all on function public.touch_shared_memory() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.shared_memories;
  end if;
end $$;
commit;
