# Implementation Audit — Subscription-Based Home Care Platform

**Audit Date:** 2026-10-11  
**Repository:** `homecare` (Frontend: React/Vite, Backend: Express/Node.js, DB: Supabase PostgreSQL via Prisma)

---

## 1. Executive Summary

Claude produced an initial architectural skeleton that is clean, modular, and disciplined in its role boundaries and separation of concerns. The code avoids framework churn, keeps CSS lightweight and clean, and accurately captures several core domain concepts (idempotent simulated payments, anchored benefit calculation windows, status transition state machine, and server-side authorization).

However, **the project is currently blocked from running against any database** due to fatal syntax errors in `backend/prisma/schema.prisma` (single-line enum declarations which Prisma's schema parser rejects, and invalid scalar index declarations). Furthermore, **no Prisma migrations exist yet**, leaving database evolution and local/production deployment unexecutable. Several critical PRD requirements are incomplete (lack of admin analytics, missing disputes/refund simulation, no scheduled renewal or cancellation flows, missing tests for authorization/concurrency, and missing lint/audit scripts).

---

## 2. What Currently Works

1. **Unit-level Business Rules (`backend/src/rules.js` & `backend/test/rules.test.js`)**:
   - Booking state transition rules (`canTransition`) accurately restrict valid status changes per role (`CUSTOMER`, `PROFESSIONAL`).
   - Time-anchored benefit calculation (`benefitWindow`) correctly calculates multi-month windows anchored to subscription start.
   - Slot validation (`slotError`) checks future boundaries (on the hour/half-hour, <= 90 days).
   - Unit tests pass with Node's native test runner (`npm test`).

2. **Frontend Production Build**:
   - `frontend` installs cleanly and Vite builds the production bundle (`npm run build`) without errors into `dist/`.
   - Client-side routing (`react-router-dom`) defines core routes: `/`, `/login`, `/dashboard`, `/checkout/:planId`, `/payments`, `/bookings`, `/pro`, `/admin`.
   - Responsive CSS with clean, minimal layout adhering to the requirement for small maintainable CSS files without runtime CSS-in-JS.

3. **Backend Middleware & Security Design (`backend/src/app.js`, `auth.js`, `errors.js`)**:
   - Helmet security headers and strict CORS origin handling.
   - Dual-tier rate limiting: global limits + strict rate limits on sensitive endpoints (`/subscriptions/purchase`, `/pro/apply`, `/bookings`).
   - Strict body size limit (`20kb`) and generic error responses that do not leak internal stack traces or database errors.
   - Asymmetric Supabase JWT verification via JWKS with fallback for legacy symmetric HMAC.
   - Zero-trust role loading: user role is fetched directly from the database `Profile` table rather than client claims.

---

## 3. What Exists but is Incomplete

1. **Admin Capabilities (`backend/src/routes/admin.js`, `frontend/src/pages/Admin.jsx`)**:
   - **Missing Operational Analytics**: `PROJECT_OBJECTIVE.md` §10 requires metrics for MRR, retention rate, renewal rate, and average rating. Currently neither backend endpoints nor UI exist for analytics.
   - **No Dispute or Simulated Refund Handling**: Documented in `PROJECT_OBJECTIVE.md` §5 & §7, but no routes or schema support disputes or refunds.
   - **Plan Management is Partial**: Admins can create plans and patch name/price/active status, but cannot edit benefits of existing plans or manage categories.

2. **Subscription Lifecycle (`backend/src/services.js`, `backend/src/routes/customer.js`)**:
   - **No Cancellation or Early Expiry Flow**: A customer cannot cancel an active subscription.
   - **No Automated Renewal or Expiry Sweep**: Subscriptions expire only passively via `endsAt > now()` checks; there is no renewal reminder, background runner, or renewal flow.

3. **Professional Workflows (`backend/src/routes/pro.js`, `frontend/src/pages/Pro.jsx`)**:
   - **No Document Upload**: Professional onboarding mentions verification documents, but no secure storage upload or review mechanism exists.
   - **No Earnings Summaries**: Professionals cannot view historical earnings or commissions.
   - **Availability Management**: No granular calendar/shift availability management; uses simple city-level broadcast.

4. **Reviews & Ratings**:
   - Only basic review submission exists (`Review` model); average ratings per professional or platform-wide aggregates are not computed or exposed.

---

## 4. Critical Blockers & Correctness Issues (P0)

### 4.1 Broken Prisma Schema (`backend/prisma/schema.prisma`) — **BLOCKER**
- **Issue**: Line 11–16 declared all enums on single lines (e.g. `enum Role { CUSTOMER PROFESSIONAL ADMIN }`). The Prisma schema parser fails with `Error validating: This line is not an enum value definition` and `An enum must have at least one value`.
- **Issue**: Line 97, 141, 142 include index declarations on relation fields or invalid configurations:
  - Line 97: `@@index([customerId, status, endsAt])` inside `Subscription` where `status` was misparsed or invalid scalar.
  - Line 141: `@@index([status, categoryId, city])` inside `Booking`.
- **Impact**: `npx prisma validate`, `npx prisma generate`, and `npx prisma migrate dev` fail completely with 30 errors. The backend cannot initialize `@prisma/client` and cannot start.

### 4.2 Missing Prisma Migrations (`backend/prisma/migrations/`) — **BLOCKER**
- **Issue**: As noted in `docs/NEXT_STEPS.md`, the initial migration was never generated or committed. The repository contains raw `schema.prisma` and an unexecuted manual SQL script (`backend/prisma/manual/constraints_and_rls.sql`).
- **Impact**: Any attempt to run or deploy the application to Supabase or Render fails because there are no versioned migrations to deploy via `npx prisma migrate deploy`.

---

## 5. Security & Data Integrity Audit (P0 / P1)

1. **Prisma Connection & Migration Configuration**:
   - The setup correctly specifies `DATABASE_URL` (pooled) and `DIRECT_URL` (direct connection for migrations) in `schema.prisma`.
   - `constraints_and_rls.sql` enables RLS and revokes PostgREST API-role access to ensure Supabase cannot bypass Express backend controls.
2. **Double Booking / Double Purchase Concurrency**:
   - `purchasePlan` locks the customer row using `tx.$queryRaw` `FOR UPDATE` to serialize subscription creation.
   - `createBooking` locks the customer subscription with `FOR UPDATE` to serialize entitlement counting.
   - However, integration tests verifying that these locks hold under concurrent requests do not exist.
3. **Sensitive Data Exposure**:
   - Professional broadcast view (`/api/pro/requests`) safely masks customer identity, address, and notes until accepted.
   - Customer booking view (`/api/bookings`) safely exposes only professional's full name, not contact details.
   - Passwords and real payment credentials are never accepted or stored.
   - `.env.example` contains placeholders only, and `.gitignore` properly prevents committing actual `.env` files.

---

## 6. Build, Configuration, and Testing Problems

1. **No Linting or Format Scripts in `package.json`**:
   - Neither `backend/package.json` nor `frontend/package.json` defines a `lint` script, although `MUST_TAKE_CARE_OF.md` §8 prescribes a verification gate with linting.
2. **Missing Integration and Authorization Tests**:
   - `backend/test/` only contains 3 pure unit tests in `rules.test.js`.
   - There are zero automated tests for cross-customer isolation (Customer A accessing Customer B's booking), professional approval gating, or admin authorization checks.
3. **No CI Workflow Configuration**:
   - No GitHub Actions or CI pipeline file exists in the repository.

---

## 7. Conflicts Between Documentation and Implementation

1. **Entitlement Consumption on Booking vs Completion**:
   - `MUST_TAKE_CARE_OF.md` §2 highlights defining whether an entitlement is consumed at booking, acceptance, or completion.
   - `docs/ASSUMPTIONS.md` decided on consuming at booking and releasing on cancellation. The code conforms to `ASSUMPTIONS.md`, which is good and consistent.
2. **Admin Operations in PRD vs Implemented Code**:
   - PRD §5 lists: "View platform and operational analytics", "Handle disputes and simulated refunds", "Manage or review commission rules". None of these endpoints currently exist in `admin.js`.

---

## 8. Prioritized Backlog

### P0 — Blockers
1. **Fix `backend/prisma/schema.prisma` syntax**: Format enums multiline and ensure all index attributes reference valid scalar fields.
2. **Generate Prisma Client**: Ensure `npx prisma generate` succeeds.
3. **Generate & Commit Baseline Prisma Migration**: Create a verified initial migration matching the schema and incorporate the manual constraints and RLS setup.

### P1 — Core Functionality
4. **Integration & Authorization Test Suite**: Implement tests for:
   - Anonymous access rejection.
   - Customer data isolation (Customer A cannot access or cancel Customer B's booking).
   - Unapproved professional rejection.
   - Admin-only endpoint protection.
   - State machine invalid transition rejection.
5. **Admin Analytics Endpoint & UI**:
   - Compute real aggregate metrics from persisted data: active subscriptions, MRR in paise, service completion rate, average rating.
   - Display metrics on `AdminDashboard`.
6. **Subscription Cancellation & Renewal Flow**:
   - Allow customer to cancel subscription (updates status, preserves history).
   - Support renewal / re-subscription when current subscription is expired or cancelled.

### P2 — Reliability & Verification
7. **CI / Linting Configuration**:
   - Add ESLint / check scripts to backend and frontend `package.json`.
8. **Professional Earnings & Review Metrics**:
   - Provide summary of completed jobs and average review rating for the logged-in professional.
9. **Disputes / Simulated Refund Flow**:
   - Provide basic dispute raising on bookings and admin resolution.

### P3 — Polish
10. **UI States & Accessibility**:
    - Ensure keyboard navigation, ARIA attributes, empty states, and loading states are clear across all forms and lists.
