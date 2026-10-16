-- ============================================================
-- Migration 010 (run AFTER 009; safe to re-run)
--
--  1. Agreements page: table + private "agreements" storage bucket
--     (everyone except data collectors can view; admin + director upload; admin deletes)
--  2. The DIRECTOR can register a family directly (no approval step), and add children /
--     documents to the families he registered himself. He still cannot edit other families.
--  3. Nothing is needed for the new Settings (bank letter details, HF branches): they are
--     stored in the existing app_settings table, which only the admin can change.
-- ============================================================

-- ── 1. AGREEMENTS ───────────────────────────────────────────
create table if not exists public.agreements (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  party            text,
  signed_on        date,
  notes            text,
  files            jsonb not null default '[]'::jsonb,   -- [{ path, name, type, size }]
  uploaded_by      uuid references public.users(id),
  uploaded_by_name text,
  created_at       timestamptz default now()
);
alter table public.agreements enable row level security;
drop policy if exists "Staff read agreements"    on public.agreements;
drop policy if exists "Staff add agreements"     on public.agreements;
drop policy if exists "Admin deletes agreements" on public.agreements;
create policy "Staff read agreements" on public.agreements for select
  using (public.has_role(array['admin','director','finance','project_coordinator']));
create policy "Staff add agreements" on public.agreements for insert
  with check (public.has_role(array['admin','director']) and uploaded_by = auth.uid());
create policy "Admin deletes agreements" on public.agreements for delete
  using (public.has_role(array['admin']));

-- private bucket (files are opened through short-lived signed links)
insert into storage.buckets (id, name, public) values ('agreements', 'agreements', false)
on conflict (id) do update set public = false;

drop policy if exists "Agreements read"   on storage.objects;
drop policy if exists "Agreements upload" on storage.objects;
drop policy if exists "Agreements delete" on storage.objects;
create policy "Agreements read" on storage.objects for select
  using (bucket_id = 'agreements' and public.has_role(array['admin','director','finance','project_coordinator']));
create policy "Agreements upload" on storage.objects for insert
  with check (bucket_id = 'agreements' and public.has_role(array['admin','director']));
create policy "Agreements delete" on storage.objects for delete
  using (bucket_id = 'agreements' and public.has_role(array['admin']));

-- ── 2. DIRECTOR CAN REGISTER FAMILIES ───────────────────────
-- true when the family was registered by the caller (used for the director's children / documents)
create or replace function public.own_created_family(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.families where id = fid and created_by = auth.uid())
$$;

drop policy if exists "Editors insert families" on public.families;
create policy "Editors insert families" on public.families for insert with check (
  public.has_role(array['admin','project_coordinator'])
  or (public.has_role(array['director']) and created_by = auth.uid())
  or (public.has_role(array['data_collector']) and submitted_by = auth.uid() and submission_status = 'pending')
);

-- the director may also correct the profile of a family he registered himself
drop policy if exists "Editors update families" on public.families;
create policy "Editors update families" on public.families for update
  using (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['director']) and created_by = auth.uid())
    or (public.has_role(array['data_collector']) and submitted_by = auth.uid() and submission_status in ('pending','returned'))
  )
  with check (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['director']) and created_by = auth.uid())
    or (public.has_role(array['data_collector']) and submitted_by = auth.uid() and submission_status = 'pending')
  );

drop policy if exists "Editors insert children" on public.children;
create policy "Editors insert children" on public.children for insert with check (
  public.has_role(array['admin','project_coordinator'])
  or (public.has_role(array['director']) and public.own_created_family(family_id))
  or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
);
drop policy if exists "Editors update children" on public.children;
create policy "Editors update children" on public.children for update
  using (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['director']) and public.own_created_family(family_id))
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  )
  with check (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['director']) and public.own_created_family(family_id))
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  );

drop policy if exists "Editors insert documents" on public.documents;
create policy "Editors insert documents" on public.documents for insert with check (
  public.has_role(array['admin','project_coordinator'])
  or (public.has_role(array['director']) and public.own_created_family(family_id))
  or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
);
drop policy if exists "Editors update documents" on public.documents;
create policy "Editors update documents" on public.documents for update
  using (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['director']) and public.own_created_family(family_id))
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  )
  with check (
    public.has_role(array['admin','project_coordinator'])
    or (public.has_role(array['director']) and public.own_created_family(family_id))
    or (public.has_role(array['data_collector']) and public.own_open_submission(family_id))
  );

-- guard trigger: a family registered by the director is approved straight away (like admin / coordinator entries)
create or replace function public.guard_submission_director_patch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.current_role_name() = 'director' then
    new.submission_status := 'approved';
    new.submitted_by := null;
    new.submitted_at := null;
  end if;
  return new;
end $$;
-- runs after the main guard (triggers fire in name order; "zz_" sorts last)
drop trigger if exists zz_families_director_insert on public.families;
create trigger zz_families_director_insert
  before insert on public.families
  for each row execute function public.guard_submission_director_patch();
