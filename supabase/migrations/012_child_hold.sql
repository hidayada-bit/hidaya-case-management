-- ============================================================
-- Migration 012 — Put an individual child on hold
--   A child on hold stays on the profile but is NOT counted in the family's payment.
--   Run once in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================
alter table public.children add column if not exists on_hold      boolean not null default false;
alter table public.children add column if not exists hold_reason   text;
alter table public.children add column if not exists held_at       timestamptz;
alter table public.children add column if not exists held_by_name  text;
