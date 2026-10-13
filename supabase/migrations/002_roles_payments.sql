-- ============================================================
-- HDA Case Management — Migration 002
--   * Missing columns the app already uses
--   * Access requests: new staff are "pending" until an admin approves
--   * Roles: admin, director, finance, project_coordinator, data_collector
--   * Payments follow-up table
--   * Closes the hole that let any user edit their own role
-- Run once in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================

-- ── 1. COLUMNS THE APP ALREADY USES ─────────────────────────
alter table public.families add column if not exists project         text default 'OVC';
alter table public.families add column if not exists branch          text;
alter table public.families add column if not exists bank            text;
alter table public.families add column if not exists account_number  text;
alter table public.families add column if not exists monthly_support numeric(12,2);
alter table public.children add column if not exists academic_average numeric;
alter table public.children add column if not exists academic_status  text;

-- ── 2. USERS: status + roles ────────────────────────────────
alter table public.users add column if not exists email             text;
alter table public.users add column if not exists profile_photo_url text;
alter table public.users add column if not exists status            text;
alter table public.users add column if not exists approved_by       uuid references public.users(id);
alter table public.users add column if not exists approved_at       timestamptz;

-- Everyone who already exists keeps working: mark them approved.
update public.users set status = 'approved' where status is null;
alter table public.users alter column status set default 'pending';
alter table public.users alter column status set not null;
alter table public.users drop constraint if exists users_status_check;
alter table public.users add constraint users_status_check check (status in ('pending','approved','rejected'));

-- Map old roles to the new ones (least privilege). Admins stay admins.
alter table public.users drop constraint if exists users_role_check;
update public.users set role = 'project_coordinator' where role = 'staff';
update public.users set role = 'director'            where role = 'viewer';
alter table public.users alter column role set default 'data_collector';
alter table public.users add constraint users_role_check
  check (role in ('admin','director','finance','project_coordinator','data_collector'));

-- Back-fill emails from auth
update public.users u set email = a.email from auth.users a where a.id = u.id and u.email is null;

-- ── 3. HELPER FUNCTIONS (security definer avoids RLS recursion) ──
-- Returns the caller's role ONLY if their account is approved.
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid() and status = 'approved'
$$;

create or replace function public.has_role(roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() = any(roles), false)
$$;

-- ── 4. NEW SIGNUP => PENDING PROFILE (done by the database, not the browser) ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.email, 'data_collector', 'pending'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ── 5. NON-ADMINS CAN NEVER CHANGE role / status ───────────────
create or replace function public.protect_user_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the SQL editor / service role, which is allowed to do anything
  if auth.uid() is not null and public.current_role_name() is distinct from 'admin' then
    new.role        := old.role;
    new.status      := old.status;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.email       := old.email;
  end if;
  return new;
end $$;

drop trigger if exists users_protect_columns on public.users;
create trigger users_protect_columns
  before update on public.users for each row execute function public.protect_user_columns();

-- ── 6. RLS POLICIES ─────────────────────────────────────────
-- users
drop policy if exists "Users can read all profiles"      on public.users;
drop policy if exists "Users can update own profile"     on public.users;
drop policy if exists "Users read profiles"              on public.users;
drop policy if exists "Users update own profile"         on public.users;
drop policy if exists "Admin manages users"              on public.users;
drop policy if exists "Admin deletes users"              on public.users;

create policy "Users read profiles" on public.users for select
  using (id = auth.uid() or public.current_role_name() is not null);
create policy "Users update own profile" on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Admin manages users" on public.users for update
  using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
create policy "Admin deletes users" on public.users for delete
  using (public.has_role(array['admin']));

-- families
drop policy if exists "Authenticated users can read families" on public.families;
drop policy if exists "Staff can insert families"             on public.families;
drop policy if exists "Staff can update families"             on public.families;
drop policy if exists "Admin can delete families"             on public.families;
create policy "Approved read families"  on public.families for select
  using (public.current_role_name() is not null);
create policy "Editors insert families" on public.families for insert
  with check (public.has_role(array['admin','project_coordinator','data_collector']));
create policy "Editors update families" on public.families for update
  using (public.has_role(array['admin','project_coordinator','data_collector']));
create policy "Admin deletes families"  on public.families for delete
  using (public.has_role(array['admin']));

-- children
drop policy if exists "Authenticated users can read children" on public.children;
drop policy if exists "Staff can insert children"             on public.children;
drop policy if exists "Staff can update children"             on public.children;
drop policy if exists "Admin can delete children"             on public.children;
create policy "Approved read children"  on public.children for select
  using (public.current_role_name() is not null);
create policy "Editors insert children" on public.children for insert
  with check (public.has_role(array['admin','project_coordinator','data_collector']));
create policy "Editors update children" on public.children for update
  using (public.has_role(array['admin','project_coordinator','data_collector']));
create policy "Admin deletes children"  on public.children for delete
  using (public.has_role(array['admin']));

-- documents
drop policy if exists "Authenticated users can read documents" on public.documents;
drop policy if exists "Staff can insert documents"             on public.documents;
drop policy if exists "Admin can delete documents"             on public.documents;
create policy "Approved read documents"  on public.documents for select
  using (public.current_role_name() is not null);
create policy "Editors insert documents" on public.documents for insert
  with check (public.has_role(array['admin','project_coordinator','data_collector']));
create policy "Editors update documents" on public.documents for update
  using (public.has_role(array['admin','project_coordinator','data_collector']));
create policy "Admin deletes documents"  on public.documents for delete
  using (public.has_role(array['admin']));

-- storage: only approved editors upload (also covers upsert), only admin deletes
drop policy if exists "Staff can upload files"   on storage.objects;
drop policy if exists "Staff can update files"   on storage.objects;
drop policy if exists "Admin can delete files"   on storage.objects;
create policy "Staff can upload files" on storage.objects for insert
  with check (public.current_role_name() is not null
    and bucket_id in ('mother-photos','child-photos','documents','staff-photos'));
create policy "Staff can update files" on storage.objects for update
  using (public.current_role_name() is not null
    and bucket_id in ('mother-photos','child-photos','documents','staff-photos'));
create policy "Admin can delete files" on storage.objects for delete
  using (public.has_role(array['admin'])
    and bucket_id in ('mother-photos','child-photos','documents','staff-photos'));

-- ── 7. PAYMENTS (monthly follow-up per beneficiary) ──────────
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  period       date not null,                        -- always the 1st of the month
  amount       numeric(12,2),
  status       text not null default 'pending'
               check (status in ('pending','paid','failed','on_hold')),
  paid_on      date,
  reference    text,                                 -- bank transaction / batch reference
  notes        text,
  recorded_by  uuid references public.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (family_id, period)
);
create index if not exists payments_period_idx on public.payments(period);
create index if not exists payments_status_idx on public.payments(status);

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
  for each row execute function update_updated_at();

alter table public.payments enable row level security;
drop policy if exists "Read payments"   on public.payments;
drop policy if exists "Manage payments" on public.payments;
drop policy if exists "Update payments" on public.payments;
drop policy if exists "Delete payments" on public.payments;
create policy "Read payments"   on public.payments for select
  using (public.has_role(array['admin','director','finance','project_coordinator']));
create policy "Manage payments" on public.payments for insert
  with check (public.has_role(array['admin','finance']));
create policy "Update payments" on public.payments for update
  using (public.has_role(array['admin','finance']));
create policy "Delete payments" on public.payments for delete
  using (public.has_role(array['admin']));

-- ── 8. YOUR OWN ACCOUNT ─────────────────────────────────────
-- Make sure YOU are an approved admin (replace the email), otherwise nobody can approve requests:
--   update public.users set role='admin', status='approved' where email = 'you@example.com';
