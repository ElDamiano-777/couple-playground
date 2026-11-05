begin;
create table public.shared_expenses (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  amount_cents integer not null check (amount_cents between 1 and 100000000), expense_date date not null, category text not null check (length(btrim(category)) between 1 and 50), description text not null default '' check (length(description) <= 500), paid_by text not null check (paid_by in ('masha','damian')), currency text not null default 'EUR' check (currency = 'EUR'), created_by uuid default auth.uid() references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index shared_expenses_household_date on public.shared_expenses(household_id, expense_date desc);
alter table public.shared_expenses enable row level security; revoke all on public.shared_expenses from anon, authenticated;
grant select, delete on public.shared_expenses to authenticated; grant insert (household_id,amount_cents,expense_date,category,description,paid_by,currency) on public.shared_expenses to authenticated; grant update (amount_cents,expense_date,category,description,paid_by,currency) on public.shared_expenses to authenticated;
create policy shared_expenses_read on public.shared_expenses for select to authenticated using (household_id = (select public.current_household()));
create policy shared_expenses_add on public.shared_expenses for insert to authenticated with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy shared_expenses_update on public.shared_expenses for update to authenticated using (household_id = (select public.current_household())) with check (household_id = (select public.current_household()));
create policy shared_expenses_delete on public.shared_expenses for delete to authenticated using (household_id = (select public.current_household()));
create table public.partner_notes (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade, sender text not null check (sender in ('masha','damian')), body text not null check (length(btrim(body)) between 1 and 2000), created_by uuid default auth.uid() references auth.users(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.partner_note_reads (note_id uuid not null references public.partner_notes(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, read_at timestamptz not null default now(), primary key(note_id,user_id));
create index partner_notes_household_created on public.partner_notes(household_id, created_at desc);
alter table public.partner_notes enable row level security; alter table public.partner_note_reads enable row level security; revoke all on public.partner_notes, public.partner_note_reads from anon, authenticated;
grant select on public.partner_notes to authenticated; grant insert (household_id,sender,body) on public.partner_notes to authenticated; grant update (body) on public.partner_notes to authenticated; grant delete on public.partner_notes to authenticated;
create policy partner_notes_read on public.partner_notes for select to authenticated using (household_id = (select public.current_household()));
create policy partner_notes_add on public.partner_notes for insert to authenticated with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));
create policy partner_notes_update on public.partner_notes for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy partner_notes_delete on public.partner_notes for delete to authenticated using (created_by = (select auth.uid()));
grant select, insert on public.partner_note_reads to authenticated;
create policy partner_note_reads_read on public.partner_note_reads for select to authenticated using (user_id = (select auth.uid()));
create policy partner_note_reads_add on public.partner_note_reads for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.partner_notes where id = note_id and household_id = (select public.current_household())));
create function public.touch_shared_row() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger shared_expenses_touch before update on public.shared_expenses for each row execute function public.touch_shared_row(); create trigger partner_notes_touch before update on public.partner_notes for each row execute function public.touch_shared_row(); revoke all on function public.touch_shared_row() from public, anon, authenticated;
commit;
