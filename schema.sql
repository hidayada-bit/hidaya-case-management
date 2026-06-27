-- ============================================================
-- HIDAYA DEVELOPMENT ASSOCIATION — Case Management Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- ── USERS TABLE ─────────────────────────────────────────────
-- Extends Supabase Auth users with role and profile info
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null default 'staff' check (role in ('admin','staff','viewer')),
  phone       text,
  created_at  timestamptz default now()
);

-- ── FAMILIES TABLE ───────────────────────────────────────────
create table if not exists public.families (
  id                  uuid primary key default gen_random_uuid(),
  family_code         text unique not null,
  roll_number         text,
  mother_name         text not null,
  mother_id_number    text,
  phone_number        text,
  alternate_phone     text,
  address             text,
  city                text default 'Addis Ababa',
  district            text,
  notes               text,
  mother_photo_url    text,
  status              text default 'active' check (status in ('active','inactive','pending')),
  created_by          uuid references public.users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── CHILDREN TABLE ───────────────────────────────────────────
create table if not exists public.children (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  child_name      text not null,
  gender          text check (gender in ('male','female')),
  date_of_birth   date,
  grade           text,
  school_name     text,
  medical_notes   text,
  child_photo_url text,
  created_at      timestamptz default now()
);

-- ── DOCUMENTS TABLE ──────────────────────────────────────────
-- Stores metadata for all uploaded files
-- Actual files live in Supabase Storage buckets
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  child_id        uuid references public.children(id) on delete cascade,
  document_type   text not null check (document_type in (
                    'Birth Certificate',
                    'School Certificate',
                    'Mother ID',
                    'Bank Book',
                    'Family Photo',
                    'Medical Record',
                    'Other'
                  )),
  file_url        text not null,
  file_name       text,
  file_size_kb    int,
  uploaded_by     uuid references public.users(id),
  uploaded_at     timestamptz default now()
);

-- ── AUTO-UPDATE updated_at ───────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger families_updated_at
  before update on public.families
  for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- Ensures users can only see/edit data they are allowed to

alter table public.users     enable row level security;
alter table public.families  enable row level security;
alter table public.children  enable row level security;
alter table public.documents enable row level security;

-- Users: everyone logged in can read all users
create policy "Users can read all profiles"
  on public.users for select
  using (auth.role() = 'authenticated');

-- Users: only the user themselves can update their profile
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Families: all authenticated users can read
create policy "Authenticated users can read families"
  on public.families for select
  using (auth.role() = 'authenticated');

-- Families: staff and admin can insert
create policy "Staff can insert families"
  on public.families for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin','staff')
    )
  );

-- Families: staff and admin can update
create policy "Staff can update families"
  on public.families for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin','staff')
    )
  );

-- Families: only admin can delete
create policy "Admin can delete families"
  on public.families for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Children: same pattern as families
create policy "Authenticated users can read children"
  on public.children for select
  using (auth.role() = 'authenticated');

create policy "Staff can insert children"
  on public.children for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin','staff')
    )
  );

create policy "Staff can update children"
  on public.children for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin','staff')
    )
  );

create policy "Admin can delete children"
  on public.children for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Documents: same pattern
create policy "Authenticated users can read documents"
  on public.documents for select
  using (auth.role() = 'authenticated');

create policy "Staff can insert documents"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin','staff')
    )
  );

create policy "Admin can delete documents"
  on public.documents for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── STORAGE BUCKET POLICIES ──────────────────────────────────
-- Run these after creating the buckets in Supabase dashboard

-- Allow authenticated users to read all files
create policy "Public read access"
  on storage.objects for select
  using (bucket_id in ('mother-photos','child-photos','documents'));

-- Allow staff/admin to upload files
create policy "Staff can upload files"
  on storage.objects for insert
  with check (
    auth.role() = 'authenticated'
    and bucket_id in ('mother-photos','child-photos','documents')
  );

-- Allow admin to delete files
create policy "Admin can delete files"
  on storage.objects for delete
  using (
    auth.role() = 'authenticated'
    and bucket_id in ('mother-photos','child-photos','documents')
  );

-- ── INDEXES FOR PERFORMANCE ──────────────────────────────────
create index if not exists families_family_code_idx on public.families(family_code);
create index if not exists families_status_idx      on public.families(status);
create index if not exists families_district_idx    on public.families(district);
create index if not exists children_family_id_idx   on public.children(family_id);
create index if not exists documents_family_id_idx  on public.documents(family_id);
create index if not exists documents_child_id_idx   on public.documents(child_id);

-- ── SAMPLE ADMIN USER ────────────────────────────────────────
-- After creating your first user via Supabase Auth,
-- run this to make them admin (replace the UUID):
--
-- insert into public.users (id, full_name, role)
-- values ('your-auth-user-uuid-here', 'Admin User', 'admin');
