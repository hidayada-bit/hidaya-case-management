-- ============================================================
-- Migration 008 (run AFTER 007) — Data collector submissions & approval
--
--  * A data collector registers a family -> it is saved as 'pending' with a temporary code (PENDING-xxxxxxxx).
--  * Pending / returned submissions are visible ONLY to the collector who sent them and to
--    admin, director and project coordinator (Approvals page). Finance never sees them.
--  * Only the ADMIN can approve or return a submission. Approval assigns the real Family Code
--    and Roll Number (HF/0001/26, roll 0001 ...) in the database, so two collectors can never clash.
--  * Until approved the collector can edit; once approved the collector can no longer read or change it.
--  * A returned submission shows the admin's reason; when the collector saves it, it becomes pending again.
--  * Everything that already exists in the database is marked 'approved'.
-- ============================================================

-- ── 1. COLUMNS ──────────────────────────────────────────────
alter table public.families add column if not exists submission_status text not null default 'approved';
alter table public.families drop constraint if exists families_submission_status_check;
alter table public.families add constraint families_submission_status_check
  check (submission_status in ('pending','returned','approved'));
alter table public.families add column if not exists submitted_by      uuid references public.users(id);
alter table public.families add column if not exists submitted_at      timestamptz;
alter table public.families add column if not exists return_reason     text;
alter table public.families add column if not exists reviewed_by_name  text;
alter table public.families add column if not exists reviewed_at       timestamptz;
create index if not exists families_submission_status_idx on public.families(submission_status);
create index if not exists families_submitted_by_idx      on public.families(submitted_by);

-- ── 2. HELPERS (security definer = no RLS recursion) ────────
-- the family is approved
create or replace function public.family_is_approved(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.families where id = fid and submission_status = 'approved')
$$;
-- the family is the caller's own submission and is still open (pending / returned)
create or replace function public.own_open_submission(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.families
                 where id = fid and submitted_by = auth.uid() and submission_status in ('pending','returned'))
$$;
-- the family was submitted by the caller (any status) — used for notifications
create or replace function public.is_my_submission(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.families where id = fid and submitted_by = auth.uid())
$$;

-- ── 3. GUARD TRIGGER ────────────────────────────────────────
create or replace function public.guard_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := public.current_role_name();
begin
  -- the SQL editor / service role (no logged-in user) may do anything
  if auth.uid() is null then return new; end if;

  if tg_op = 'INSERT' then
    if r = 'data_collector' then
      new.submission_status := 'pending';
      new.submitted_by      := auth.uid();
      new.submitted_at      := now();
      new.return_reason     := null;
      new.reviewed_by_name  := null;
      new.reviewed_at       := null;
      new.roll_number       := null;
      new.case_state        := 'normal';
      if new.family_code is null or new.family_code not like 'PENDING-%' then
        new.family_code := 'PENDING-' || substr(replace(new.id::text, '-', ''), 1, 8);
      end if;
    elsif r in ('admin','project_coordinator') then
      new.submission_status := 'approved';       -- staff entries do not need approval
    end if;
    return new;
  end if;

  -- UPDATE
  if r = 'data_collector' then
    if old.submitted_by is distinct from auth.uid() or old.submission_status not in ('pending','returned') then
      raise exception 'This submission has been approved and can no longer be changed';
    end if;
    new.submission_status := 'pending';           -- saving a returned submission re-submits it
    new.submitted_by      := old.submitted_by;
    new.submitted_at      := now();
    new.return_reason     := null;
    new.reviewed_by_name  := old.reviewed_by_name;
    new.reviewed_at       := old.reviewed_at;
    new.family_code       := old.family_code;     -- real code is assigned on approval only
    new.roll_number       := old.roll_number;
    new.case_state        := old.case_state;
    return new;
  end if;

  if r = 'admin' then return new; end if;

  -- everyone else can never touch the submission fields
  new.submission_status := old.submission_status;
  new.submitted_by      := old.submitted_by;
  new.submitted_at      := old.submitted_at;
  new.return_reason     := old.return_reason;
  new.reviewed_by_name  := old.reviewed_by_name;
  new.reviewed_at       := old.reviewed_at;
  return new;
end $$;

drop trigger if exists families_guard_submission on public.families;
create trigger families_guard_submission
  before insert or update on public.families
  for each row execute function public.guard_submission();

-- ── 4. APPROVE / RETURN (admin only) ────────────────────────
create or replace function public.approve_submission(fid uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  f   public.families;
  seq int;
  code text;
  roll text;
  who text;
begin
  if not public.has_role(array['admin']) then
    raise exception 'Only an administrator can approve submissions';
  end if;
  select * into f from public.families where id = fid for update;
  if not found then raise exception 'Submission not found'; end if;
  if f.submission_status = 'approved' then return f.family_code; end if;

  -- one number at a time per project, so IDs are never duplicated
  perform pg_advisory_xact_lock(hashtext('family_seq_' || coalesce(f.project, 'OVC')));
  select coalesce(max((regexp_match(family_code, '/([0-9]+)/'))[1]::int), 0) + 1
    into seq
    from public.families
   where project is not distinct from f.project
     and family_code ~ '/[0-9]+/';

  code := coalesce(f.project, 'OVC') || '/' || lpad(seq::text, 4, '0') || '/' || to_char(now(), 'YY');
  roll := lpad(seq::text, case when f.project = 'HF' then 4 else 3 end, '0');
  select full_name into who from public.users where id = auth.uid();

  update public.families
     set family_code = code, roll_number = roll, submission_status = 'approved',
         return_reason = null, reviewed_by_name = who, reviewed_at = now()
   where id = fid;
  return code;
end $$;

create or replace function public.return_submission(fid uuid, reason text)
returns void language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if not public.has_role(array['admin']) then
    raise exception 'Only an administrator can return submissions';
  end if;
  if coalesce(trim(reason), '') = '' then raise exception 'Please write the reason for returning it'; end if;
  select full_name into who from public.users where id = auth.uid();
  update public.families
     set submission_status = 'returned', return_reason = trim(reason),
         reviewed_by_name = who, reviewed_at = now()
   where id = fid and submission_status = 'pending';
  if not found then raise exception 'Only pending submissions can be returned'; end if;
end $$;

-- approve every pending submission of one collector, oldest first; returns how many
create or replace function public.approve_collector(uid uuid)
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not public.has_role(array['admin']) then
    raise exception 'Only an administrator can approve submissions';
  end if;
  for r in select id from public.families
            where submitted_by = uid and submission_status = 'pending'
            order by submitted_at, created_at loop
    perform public.approve_submission(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── 5. WHO CAN SEE / CHANGE WHAT ────────────────────────────
-- families
drop policy if exists "Approved read families"  on public.families;
drop policy if exists "Staff read families"     on public.families;
create policy "Staff read families" on public.families for select using (
  public.has_role(array['admin','director','project_coordinator'])
  or (public.has_role(array['finance']) and submission_status = 'approved')
  or (public.has_role(array['data_collector']) and submitted_by = auth.uid() and submission_status in ('pending','returned'))
);

drop policy if exists "Editors insert families" on public.families;
create policy "Editors insert families" on public.families for insert with check (
  public.has_role(array['admin','project_coordinator'])
  or (public.has_role(array['data_collector']) and submitted_by = auth.uid() and submission_status = 'pending')
);

drop policy if exists "Editors update families" on public.families;
create policy "Editors update families" on public.families for update
  using (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['data_collector']) and submitted_by = auth.uid() and submission_status in ('pending','returned'))
  )
  with check (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['data_collector']) and submitted_by = auth.uid() and submission_status = 'pending')
  );

-- children
drop policy if exists "Approved read children"  on public.children;
drop policy if exists "Staff read children"     on public.children;
create policy "Staff read children" on public.children for select using (
  public.has_role(array['admin','director','project_coordinator'])
  or (public.has_role(array['finance']) and public.family_is_approved(family_id))
  or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
);
drop policy if exists "Editors insert children" on public.children;
create policy "Editors insert children" on public.children for insert with check (
  public.has_role(array['admin','project_coordinator'])
  or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
);
drop policy if exists "Editors update children" on public.children;
create policy "Editors update children" on public.children for update
  using (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  )
  with check (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  );
drop policy if exists "Collector deletes own children" on public.children;
create policy "Collector deletes own children" on public.children for delete
  using (public.has_role(array['data_collector']) and public.own_open_submission(family_id));

-- documents
drop policy if exists "Approved read documents"  on public.documents;
drop policy if exists "Staff read documents"     on public.documents;
create policy "Staff read documents" on public.documents for select using (
  public.has_role(array['admin','director','project_coordinator'])
  or (public.has_role(array['finance']) and public.family_is_approved(family_id))
  or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
);
drop policy if exists "Editors insert documents" on public.documents;
create policy "Editors insert documents" on public.documents for insert with check (
  public.has_role(array['admin','project_coordinator'])
  or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
);
drop policy if exists "Editors update documents" on public.documents;
create policy "Editors update documents" on public.documents for update
  using (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  )
  with check (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  );
drop policy if exists "Collector deletes own documents" on public.documents;
create policy "Collector deletes own documents" on public.documents for delete
  using (public.has_role(array['data_collector']) and public.own_open_submission(family_id));

-- ── 6. "MY SUBMISSIONS" VIEW (collector sees only name / branch / status — never stored data) ──
create or replace view public.my_submissions as
  select id, mother_name, project, branch, submission_status, submitted_at,
         return_reason, reviewed_at, reviewed_by_name
    from public.families
   where submitted_by = auth.uid() and public.current_role_name() is not null;
grant select on public.my_submissions to authenticated;

-- ── 7. NOTIFICATIONS ────────────────────────────────────────
-- Collectors now see only activity about their OWN submissions (not other families).
drop policy if exists "Read activity" on public.activity_log;
create policy "Read activity" on public.activity_log for select using (
  public.has_role(array['admin','director','project_coordinator'])
  or (public.has_role(array['finance']) and category <> 'submission')
  or (public.has_role(array['data_collector'])
      and category = 'submission'
      and (actor_id = auth.uid() or public.is_my_submission(family_id)))
);
