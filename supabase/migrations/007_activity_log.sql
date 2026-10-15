-- ============================================================
-- Migration 007 — Activity log (powers the notification bell)
-- Every important action writes one row: who did what, to which family.
-- Data collectors only see 'family' / 'document' activity; other roles see everything.
-- ============================================================
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.users(id),
  actor_name  text,
  category    text not null default 'general',   -- family | document | payment | bank | case | settings
  message     text not null,
  family_id   uuid references public.families(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists activity_log_created_idx on public.activity_log(created_at desc);

alter table public.activity_log enable row level security;
drop policy if exists "Read activity"   on public.activity_log;
drop policy if exists "Insert activity" on public.activity_log;
create policy "Read activity" on public.activity_log for select using (
  public.has_role(array['admin','director','finance','project_coordinator'])
  or (public.has_role(array['data_collector']) and category in ('family','document'))
);
create policy "Insert activity" on public.activity_log for insert
  with check (public.current_role_name() is not null and actor_id = auth.uid());

-- live updates for the bell (ignore the error if the table is already published)
do $$ begin
  alter publication supabase_realtime add table public.activity_log;
exception when others then null; end $$;
