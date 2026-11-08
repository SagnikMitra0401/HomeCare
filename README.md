# HomeCare — Subscription-Based Home Care Platform

A full-stack, enterprise-grade home care platform designed to shift domestic maintenance from reactive, expensive emergency repairs to structured, predictable, and preventive care subscriptions.

- **Collaborating Organization:** Unified Mentor ([unifiedmentor.com](https://www.unifiedmentor.com/))
- **Industry Reference Model:** Urban Company ([urbancompany.com](https://www.urbancompany.com/))
- **Live Application (Vercel):** [homecare-lovat.vercel.app](https://homecare-lovat.vercel.app)
- **Live Backend API (Render):** [homecare-backend-nkfv.onrender.com](https://homecare-backend-nkfv.onrender.com)
- **Architecture:** Decoupled Single Page Application (SPA) with RESTful API
- **Frontend Stack:** React 18, Vite, React Router DOM, Pure Modular CSS (Vercel)
- **Backend Stack:** Node.js (>=20), Express 5, Prisma ORM (Render)
- **Database:** Supabase PostgreSQL with Connection Pooling & Row-Level Security
- **Payments:** 100% Simulated / Test-Mode Transaction Engine (No real financial credentials collected)

---

## 1. System Overview & Problem Statement

### 1.1 The Problem
In standard residential home maintenance, services such as plumbing, electrical work, air conditioning servicing, and cleaning are procured on an ad-hoc, on-demand basis. This reactive model introduces systemic friction:
- **Unpredictable and Inflated Costs:** Minor, neglected issues escalate into catastrophic, expensive repairs.
- **Trust & Quality Deficit:** Households struggle to find vetted, qualified professionals during emergency breakdowns.
- **Workforce Fragmentation:** Local technicians experience unstable income and inefficient job dispatching.
- **Absence of Preventive Care:** Critical equipment (ACs, electrical panels, plumbing fixtures) rarely receives routine maintenance.

### 1.2 The Solution
HomeCare introduces structured monthly, quarterly, and annual subscription tiers that deliver routine preventive inspections, priority emergency scheduling, and guaranteed service allowances. The platform unifies the full lifecycle—from automated entitlement tracking to technician dispatch, service verification, review collection, and dispute resolution—into a coherent, reliable workflow.

---

## 2. Technology Stack & Architecture

```
+-----------------------------------------------------------------+
|                        PRESENTATION TIER                        |
|  React 18 · Vite · React Router DOM v6 · Vanilla CSS            |
|  Static SPA deployed to Vercel CDN (<1.5s First Contentful Paint)|
+-----------------------------------------------------------------+
                                |
                  HTTPS / JSON REST (Bearer JWT)
                                |
+-----------------------------------------------------------------+
|                        APPLICATION TIER                         |
|  Node.js (>=20) · Express 5 · Helmet · Rate-Limiting · Zod      |
|  Asymmetric JWKS Token Verification · Reusable Prisma Client    |
|  Web Service deployed to Render (behind reverse proxy)          |
+-----------------------------------------------------------------+
                                |
             PostgreSQL Protocol (Prisma ORM Client)
                                |
+-----------------------------------------------------------------+
|                            DATA TIER                            |
|  Supabase PostgreSQL (AWS Multi-AZ)                             |
|  - Transaction Pooler (Port 6543, PgBouncer) for API Queries    |
|  - Session / Direct Connection (Port 5432) for Migrations       |
|  - Deny-by-Default Row-Level Security (PostgREST Lockdown)      |
|  - Check Constraints & Partial Unique Indexes                   |
+-----------------------------------------------------------------+
```

### Architectural Decisions
- **Strict Role-Based Access Control:** User roles (`CUSTOMER`, `PROFESSIONAL`, `ADMIN`) are resolved exclusively on the server from the database `Profile` table. Client-supplied tokens or claims are never trusted for authorization.
- **Zero-Dependency Lightweight Styling:** CSS is decoupled from JavaScript components using clean, maintainable modular stylesheets, eliminating heavyweight runtime CSS-in-JS overhead.
- **Data Integrity Constraints:** The database enforces non-negative monetary figures (stored in integer paise), valid review ranges (1–5), single active subscription constraints per customer, and slot exclusivity per technician.

---

## 3. Role-Based Feature Matrix

### 3.1 Customer Portal
- **Account Management:** User registration, profile updates, and session management via Supabase Auth.
- **Catalog Exploration:** Interactive subscription plans and services catalog (`/services`) with transparent allowance breakdowns.
- **Simulated Checkout:** Multi-channel dummy payment checkout (UPI, Cards, Net Banking) with cryptographic idempotency keys.
- **Entitlement Tracking:** Live dashboard displaying used vs. available service allowances calculated against anchored multi-month windows.
- **Booking Management:** On-the-hour and half-hour slot reservations, active booking tracking, and self-service cancellation.
- **Quality Assurance:** Post-service rating submission (1–5 scale with feedback) and dispute / refund request filing.
- **Proactive Retention:** 7-day automated expiration warning banners on customer dashboards.

### 3.2 Service Professional Portal
- **Onboarding & Verification:** City selection, service trade qualification (Cleaning, Plumbing, Electrical, AC Servicing, Appliance Maintenance), and application submission.
- **Broadcast Dispatch:** Real-time visibility of pending service requests filtered strictly by technician city and approved qualifications.
- **Privacy Safeguards:** Customer full names, complete addresses, and private notes remain masked until the job is accepted.
- **Fulfillment Pipeline:** State machine transitions (`ACCEPTED` -> `IN_PROGRESS` -> `COMPLETED`).
- **Earnings & Metrics:** Performance summary detailing completed job volumes, customer ratings, and simulated payout totals.

### 3.3 Administrator Portal
- **Operational Analytics:** Real-time metrics including Monthly Recurring Revenue (MRR in integer paise), customer base size, service completion rate, and average platform rating.
- **Plan & Pricing Governance:** Create subscription tiers, adjust prices for future sign-ups, and toggle plan visibility.
- **Professional Approvals:** Review applicant verification details and approve or reject professional accounts.
- **Dispute Resolution:** Review customer grievances, record resolution notes, and issue simulated refunds.
- **System Maintenance:** Trigger background expiration sweeps for lapsed subscriptions.

---

## 4. Subscription Plans & Entitlements

| Plan Name | Billing Interval | Included Allowances | Target Use Case |
| :--- | :--- | :--- | :--- |
| **Basic Monthly** | Monthly | 1 Home Cleaning, 1 Plumbing Inspection, 1 Electrical Safety Check | Essential upkeep for small residences |
| **Standard Monthly** | Monthly | 2 Cleanings, Unlimited Minor Plumbing, 2 Electrical Visits, 1 AC Service / quarter | Routine family maintenance |
| **Standard Quarterly** | Quarterly | 2 Cleanings, Unlimited Minor Plumbing, 2 Electrical Visits, 1 AC Service / quarter | Predictable quarterly care |
| **Premium Yearly** | Yearly | Unlimited Cleaning, Unlimited Appliance Maintenance, Dedicated Service Manager, Priority Support | Comprehensive annual protection |

*Allowances are calculated against rolling multi-month periods anchored to the customer's subscription purchase date (`benefitWindow`).*

---

## 5. Security and Privacy Standards

- **Token Verification:** Asymmetric signature verification using remote JSON Web Key Sets (JWKS) against Supabase Auth endpoints. No static decoding without verification.
- **PostgREST Lockdown:** Row-Level Security (RLS) is enabled across all application tables with zero public access policies, revoking permissions from `anon` and `authenticated` roles to ensure all data access passes through the Express application.
- **Input Validation:** Strict runtime schema parsing using Zod rejects unknown properties and enforces format, length, and range limits.
- **HTTP Security Headers:** Configured via Helmet, disabling identifying headers and enforcing secure MIME types.
- **Rate Limiting:** Dual-tier rate limiting protects public routes against brute-force attacks, with tighter throttles on checkout, booking creation, and application endpoints.
- **Audit Trails:** Administrative decisions (approvals, plan edits, dispute resolutions) are logged with structured JSON event schemas omitting tokens and sensitive PII.

---

## 6. Repository Layout

```
homecare/
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Committed, versioned SQL migrations
│   │   ├── schema.prisma        # Authoritative Prisma data models
│   │   └── seed.js              # Idempotent synthetic catalog seeder
│   ├── scripts/
│   │   ├── make-admin.js        # Safe operator admin promotion script
│   │   └── sweep-expired.js     # Scheduled subscription expiry sweeper
│   ├── src/
│   │   ├── routes/              # Modular Express route handlers
│   │   ├── app.js               # Express application configuration & middleware
│   │   ├── auth.js              # Token verification & role authorization gates
│   │   ├── config.js            # Environment validation
│   │   ├── db.js                # Reusable Prisma client instance
│   │   ├── errors.js            # Central error mapping & pagination helpers
│   │   ├── rules.js             # Pure business rules & state transition machine
│   │   ├── server.js            # Entrypoint listener
│   │   └── services.js          # Core transactional business logic
│   └── test/                    # Unit & authorization test suites
├── docs/
│   ├── DEPLOYMENT_GUIDE.md      # Comprehensive production deployment runbook
│   ├── IMPLEMENTATION_AUDIT.md  # Architectural & baseline audit report
│   ├── MASTER_ROADMAP.md        # Work breakdown structure & benchmarks
│   ├── MUST_TAKE_CARE_OF.md     # Engineering guardrails & correctness rules
│   ├── PROJECT_OBJECTIVE.md     # Vision & detailed requirements specification
│   ├── SECURITY.md              # Security controls & privacy guidelines
│   └── TECHNICAL_DOCUMENTATION.md # Complete architectural reference
├── frontend/
│   ├── src/
│   │   ├── pages/               # Functional view components (Admin, Customer, Pro, Public)
│   │   ├── api.js               # Resilient fetch client with trailing-slash normalization
│   │   ├── App.jsx              # Client-side router & role guards
│   │   ├── auth.jsx             # React authentication context provider
│   │   ├── styles.css           # Clean, maintainable modular stylesheets
│   │   └── supabase.js          # Public Supabase client configuration
│   ├── vercel.json              # SPA catch-all rewrite rules
│   └── vite.config.js           # Vite build pipeline
├── render.yaml                  # Render Infrastructure-as-Code Blueprint
├── supabase_schema.sql          # Idempotent standalone PostgreSQL setup script
└── vercel.json                  # Root fallback Vercel configuration
```

---

## 7. Local Development Setup

### 7.1 Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- A Supabase project (free tier available at [supabase.com](https://supabase.com))

### 7.2 Database Setup
1. Open your Supabase Dashboard and navigate to the **SQL Editor**.
2. Paste and run the idempotent [`supabase_schema.sql`](./supabase_schema.sql) script. This initializes all tables, constraints, RLS policies, and seed plans.

### 7.3 Backend Setup
1. Navigate to `backend/` and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `backend/.env` (use `.env.example` as a template):
   ```ini
   NODE_ENV=development
   PORT=4000
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5"
   DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   SUPABASE_URL="https://[PROJECT_REF].supabase.co"
   CORS_ORIGINS="http://localhost:5173"
   ALLOW_SIMULATED_FAILURE=true
   ```
3. Generate the Prisma Client and run the test suite:
   ```bash
   npm run build
   npm test
   ```
4. Start the development server:
   ```bash
   npm run dev
   # Health check accessible at: http://localhost:4000/health
   ```

### 7.4 Frontend Setup
1. In a separate terminal, navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Create `frontend/.env`:
   ```ini
   VITE_API_URL=http://localhost:4000
   VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
   # Either variable name is supported:
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   # or legacy:
   # VITE_SUPABASE_ANON_KEY=public-anon-key
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   # Application accessible at: http://localhost:5173
   ```

---

## 8. Assigning an Administrator

The platform adheres to a zero-trust model: self-registration always provisions accounts with the `CUSTOMER` role. The first user is **not** automatically elevated to admin.

To promote an account to `ADMIN`, the operator with database access must execute an explicit promotion:

**Method A: Via Supabase SQL Editor**
```sql
UPDATE "Profile" SET role = 'ADMIN' WHERE email = 'operator-email@yourdomain.com';
```

**Method B: Via Backend CLI Script**
```bash
cd backend
npm run make-admin -- operator-email@yourdomain.com
```

Multi-factor authentication (MFA) should be enabled on all administrative accounts through Supabase Auth settings.

---

## 9. Production Deployment

The project is configured for one-click deployment across Vercel (Frontend), Render (Backend), and Supabase (Database).

Detailed step-by-step instructions and configuration options are documented in [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md).

### Summary of Environment Variables

#### Render Backend Web Service
| Variable | Value Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Transaction pooled Supabase connection URI (port 6543) |
| `DIRECT_URL` | Direct Supabase connection URI (port 5432) |
| `SUPABASE_URL` | Project HTTPS endpoint |
| `CORS_ORIGINS` | Deployed Vercel domain (e.g. `https://your-app.vercel.app`) |
| `ALLOW_SIMULATED_FAILURE` | `false` |

#### Vercel Frontend SPA
| Variable | Value Description |
| :--- | :--- |
| `VITE_API_URL` | Deployed Render endpoint (e.g. `https://your-api.onrender.com`) |
| `VITE_SUPABASE_URL` | Project HTTPS endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public client publishable or anon key (`sb_publishable_...` or anon JWT) |

---

## 10. Verification and Quality Gates

The codebase enforces strict quality gates prior to release:

- **Syntax & Module Validation:**
  ```bash
  cd backend && npm run lint
  ```
- **Automated Test Suite:**
  ```bash
  cd backend && npm test
  ```
  *Executes 7 native tests verifying role authorization rejection (`403 FORBIDDEN`), multi-role gates, pagination boundaries, strict schema validation, state transition integrity, and anchored benefit windows.*
- **Production Asset Compilation:**
  ```bash
  cd frontend && npm run build
  ```
  *Produces an optimized, chunked production bundle in `frontend/dist/` in under 3 seconds.*

---

## 11. Technical Documentation Index

For in-depth architectural and operational specifications, consult:
- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) — Comprehensive technical reference, API catalog, and data structures.
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) — Step-by-step production runbook.
- [Master Roadmap](docs/MASTER_ROADMAP.md) — Implementation milestones, Urban Company benchmark alignment, and work breakdown.
- [Security & Privacy Standard](docs/SECURITY.md) — OWASP-aligned controls and threat model.
- [Engineering Guardrails](docs/MUST_TAKE_CARE_OF.md) — Non-security checklists, state transition invariants, and data integrity safeguards.

---

## 12. License

This project is developed for educational and demonstration purposes under collaboration with **Unified Mentor**.
