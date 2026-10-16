# Hidaya Development Association — Case Management System

A production-ready family case management web app built with React + Vite + Supabase.

---

## 📁 Project Structure

```
hidaya-case-management/
├── public/
│   └── logo.png              ← DROP YOUR HIDAYA LOGO HERE
├── src/
│   ├── components/
│   │   └── ImageUpload.jsx   ← reusable upload with compression
│   ├── lib/
│   │   ├── supabase.js       ← Supabase client
│   │   └── imageUtils.js     ← compression utility
│   ├── App.jsx               ← main app
│   └── main.jsx              ← entry point
├── .env.example              ← copy to .env and fill credentials
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Step 1 — Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env

# 3. Start dev server
npm run dev
```

The app will open at http://localhost:5173

> At this point it runs on mock data with no Supabase connection.

---

## 🗄️ Step 2 — Set Up Supabase

### 2a. Create a Supabase project
1. Go to https://supabase.com
2. Click "New Project"
3. Name it: `hidaya-case-management`
4. Choose a region close to Ethiopia (e.g. Europe West)
5. Set a strong database password — save it

### 2b. Run the database schema
1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Paste the contents of `schema.sql`
4. Click **Run**

### 2c. Create Storage Buckets
Go to **Storage** in Supabase and create these 3 buckets:

| Bucket name      | Public |
|------------------|--------|
| `mother-photos`  | ✅ Yes |
| `child-photos`   | ✅ Yes |
| `documents`      | ✅ Yes |

### 2d. Get your API credentials
1. Go to **Settings → API**
2. Copy **Project URL** and **anon public key**
3. Paste them into your `.env` file:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🌐 Step 3 — Push to GitHub

```bash
# Inside your project folder:
git init
git add .
git commit -m "Initial commit — Hidaya Case Management"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hidaya-case-management.git
git push -u origin main
```

---

## ▲ Step 4 — Deploy to Vercel

1. Go to https://vercel.com
2. Click **Add New Project**
3. Import your GitHub repo
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**

Your app will be live at `https://hidaya-case-management.vercel.app`

---

## 🖼️ Adding the Hidaya Logo

1. Name your logo file exactly: `logo.png`
2. Drop it into the `public/` folder
3. It will automatically appear on the login page and sidebar

---

## 🖼️ Image Compression (Built-in)

All images are compressed **in the browser before upload**:

| File Type           | Max Width | Quality | Result       |
|---------------------|-----------|---------|--------------|
| Mother photo        | 800px     | 82%     | ~100–250 KB  |
| Child photo         | 800px     | 82%     | ~100–250 KB  |
| Documents (ID etc.) | 1400px    | 88%     | ~200–500 KB  |
| PDFs                | —         | —       | Passed as-is |

This means **1 GB Supabase Storage easily covers 200+ families** with all documents.

---

## 👤 Default Login (after Supabase Auth is wired)

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@hidaya.org.et    |
| Password | Set in Supabase Auth   |

---

## 🔐 Roles

| Role    | Can do                              |
|---------|-------------------------------------|
| Admin   | Full access, manage users, delete   |
| Staff   | Add/edit families and children      |
| Viewer  | Read-only                           |


---

## Roles, access approval and payments (migration 002)

After running `schema.sql`, run **`supabase/migrations/002_roles_payments.sql`** once in the SQL Editor.
Then make yourself the first admin (otherwise nobody can approve requests):

```sql
update public.users set role='admin', status='approved' where email = 'you@example.com';
```

**How access works:** a new person clicks *Request access* on the login page, their account is `pending` and shows a
"Waiting for approval" screen, then an admin opens **Staff** in the menu, approves them and picks their role.

| Role | Can do |
|------|--------|
| Administrator | Everything, approves staff and assigns roles |
| Director | View everything incl. payments and data collector submissions; send messages; put families on hold |
| Finance | Record payments, bank lists, view beneficiaries |
| Project Coordinator | Add/edit beneficiaries, academics, messaging, view payments, see data collector submissions |
| Data Collector | Register families for approval (cannot see stored data); edit own submissions until approved |

To change what a role can do, edit `src/lib/permissions.js` (screens) and the policies in the migration (database).

---

## 🏦 Adding Awash Bank assets
Awash Bank is registered in `src/lib/banks.js`. Drop these files into `public/`:
- `awash_logo.png` — shown on the registration form (a text badge shows until it exists)
- `awash_template.png` — letterhead for the Bank List letter (plain paper is used until it exists)

## 💰 Payment rates (migration 004)
Run `supabase/migrations/004_payment_rates.sql` once in the Supabase SQL Editor. The admin then sets the
per-mother and per-child rates in Settings → Payment Rates. Monthly amount = mother rate + (children × child rate).

## 🚦 Family hold / transfer (migration 005)
Run `supabase/migrations/005_family_case_state.sql` once. Admins get a **Status** tab on each family profile:
- **Put on hold** – stays in the family list, removed from the bank list, shown *unpaid* on the payment list.
- **Transfer out** – removed from families, bank list and payment list; moves to the admin-only **Transferred** page with its history.
- Every action asks for a reason and is signed with the admin's name; admins can edit the reason later.

## ✅ Data collector approval (migration 008 — run after 007)
Run `supabase/migrations/008_collector_approval.sql` once. Then:
- A **data collector** registers a family (and its children/documents). It is saved as *pending* with a temporary code
  (`PENDING-xxxxxxxx`) — no real Family ID or Roll Number yet.
- The collector's menu is **Register** and **My Submissions** (+ Settings). They only see their own submissions with a
  status: *Waiting for approval*, *Returned — please fix* (with the admin's reason) or *Approved* (locked: name, date, status only).
  They cannot open families, payments, bank lists or stats.
- **Approvals** (sidebar, red counter = pending): visible to Administrator, Director and Project Coordinator. Submissions are
  grouped by collector with their branches. Possible duplicates (same National ID / phone / account number) are flagged.
- Only the **Administrator** can *Approve*, *Return* (with a reason) or *Approve all* from a collector. Approval assigns the real
  Family Code / Roll Number in the database (`HF/0001/26`, roll `0001`), so two collectors can never clash.
- Pending and returned families are **not** in Families, Payments, Bank List, Stats or reports until approved.
- Once approved, the collector can no longer read or change the family (enforced by the database, not only the screen).
- Administrator and Project Coordinator registrations skip approval. Everything that existed before the migration is marked approved.

## ✉️ Removing the "email rate limit exceeded" error
This limit is enforced by Supabase, not by the app, so it must be changed in the Supabase dashboard:
1. **Authentication → Rate Limits** → raise "Rate limit for sending emails" (this needs a custom SMTP provider: **Project Settings → Authentication → SMTP Settings**; Supabase's built-in mailer is capped at a few emails per hour).
2. Or avoid emails entirely: **Authentication → Providers → Email → turn off "Confirm email"**. New staff still need an admin's approval inside the app.

## 👁️ Visibility, directors, joined date (migration 006 — run after 005)
- Hold/transfer info, the Status tab, the Transferred page and the Payment tab are visible to every role **except Data Collector**.
- Director can put a family on hold and release it; only the Administrator can transfer or restore.
- The Transferred page is grouped by reason (Terminated, Suspended, Transferred to another organization, Moved away, Other).
- The family hero card shows how long the family has been with HDA; the admin can edit the joined date.

## 🔔 Notifications & logos (migration 007)
Run `supabase/migrations/007_activity_log.sql` once. Every action (hold/transfer, payments, bank list export/print/copy,
family/child/document changes, rate changes) is logged and shown in the bell next to the night-mode button
(red counter = activity by other staff since you last pressed "Mark all read"). Data collectors only see family/document activity.
Logos live in `public/`: `cbe_logo.png`, `oromia_logo.png`, `awash_logo.png` (+ `awash_template.png`), `ebama_logo.jpg`, `hidaya_logo.jpg`.


## 📄 Bank letters, agreements, director registration (migration 010 — run after 009)
Run `supabase/migrations/010_agreements_letters_director.sql` once. Then:
- **Bank letter** — every export (Print / CSV / Excel / Copy) asks **"Just to have it"** or **"For bank use (deposit)"** for admin, director and finance.
  *For bank use* asks the letter Ref No and month, prints the full letter (To / Subject / body with the total in words and figures, HDA's account number, closing and signatories) and, for admin and finance, records the payments.
  *Just to have it* downloads a **locked PDF** (cannot be edited or copied; printing allowed) with a diagonal **FOR RECORDS ONLY — NOT FOR BANK USE** watermark.
  Pasted/copied text cannot be locked, so a copy made "just to have it" starts with the line *FOR RECORDS ONLY — NOT FOR BANK USE*.
- **Bank letter details** (bank name, branch, address, HDA's own account number, signatories) are edited by the admin in **Settings → Bank Letter Details**.
- **Agreements** (sidebar) — scanned agreements, stored in a private bucket. Admin, director, finance and project coordinator can view; admin and director upload; admin deletes.
- **Director** can now register a family directly (no approval needed) and add children/documents to the families he registered.
- **Projects → HF → Add branch** (admin) adds a branch to the list used by the registration form, filters and projects.
- The registration form no longer asks for a city (the branch is used) and shows the account-number box only after a bank is chosen.
- Each profile's Overview ends with **Form filled by / Approved by**.

## 📞 Caller ID phones (migration 011 — run after 010)
Run `supabase/migrations/011_caller_id.sql` once. Then, in the web app (**admin only**) go to **Settings → Caller ID phones → Pair phone**:
name the phone → a **pairing token** appears **once** → paste it in the Hidaya Caller ID Android app (`android/`).
- When a registered family calls, the phone shows her name, Family ID, project/branch and photo, with an **ON HOLD / TRANSFERRED OUT** tag if it applies.
- The phone refreshes its list **every 15 minutes** (and has a "Sync now" button); lookups work offline.
- Only **approved** families are sent; **Revoke** erases the list from a phone on its next sync. Only a hash of the secret is stored.
- Build the app with Android Studio — see `android/README.md`.
