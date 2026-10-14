-- Admin-editable payment rates (per mother + per child).
-- Monthly amount for a family = mother rate + (number of children x child rate).
-- Run in Supabase -> SQL Editor -> New query.
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.users(id),
  updated_at  timestamptz default now()
);

alter table public.app_settings enable row level security;
drop policy if exists "Read settings"   on public.app_settings;
drop policy if exists "Insert settings" on public.app_settings;
drop policy if exists "Update settings" on public.app_settings;
drop policy if exists "Delete settings" on public.app_settings;
create policy "Read settings"   on public.app_settings for select using (public.current_role_name() is not null);
create policy "Insert settings" on public.app_settings for insert with check (public.has_role(array['admin']));
create policy "Update settings" on public.app_settings for update using (public.has_role(array['admin']));
create policy "Delete settings" on public.app_settings for delete using (public.has_role(array['admin']));

insert into public.app_settings (key, value)
values ('payment_rates', '{"mother": 3500, "child": 1500}')
on conflict (key) do nothing;
