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
3. Paste the contents of `supabase/schema.sql`
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
