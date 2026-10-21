# Project Master Roadmap & Implementation Guide: Subscription-Based Home Care Platform

## 1. Context & Objective Overview
This platform shifts home care from reactive, expensive, on-demand emergency repairs to structured, predictable, preventive subscription models (inspired by Urban Company's clean, service-first UX).

### Collaborating & Reference Entities
- **Collaborating Organization:** Unified Mentor
- **Reference Service Model:** Urban Company

---

## 2. Technology Stack & Operational Boundaries (Preserved)
- **Frontend:** React (JavaScript/JSX), Vite, lightweight maintained CSS (pure CSS, modular styling, no excessive runtime CSS-in-JS). Deployed to **Vercel**.
- **Backend:** Node.js + Express.js REST API. Deployed to **Render**.
- **Database:** Supabase PostgreSQL with connection pooling (PgBouncer) for runtime queries and direct connections for migrations.
- **ORM & Migrations:** Prisma ORM with versioned migrations (`backend/prisma/migrations`).
- **Authentication & Security:** Supabase Auth (JWT verified via JWKS asymmetric signatures on backend); server-side authorization directly querying the database `Profile` table.

---

## 3. Strict Guardrails & Anti-Overengineering Rules
To prevent scope creep, excessive churn, or slow UI rendering:
1. **No Decorative Bloat:** UI must be fast, responsive, clean, and purposeful—mimicking the functional clarity of Urban Company (cards, badges, explicit status badges, modal-free or streamlined booking).
2. **Fast Load & Performance:**
   - Under 3 seconds page load target.
   - Separate CSS from JSX/HTML; avoid bloated libraries.
   - Cache static public endpoints (`/api/plans`, `/api/categories`) where appropriate.
   - Paginate list views (bookings, jobs, payments) with server-side limit/offset.
3. **Security Invariants:**
   - Client is never trusted for role, price, entitlement calculations, or booking state changes.
   - All payments remain **simulated** (dummy mode: Cards, UPI, Net Banking) with explicit test indicators and no storage of real CVV/PIN/banking data.
   - Cross-tenant data isolation: Customers can only query/mutate their own records; professionals only see unassigned broadcast request summaries (address/customer masked until accepted).

---

## 4. Work Breakdown Structure (By Milestone)

### Milestone 1: Data Model, Database Migrations & Safety Checks (Status: Complete / Verified)
- [x] Prisma schema syntax errors resolved (multiline enums, scalar indexes).
- [x] Initial baseline migration created: `20261011000000_init`.
- [x] Security & constraints migration created: `20261011000001_constraints_and_rls` (checks on non-negative amounts, rating ranges, active subscription unique partial index, PostgREST RLS revocation).
- [x] Prisma Client generated and imported cleanly.

### Milestone 2: Core Customer & Admin Journeys (Status: Implemented & Unit-Tested)
- [x] Idempotent simulated subscription purchase (`/api/subscriptions/purchase`).
- [x] Anchored benefit usage calculations (`benefitWindow`).
- [x] Booking creation with server-side slot validation and entitlement locking.
- [x] Subscription cancellation (`/api/subscriptions/cancel`) releasing the active lock.
- [x] Admin operational analytics (`/api/admin/analytics`) computing real MRR, customer counts, completion rate, and rating averages.
- [x] Admin UI dashboard with live metric cards.

### Milestone 3: Professional Experience & Earnings (Next Immediate Step)
1. **Earnings Summary Endpoint (`/api/pro/earnings`)**:
   - Aggregate completed jobs and total earnings based on plan commission / payout rules.
   - Display summary card (total completed jobs, total payout, average rating) on `ProDashboard`.
2. **Availability Management**:
   - Allow service professionals to toggle active availability or manage working cities/categories.
3. **Dispute & Refund Simulation**:
   - Allow customers to file a dispute on a completed/cancelled booking.
   - Allow admins to review disputes and issue simulated refunds via `/api/admin/disputes`.

### Milestone 4: Urban Company Inspired UI Refinement & Polish
1. **Service Category & Plan Comparison Cards**:
   - Clean, visual category tags (Cleaning, Plumbing, Electrical, AC Servicing, Appliance Maintenance).
   - Clear entitlement badges (e.g., "1 inspection/mo", "Unlimited fixes", "Quarterly AC service").
2. **Customer Service Tracking**:
   - Stepper progression: Requested (Pending) -> Accepted -> In Progress -> Completed.
3. **Renewal Reminders & Alerts**:
   - Customer dashboard banner alerting when subscription is within 7 days of expiry.

### Milestone 5: Deployment & Operational Readiness
1. **Environment Configuration**:
   - Supabase project connection (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET` if applicable).
2. **Render & Vercel Verification**:
   - Verify health check (`/health`).
   - Run `npx prisma migrate deploy` followed by `npm run seed`.
   - Verify CORS origins match deployed Vercel domain.
