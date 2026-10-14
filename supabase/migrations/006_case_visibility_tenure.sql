-- ============================================================
-- Migration 006 (run AFTER 005)
--   * Hold / transfer info readable by admin, director, finance, project coordinator (not data collector)
--   * Director may put a family on hold / release it; only admin can transfer / restore
--   * Reason category stored separately (for grouping on the Transferred page)
--   * families.joined_on : date the family joined HDA (admin-editable)
-- ============================================================
alter table public.families add column if not exists joined_on     date;
alter table public.families add column if not exists case_category text;
alter table public.family_status_log add column if not exists reason_category text;
update public.families set joined_on = created_at::date where joined_on is null;

-- history: who can read / write
drop policy if exists "Admin reads status log"   on public.family_status_log;
drop policy if exists "Admin inserts status log" on public.family_status_log;
drop policy if exists "Admin updates status log" on public.family_status_log;
drop policy if exists "Staff read status log"        on public.family_status_log;
drop policy if exists "Admin director insert log"    on public.family_status_log;
drop policy if exists "Admin updates log"            on public.family_status_log;
create policy "Staff read status log"     on public.family_status_log for select
  using (public.has_role(array['admin','director','finance','project_coordinator']));
create policy "Admin director insert log" on public.family_status_log for insert
  with check (public.has_role(array['admin','director']));
create policy "Admin updates log"         on public.family_status_log for update
  using (public.has_role(array['admin']));

-- the director needs to update families, but ONLY the hold columns (enforced by the trigger below)
drop policy if exists "Director updates hold" on public.families;
create policy "Director updates hold" on public.families for update
  using (public.has_role(array['director']));

create or replace function public.guard_case_state()
returns trigger language plpgsql as $$
declare
  hold_cols text[] := array['case_state','case_reason','case_category','case_changed_at','case_changed_by_name'];
begin
  if public.has_role(array['admin']) then
    return new;
  end if;
  if new.joined_on is distinct from old.joined_on then
    raise exception 'Only an administrator can change the joined date';
  end if;
  if public.has_role(array['director']) then
    -- director: may only touch the hold columns, and only between normal <-> on_hold
    if (to_jsonb(new) - hold_cols) is distinct from (to_jsonb(old) - hold_cols) then
      raise exception 'Directors can only change a family''s hold status';
    end if;
    if new.case_state is distinct from old.case_state
       and not (old.case_state in ('normal','on_hold') and new.case_state in ('normal','on_hold')) then
      raise exception 'Only an administrator can transfer or restore a family';
    end if;
    return new;
  end if;
  if new.case_state is distinct from old.case_state then
    raise exception 'Only an administrator or director can change a family''s hold status';
  end if;
  return new;
end $$;
drop trigger if exists families_guard_case_state on public.families;
create trigger families_guard_case_state before update on public.families
  for each row execute function public.guard_case_state();
