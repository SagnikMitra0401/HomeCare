# HomeCare Plans — starter (React + Express + Prisma + Supabase)

JavaScript only. `frontend/` (Vite React → Vercel), `backend/` (Express → Render), Supabase PostgreSQL + Auth.
Specs: PROJECT_OBJECTIVE.md, SECURITY.md, MUST_TAKE_CARE_OF.md (not copied here). Decisions: `docs/ASSUMPTIONS.md`. Open work: `docs/NEXT_STEPS.md`.
All payments are **simulated**. No real card/UPI/bank data is collected.

## Local setup
1. Create a Supabase project. In Auth settings, decide whether email confirmation is required.
2. Copy variable names from `.env.example` into `backend/.env` and `frontend/.env` (placeholders only in the example).
3. Backend:
   ```
   cd backend && npm install
   npx prisma migrate dev --name init       # generates and applies the first migration; COMMIT backend/prisma/migrations
   npx prisma migrate dev --create-only --name constraints_and_rls
   #   paste backend/prisma/manual/constraints_and_rls.sql into that migration.sql, review it, then:
   npx prisma migrate dev
   npm run seed                              # synthetic categories + plans, idempotent, never deletes
   npm run dev                               # http://localhost:4000/health
   npm test                                  # unit tests for pure business rules
   ```
4. Frontend: `cd frontend && npm install && npm run dev` (http://localhost:5173).
5. Sign up in the UI (always CUSTOMER). Professionals apply from the customer dashboard.

## Assigning an admin (no hardcoded credentials, first user is NOT promoted)
Sign up and sign in once, then a trusted operator with DB access runs `cd backend && npm run make-admin -- you@example.com` (or an equivalent SQL `UPDATE "Profile" SET role='ADMIN'`). Enable MFA for that account in Supabase.

## Deployment
- **Supabase:** use the pooled URL (port 6543, `pgbouncer=true`) as `DATABASE_URL` and the direct/session URL as `DIRECT_URL`.
- **Render (web service, root `backend`):** build `npm install && npx prisma generate`; start `npm start`. Set env vars in the dashboard: `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `CORS_ORIGINS=<your Vercel URL>`, `ALLOW_SIMULATED_FAILURE=false` (and `SUPABASE_JWT_SECRET` only for legacy HS256 projects). Health check: `/health`.
- **Migrations in production:** one reviewed release step run from a single place: `cd backend && npx prisma migrate deploy`. The server never migrates on startup. Do not use `db push` or `migrate dev` on production.
- **Vercel (root `frontend`):** set `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public values only). `vercel.json` handles SPA routing.
- Use separate Supabase projects for development and production.

## Verification status
See the end of the handoff message; nothing is claimed beyond what was actually run.
