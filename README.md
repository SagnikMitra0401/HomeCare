# HomeCare Plans — Subscription-Based Home Care Platform

A production-grade, subscription-based home maintenance platform inspired by **Urban Company**, built for **Unified Mentor**.
Shift reactive, expensive emergency home repairs to predictable, preventive maintenance plans.

- **Frontend:** React (Vite) → **Vercel**
- **Backend:** Node.js (Express 5 REST API) → **Render**
- **Database:** Supabase PostgreSQL + Prisma ORM
- **Repository:** [https://github.com/SagnikMitra0401/HomeCare.git](https://github.com/SagnikMitra0401/HomeCare.git)
- **Deployment Guide:** See [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md)
- **Technical Documentation:** See [`docs/TECHNICAL_DOCUMENTATION.md`](./docs/TECHNICAL_DOCUMENTATION.md)
- **All Payments:** 100% **simulated** (UPI, Cards, NetBanking test mode; no real financial data collected).

---

## Quick Setup & Deployment Runbook

### 1. Database (Supabase)
Paste and run [`supabase_schema.sql`](./supabase_schema.sql) in your [Supabase SQL Editor](https://supabase.com/dashboard). This instantly initializes all tables, RLS security policies, constraints, and default plan seed data.

### 2. Git Setup
```bash
git branch -M main
git remote add origin https://github.com/SagnikMitra0401/HomeCare.git
git push -u origin main
```

### 3. Backend Deployment (Render)
- Deploy as a **Web Service** or **Blueprint** using [`render.yaml`](./render.yaml).
- Root Directory: `backend` | Build: `npm install && npx prisma generate` | Start: `npm start`
- Environment Variables:
  - `NODE_ENV=production`
  - `DATABASE_URL` (Supabase pooled URL, port 6543)
  - `DIRECT_URL` (Supabase session URL, port 5432)
  - `SUPABASE_URL` (https://PROJECT_REF.supabase.co)
  - `CORS_ORIGINS` (Your Vercel URL, e.g. `https://your-app.vercel.app`)
  - `ALLOW_SIMULATED_FAILURE=false`

### 4. Frontend Deployment (Vercel)
- Import repo on [vercel.com](https://vercel.com).
- Framework: `Vite` | Root Directory: `./` (or `frontend`)
- Environment Variables:
  - `VITE_API_URL` (Render backend URL, e.g. `https://homecare-backend.onrender.com`)
  - `VITE_SUPABASE_URL` (https://PROJECT_REF.supabase.co)
  - `VITE_SUPABASE_ANON_KEY` (Supabase public anon key)

---

## Local Development
1. Backend:
   ```bash
   cd backend
   npm install
   npm run build     # generates prisma client
   npm test          # runs test suite
   npm run dev       # http://localhost:4000
   ```
2. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev       # http://localhost:5173
   ```

## Creating an Administrator
Sign up once in the UI, then run in Supabase SQL editor:
```sql
UPDATE "Profile" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```
*(Or run `cd backend && npm run make-admin -- your-email@example.com`)*

