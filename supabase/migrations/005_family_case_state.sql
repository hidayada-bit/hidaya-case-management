-- ============================================================
-- Migration 005 — Family case state (hold / transfer) + history
--   * normal      : family is active in all lists
--   * on_hold     : stays in the family list, removed from the bank list, shown UNPAID on the payment list
--   * transferred : removed from families, bank list and payment list; visible only to admin (Transferred page)
-- Every change stores a reason and the admin's name.
-- Run once in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================
alter table public.families add column if not exists case_state           text not null default 'normal';
alter table public.families add column if not exists case_reason          text;
alter table public.families add column if not exists case_changed_at      timestamptz;
alter table public.families add column if not exists case_changed_by_name text;
alter table public.families drop constraint if exists families_case_state_check;
alter table public.families add constraint families_case_state_check check (case_state in ('normal','on_hold','transferred'));
create index if not exists families_case_state_idx on public.families(case_state);

create table if not exists public.family_status_log (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  action         text not null check (action in ('hold','release','transfer','restore')),
  from_state     text,
  to_state       text,
  reason         text not null,
  by_user        uuid references public.users(id),
  by_name        text,
  created_at     timestamptz default now(),
  edited_at      timestamptz,
  edited_by_name text
);
create index if not exists family_status_log_family_idx on public.family_status_log(family_id, created_at desc);

alter table public.family_status_log enable row level security;
drop policy if exists "Admin reads status log"   on public.family_status_log;
drop policy if exists "Admin inserts status log" on public.family_status_log;
drop policy if exists "Admin updates status log" on public.family_status_log;
create policy "Admin reads status log"   on public.family_status_log for select using (public.has_role(array['admin']));
create policy "Admin inserts status log" on public.family_status_log for insert with check (public.has_role(array['admin']));
create policy "Admin updates status log" on public.family_status_log for update using (public.has_role(array['admin']));

-- Only an administrator may change a family's case state (even through the API).
create or replace function public.guard_case_state()
returns trigger language plpgsql as $$
begin
  if new.case_state is distinct from old.case_state and not public.has_role(array['admin']) then
    raise exception 'Only an administrator can change a family''s case state';
  end if;
  return new;
end $$;
drop trigger if exists families_guard_case_state on public.families;
create trigger families_guard_case_state before update on public.families
  for each row execute function public.guard_case_state();
