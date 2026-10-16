-- ============================================================
-- Migration 011 (run AFTER 010; safe to re-run) — Caller ID phones
--
-- The Hidaya Caller ID Android app shows who is calling when a registered family phones.
--  * Only the ADMIN can pair a phone (Settings → Caller ID phones → Pair phone). That creates a one-time
--    secret; the web app turns it into a pairing token that is typed into the Android app.
--  * Only a SHA-256 hash of the secret is stored. A leaked table row cannot be used as a login.
--  * The phone calls  caller_id_sync(token)  every 15 minutes and keeps the list on the phone, so the
--    caller screen works without internet.
--  * Only APPROVED families are sent (pending data collector submissions never reach a phone).
--  * Revoking a phone makes its next sync answer "revoked": the app wipes its list and stops.
-- ============================================================

-- ── 1. DEVICES ──────────────────────────────────────────────
create table if not exists public.caller_id_devices (
  id             uuid primary key default gen_random_uuid(),
  device_name    text not null,
  token_hash     text not null unique,
  status         text not null default 'active' check (status in ('active','revoked')),
  paired_by      uuid references public.users(id),
  paired_by_name text,
  last_sync_at   timestamptz,
  created_at     timestamptz not null default now(),
  revoked_at     timestamptz
);
alter table public.caller_id_devices enable row level security;

drop policy if exists "Admin reads caller devices"   on public.caller_id_devices;
drop policy if exists "Admin deletes caller devices" on public.caller_id_devices;
create policy "Admin reads caller devices"   on public.caller_id_devices for select using (public.has_role(array['admin']));
create policy "Admin deletes caller devices" on public.caller_id_devices for delete using (public.has_role(array['admin']));
-- no insert / update policy: devices are created and revoked only through the functions below

-- ── 2. PHONE NUMBER NORMALISER (same rules as the Android app) ──
-- 0911 000 000 / +251911000000 / 251911000000 / 911000000  ->  +251911000000 ; anything else -> null
create or replace function public.norm_et_phone(raw text)
returns text language plpgsql immutable as $$
declare d text; sub text;
begin
  if raw is null then return null; end if;
  d := regexp_replace(raw, '[^0-9]', '', 'g');
  if btrim(raw) not like '+%' and d like '00%' then d := substr(d, 3); end if;
  if d like '251%' and length(d) = 12 then sub := substr(d, 4);
  elsif d like '0%' and length(d) = 10 then sub := substr(d, 2);
  elsif length(d) = 9 then sub := d;
  else return null;
  end if;
  if sub ~ '^[79][0-9]{8}$' then return '+251' || sub; end if;
  return null;
end $$;

-- ── 3. PAIR / REVOKE (admin only) ───────────────────────────
-- returns the one-time secret (the web app wraps it into the pairing token and shows it once)
create or replace function public.create_caller_device(p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare secret text;
begin
  if not public.has_role(array['admin']) then
    raise exception 'Only an administrator can pair a phone';
  end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'Give the phone a name'; end if;
  secret := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.caller_id_devices (device_name, token_hash, paired_by, paired_by_name)
  values (btrim(p_name),
          encode(sha256(convert_to(secret, 'utf8')), 'hex'),
          auth.uid(),
          (select full_name from public.users where id = auth.uid()));
  return secret;
end $$;

create or replace function public.revoke_caller_device(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(array['admin']) then
    raise exception 'Only an administrator can revoke a phone';
  end if;
  update public.caller_id_devices set status = 'revoked', revoked_at = now() where id = p_id;
end $$;

-- ── 4. SYNC (called by the Android app with the secret) ─────
-- Returns { ok, syncedAt, callers:[{phone,name,familyCode,project,branch,state,photoUrl}] }
-- or      { ok:false, revoked:true }  when the secret is unknown / revoked.
create or replace function public.caller_id_sync(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare dev uuid; list jsonb;
begin
  select id into dev from public.caller_id_devices
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex')
     and status = 'active';
  if dev is null then
    return jsonb_build_object('ok', false, 'revoked', true);
  end if;

  update public.caller_id_devices set last_sync_at = now() where id = dev;

  select coalesce(jsonb_agg(jsonb_build_object(
           'phone',      x.phone,
           'name',       x.mother_name,
           'familyCode', x.family_code,
           'project',    x.project,
           'branch',     x.branch,
           'state',      x.state,
           'photoUrl',   x.mother_photo_url
         )), '[]'::jsonb)
    into list
    from (
      select distinct on (n.phone, f.id)
             n.phone, f.mother_name, f.family_code, f.project, f.branch,
             coalesce(f.case_state, 'normal') as state, f.mother_photo_url
        from public.families f
        cross join lateral (values (public.norm_et_phone(f.phone_number)),
                                   (public.norm_et_phone(f.alternate_phone))) as n(phone)
       where f.submission_status = 'approved' and n.phone is not null
       order by n.phone, f.id
    ) x;

  return jsonb_build_object('ok', true, 'syncedAt', now(), 'callers', list);
end $$;

-- ── 5. WHO MAY CALL WHAT ────────────────────────────────────
revoke all on function public.create_caller_device(text) from public;
revoke all on function public.revoke_caller_device(uuid) from public;
revoke all on function public.caller_id_sync(text)       from public;
grant execute on function public.create_caller_device(text) to authenticated;   -- admin check inside
grant execute on function public.revoke_caller_device(uuid) to authenticated;   -- admin check inside
grant execute on function public.caller_id_sync(text)       to anon, authenticated; -- the secret is the credential
