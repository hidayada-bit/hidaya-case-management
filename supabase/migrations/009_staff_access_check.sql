-- ============================================================
-- Migration 009 (optional, safe to re-run) — staff access approval
-- Re-asserts the policies that let an admin approve staff, and lists
-- who is still pending so you can see the real state of the database.
-- ============================================================
drop policy if exists "Users read profiles"      on public.users;
drop policy if exists "Users update own profile" on public.users;
drop policy if exists "Admin manages users"      on public.users;
create policy "Users read profiles" on public.users for select
  using (id = auth.uid() or public.current_role_name() is not null);
create policy "Users update own profile" on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Admin manages users" on public.users for update
  using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));

-- Every auth account must have a profile row (otherwise the person waits forever)
insert into public.users (id, full_name, email, role, status)
select a.id, coalesce(nullif(a.raw_user_meta_data->>'full_name',''), split_part(a.email,'@',1)), a.email, 'data_collector', 'pending'
  from auth.users a left join public.users u on u.id = a.id
 where u.id is null;

-- Check the result: who is approved / pending / rejected
select email, role, status, approved_at from public.users order by created_at desc;
