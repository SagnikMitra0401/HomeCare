# Production Deployment Guide: Vercel + Render + Supabase

This guide walks you through deploying the **HomeCare Platform** with:
- **Database:** Supabase PostgreSQL
- **Backend API:** Render (Node.js/Express)
- **Frontend Web App:** Vercel (React/Vite SPA)
- **Repository:** `https://github.com/SagnikMitra0401/HomeCare.git`

---

## 1. Supabase Database Setup

1. Create a project at [supabase.com](https://supabase.com/).
2. In your Supabase Project Settings:
   - Go to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection string**:
     - **Transaction Pooler (Port 6543):** Copy this URI for `DATABASE_URL` (ensure mode is `Transaction` and append `?pgbouncer=true&connection_limit=5`).
     - **Session / Direct (Port 5432):** Copy this URI for `DIRECT_URL`.
   - Go to **Project Settings** $\rightarrow$ **API**:
     - Copy **Project URL** (e.g. `https://xyzcompany.supabase.co`).
     - Copy **anon / public key** (safe for frontend).
3. Initialize the database tables & default seed data:
   - Go to the **SQL Editor** tab on the left sidebar of your Supabase dashboard.
   - Open [`supabase_schema.sql`](../supabase_schema.sql) in this repository.
   - Paste the SQL into the editor and click **Run**.
   - *Result:* All tables (`Profile`, `Subscription`, `Booking`, `Payment`, `Dispute`, etc.), check constraints, RLS security policies, and seed plans are live immediately.

---

## 2. Git Remote & Push to GitHub

Ensure your local repository is pointed to your GitHub repository and pushed:

```bash
# Rename branch to main
git branch -M main

# Set remote origin
git remote add origin https://github.com/SagnikMitra0401/HomeCare.git

# Push code
git push -u origin main
```

---

## 3. Render Backend Deployment

### Option A: Using Render Blueprint (Recommended)
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** $\rightarrow$ **Blueprint**.
2. Connect your GitHub repository `SagnikMitra0401/HomeCare`.
3. Render will detect `render.yaml` automatically.
4. Fill in the requested secret environment variables (detailed below) and click **Apply**.

### Option B: Manual Web Service
1. In the Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository `SagnikMitra0401/HomeCare`.
3. Configure settings:
   - **Name:** `homecare-backend`
   - **Region:** Any close to your Supabase region (e.g. Oregon / Frankfurt / Singapore)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Add **Environment Variables** in Render:

| Variable Name | Example / Expected Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5` | Pooled connection for Prisma queries |
| `DIRECT_URL` | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` | Session mode connection for migrations |
| `SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` | Your Supabase project URL |
| `SUPABASE_JWT_SECRET` | *(Leave blank if using JWKS asymmetric keys, or paste if legacy project)* | Optional JWT secret |
| `CORS_ORIGINS` | `https://[YOUR_VERCEL_APP].vercel.app,http://localhost:5173` | Allowed frontend origins (supports `*.vercel.app`) |
| `ALLOW_SIMULATED_FAILURE` | `false` | Disable forced decline scenarios in production |

5. Click **Create Web Service**. Once deployed, copy your Render API URL (e.g. `https://homecare-backend.onrender.com`).
6. Test health check:
   ```bash
   curl https://homecare-backend.onrender.com/health
   # Returns: {"status":"ok"}
   ```

---

## 4. Vercel Frontend Deployment

1. Go to [vercel.com](https://vercel.com/) and click **Add New...** $\rightarrow$ **Project**.
2. Import your GitHub repository `SagnikMitra0401/HomeCare`.
3. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (or `frontend`) — *both work because root `vercel.json` and `frontend/vercel.json` are pre-configured.*
4. Add **Environment Variables** in Vercel:

| Variable Name | Example / Expected Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://homecare-backend.onrender.com` | Your deployed Render backend URL (no trailing slash) |
| `VITE_SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Your Supabase anon / publishable key |

5. Click **Deploy**. Vercel will build the SPA and provide your live URL (e.g. `https://homecare.vercel.app`).

6. **Update Render CORS:**
   - In Render Dashboard, verify that `CORS_ORIGINS` contains your actual Vercel URL (e.g. `https://homecare.vercel.app`).

---

## 5. Post-Deployment Verification & Admin Creation

1. Visit your live Vercel web app.
2. Register a new user account (e.g. `admin@yourdomain.com`).
3. Promote this user to **ADMIN**:
   - **Via Supabase SQL Editor:**
     ```sql
     UPDATE "Profile" SET role = 'ADMIN' WHERE email = 'admin@yourdomain.com';
     ```
   - **Or via CLI (with production DB credentials in backend/.env):**
     ```bash
     cd backend
     npm run make-admin -- admin@yourdomain.com
     ```
4. Sign out and sign back in on Vercel:
   - You will now see the **Admin** navigation tab with live Operational Analytics (MRR, Active Subscriptions, Completion Rate), Dispute handling, Professional approval, and Plan management.
5. Create a test customer account, choose a plan, perform a simulated payment (UPI / Card / NetBanking), and book a home care service!
