# Hidaya Caller ID (Android)

Shows who is calling when a registered Hidaya family phones this handset: mother's name, Family ID,
project / branch and photo, with a clear **ON HOLD** / **TRANSFERRED OUT** tag when that applies.
It never blocks or silences a call.

## How it works
1. An **administrator** opens the web app → **Settings → Caller ID phones → Pair phone**, names the phone and
   gets a **pairing token** (shown once).
2. On the phone, open **Hidaya Caller ID**, paste the token, tap **Connect**. That is all — the token already
   contains the project address.
3. The app downloads the family list and **refreshes it every 15 minutes** (Android's minimum for background
   work), plus a **Sync now** button. The list is stored on the phone, so the caller screen works offline.
4. Only **approved** families are sent. Pending data collector submissions never reach a phone.
5. The administrator can **Revoke** a phone any time: its next sync erases the list and caller ID stops.

## Build
1. Install Android Studio. Open THIS `android/` folder (not the repo root).
2. Wait for Gradle sync (first time downloads a lot).
3. Phone: Developer options → USB debugging, plug in, press Run.

### APK for other phones
Build → Build APK(s) (debug, easiest) or Build → Generate Signed Bundle / APK (release; keep the signing key safe —
you need the same key for every update). On the target phone allow "Install unknown apps" for the app used to open it.

## Phone setup checklist (inside the app)
- Make Hidaya the **Caller ID & spam app** (Android 10+)
- Allow **display over other apps**
- Allow **phone access** (Accept / Decline buttons, auto-hide) and **notifications**
- Tap **Preview caller screen** to check the design.

## Important
- Do **NOT** save families' numbers in the phone's Contacts — Android may skip call screening for saved contacts.
- Xiaomi / Oppo / Vivo / Huawei / Samsung: allow auto-start and turn off battery optimisation for the app,
  otherwise the 15-minute sync can be delayed.
- Phone numbers are matched in the `+251…` form, so `0911…`, `+251911…` and `251 911…` all match.

## Backend
Database migration `supabase/migrations/011_caller_id.sql` (functions `create_caller_device`, `revoke_caller_device`,
`caller_id_sync`). The app calls `POST {project}/rest/v1/rpc/caller_id_sync` with the device secret. Only a SHA-256
hash of the secret is stored in the database.
