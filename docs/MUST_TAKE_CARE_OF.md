# Subscription-Based Home Care Platform — Engineering Guardrails

> **Purpose:** This is the non-security checklist for correctness, business rules, database evolution, performance, testing, and delivery. Product scope and required capabilities are in [PROJECT_OBJECTIVE.md](./PROJECT_OBJECTIVE.md). Security and privacy controls are in [SECURITY.md](./SECURITY.md). Those files own their topics; do not duplicate their full checklists here.

## 1. Rules for AI-Assisted Development

Treat AI-generated code as an unverified proposal, not as evidence of correctness.

For each meaningful task:

1. State the requirement, expected behavior, affected files, and behaviors that must remain unchanged.
2. Identify ambiguous requirements before silently inventing product behavior.
3. Make a small, reviewable change rather than rewriting unrelated modules.
4. Add or update tests alongside the code.
5. Inspect the complete diff, including dependency changes, generated files, and deleted logic.
6. Run the relevant checks and inspect persisted results yourself.
7. Record what was implemented, what was tested, and what remains incomplete.

Do not accept “it compiles,” “the UI looks right,” or “the AI reviewed itself” as proof that a workflow works.

## 2. Business Rules That Must Be Defined Explicitly

Resolve the rules below before implementing the dependent workflows. Put the agreed decisions in a small product-rules or technical-decision document if they grow beyond this checklist.

### Subscription entitlements

For every plan and billing interval, define:

- The allowance for each service and the period to which it applies.
- Whether an included service consumes an entitlement at booking, acceptance, or completion.
- Whether unused allowances roll over or expire.
- Eligibility, exclusions, fair-use limits, and when extra charges apply.
- Whether a customer may change plans mid-period and how any price/benefit difference is handled.
- Cancellation timing, expiry, failed renewal, grace periods, and reactivation behavior.
- How the system treats “unlimited” benefits in a way that is operationally clear and testable.

The Standard plan's two cleanings and two electrical visits must be explicitly scoped to a billing/benefit period. Quarterly AC servicing must be calculated from a defined period, not inferred from a label. The Basic and Premium terms must be equally explicit.

### Service catalog and professional qualification

The service catalog includes cleaning, plumbing, electrical work, AC servicing, and appliance maintenance where applicable. Professional onboarding must support every offered category or clearly define how unsupported services are fulfilled. Define qualifications, service areas, approval status, and what happens when no suitable professional is available.

### Booking and assignment

Define permitted booking states and transitions, such as Pending → Accepted → In progress → Completed, with separately permitted cancellation/rejection paths. Specify:

- Who may trigger each transition.
- Whether a service request is broadcast, offered to one professional, or assigned by an administrator.
- What happens after rejection or timeout.
- Whether customers may reschedule or cancel after acceptance.
- Cancellation fees, refund/credit treatment, and dispute handling.
- The definition of a slot's exclusivity and buffer time.
- When feedback becomes available and whether one review per eligible booking is the rule.

Do not allow clients to set arbitrary state values. State transition validation must be implemented centrally in the backend.

### Dummy payment and renewal behavior

- Label all payment screens, records, and results as simulated/test transactions.
- Do not collect real financial credentials.
- Persist the simulated outcome and use consistent states for pending, succeeded, failed, and any refund/reversal simulation.
- Define exactly when a simulated success activates a subscription and when a failure leaves it inactive or unchanged.
- Implement renewal as an explicitly simulated process; do not claim that real money was charged.
- Ensure retries cannot create duplicate renewals, payment records, or subscription benefits.
- Define what happens after renewal failure, expiry, cancellation, and refund.

### Pricing, commissions, and analytics

- Calculate amounts on the server using a consistent precision strategy (for example, integer paise or PostgreSQL `NUMERIC`/Prisma `Decimal`), with explicit currency and rounding rules.
- Preserve the purchase-time price and relevant plan terms on a customer's subscription/order history.
- Define when and how commissions are calculated and whether they change for historical jobs.
- Write metric definitions before building dashboards. MRR, retention, renewal rate, completion rate, and average rating must be derived consistently from persisted data.
- Do not fabricate live analytics. Clearly label seeded/demo metrics or show “not available” when source data is insufficient.

## 3. Data Model and Integrity

Design the schema around the actual relationships and lifecycles rather than around the visual pages alone. Candidate entities include user profiles, professional profiles, service categories, service areas, subscription plans, plan benefits, customer subscriptions, usage records, availability, bookings, booking events, payment simulations, reviews, disputes, commission records, and administrative audit events. Create separate tables only where they provide clear integrity or query benefits.

Required safeguards:

- Use foreign keys and appropriate `NOT NULL`, `UNIQUE`, and `CHECK` constraints.
- Add indexes for real query patterns such as customer/professional booking lists, booking status/time, subscription status/expiry, and relation lookups.
- Paginate list endpoints and make filtering/sorting server-side.
- Prevent orphaned records and invalid references.
- Preserve historical records needed for service, financial, and dispute history.
- Define the effect of account deletion; do not cascade-delete unrelated or legally/operationally required records without an explicit policy.
- Use transactions when several writes form one business operation.
- Prevent duplicate slot reservations under concurrent requests with suitable constraints, transactions, or locking/concurrency control.
- Ensure entitlement usage cannot be consumed twice or become invalid under concurrent bookings.
- Make seeded data realistic and meaningful, but synthetic. Do not use live personal data in development fixtures.

## 4. Prisma and Database Migration Workflow

Prisma is the typed data-access layer and the versioned schema/migration mechanism. Pin a stable, compatible Prisma version and follow that version's official configuration instructions. Do not mix examples from incompatible major versions.

### Development workflow

1. Edit the Prisma schema.
2. Generate a named migration using `npx prisma migrate dev --name <descriptive_name>` in development.
3. Inspect the generated SQL and any data implications.
4. Apply the migration to a clean test database and run regression tests.
5. Commit both the schema and migration files.

### Production workflow

- Apply committed migrations using `npx prisma migrate deploy` in a controlled release step.
- Do not use `migrate dev` against production.
- Do not use `prisma db push` as the routine production schema-change workflow.
- Do not rewrite migrations that have already been applied in a shared or production environment; make a new migration.
- Avoid simultaneous migration runners from multiple application instances.
- Back up important data before risky changes and verify restoration procedures.
- Use expand-and-contract changes for deployments where old and new application versions may overlap: add compatible structures, migrate code/data, then remove obsolete structures in a later release.

### Supabase connection configuration

- Use the appropriate pooled PostgreSQL connection for runtime queries and a suitable direct/session-mode connection for migration operations, following the selected Prisma version and Supabase's current connection guidance.
- Use a supported PostgreSQL driver adapter where required by the pinned Prisma version.
- Instantiate a reusable Prisma client for the running server process instead of creating a new client per request.
- Set connection limits with Render instance count and Supabase limits in mind.
- Validate required environment variables during startup without printing their values.

Connection credentials and access-control policy details are owned by [SECURITY.md](./SECURITY.md).

## 5. API and Frontend Correctness

- Define consistent API response and error formats.
- Keep business logic in backend service modules rather than duplicating rules across routes and React pages.
- Keep database access in a clear repository/data-access layer where practical.
- Do not let frontend state become the source of truth for prices, entitlements, ownership, assignment, or payment outcomes.
- Handle loading, empty, validation-error, authorization-error, network-error, and retry states in the UI.
- Prevent duplicate submissions from repeated clicks; frontend button disabling is useful UX but backend idempotency is still required for sensitive operations.
- Avoid hardcoded localhost URLs in production builds. Keep configuration environment-specific.
- Make navigation and page permissions consistent with server capabilities.
- Do not ship placeholder handlers, fake success messages, TODO implementations, or static mock arrays in place of required production workflows.
- Search for obvious leftovers such as `TODO`, `FIXME`, mocked success objects, console debugging, unused components, and dead endpoints before release.
- Keep frontend bundle size and component complexity reasonable; lazy-load substantial role-specific routes where appropriate.

Security-related validation and authorization requirements belong in [SECURITY.md](./SECURITY.md).

## 6. Performance and Reliability

The target is under-three-second page loading under a documented test setup, with actual timing measured rather than assumed.

- Optimize database queries and avoid N+1 query patterns.
- Select only required fields; do not send whole records by default.
- Add indexes only for measured or clearly justified query patterns; verify query plans for expensive queries.
- Paginate large lists and cap page sizes.
- Keep responses and uploaded files to reasonable sizes.
- Optimize images and split/lazy-load code where beneficial.
- Avoid blocking synchronous work in the Node.js request path.
- Configure sensible request timeouts, database pool limits, and bounded retries.
- Design background/renewal jobs to resume safely after failure and avoid duplicate work.
- Use transactions and idempotency for operations whose partial completion would be harmful.
- Add a health endpoint that reports appropriate readiness without revealing sensitive internals.
- Monitor latency and errors; a health endpoint alone does not prove availability.

Render free web services can sleep after inactivity and have cold-start delay. If the three-second target must hold on first request, choose a deployment tier and configuration compatible with that requirement. Availability targets also depend on hosting plans and external dependencies.

## 7. Test Strategy

Tests should cover behavior, state, persistence, permissions, failures, and regressions. Use a dedicated test database with synthetic records.

### Required layers

- **Unit tests:** business calculations, entitlement checks, date boundaries, allowed state transitions, commission calculations and metric definitions.
- **Integration tests:** Express endpoints against PostgreSQL/Prisma, including constraint behavior and transactions.
- **Authorization tests:** coordinate test identities and expected denials; detailed security coverage is specified in [SECURITY.md](./SECURITY.md).
- **End-to-end tests:** critical workflows in a browser (Playwright or equivalent).
- **Migration tests:** apply all migrations to a blank database and test upgrades from a representative previous schema.
- **Production smoke tests:** verify the deployed API, sign-in, subscription view, booking, simulated payment, service status, and persisted history.

### Minimum critical scenarios

- Successful and failed simulated subscription purchases.
- Expired subscription and renewal failure.
- Benefit usage at zero, one remaining, and the limit boundary.
- Booking cancellation, rejection, completion, and invalid state changes.
- Two concurrent attempts to book an exclusive slot.
- Repeated request/retry for a renewal or payment operation.
- Pricing changes after a customer's purchase.
- Empty history, network failure, unavailable professional, and database outage.
- Invalid dates, month-end/quarter-end/year-end transitions, and local timezone display.
- A fresh database can be built entirely from committed migrations and seed instructions.

## 8. CI, Deployment, and Release Gates

Set up CI to run applicable checks on every meaningful change and require critical checks to pass before production release. Script names should match the actual repository; do not paste commands that have not been configured.

An example verification sequence is:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Add database integration and browser tests as the project evolves. Configure dependency and secret scanning. Review dependency changes and generated diffs rather than treating scan output as complete assurance.

### Vercel + Render + Supabase release checks

- Use distinct local/preview/production configurations where practical.
- Confirm the Vercel frontend points at the correct Render API URL.
- Confirm Render can connect to the intended Supabase database.
- Apply committed migrations in a controlled deployment step.
- Verify health checks and production smoke tests after release.
- Do not release when a required build, migration, or critical workflow test fails.
- Confirm that preview deployments cannot accidentally modify production data.
- Keep a rollback or forward-fix plan for every release that changes schema or important state.

Secrets, CORS, authentication, RLS, and privacy configuration are defined in [SECURITY.md](./SECURITY.md).

## 9. Observability and Recovery

- Record structured application errors with a correlation/request ID.
- Log status and timing for critical API operations without logging sensitive payloads.
- Monitor error rate, latency, failed renewals, booking failures, and database connectivity.
- Provide actionable error messages to users without exposing implementation details.
- Define how interrupted renewal/assignment operations are found and safely retried.
- Confirm backup and recovery options for the chosen Supabase plan and verify restoration instructions rather than assuming a backup is usable.
- Keep a concise incident checklist for deployment failure, database migration failure, corrupted state, or exposed credentials.

Privacy limits for logs and sensitive events are defined in [SECURITY.md](./SECURITY.md).

## 10. Completion Definition

A feature is complete only when all applicable conditions hold:

- Its requirements and edge cases are defined.
- The frontend, API, and database agree on the same behavior.
- Data persists correctly and survives reloads.
- Invalid states and repeat requests are handled deliberately.
- Automated tests cover core success and failure paths.
- The deployment builds with the intended environment configuration.
- The deployed workflow has been smoke-tested.
- Documentation and setup instructions are updated.
- No known release-blocking issue remains unresolved.

Never claim that the system has “no possible bugs.” The standard is evidence-based verification, explicit risk decisions, and prompt correction of discovered defects.
