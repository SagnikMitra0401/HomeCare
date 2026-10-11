# Subscription-Based Home Care Platform — Security and Privacy Standard

> **Purpose:** This file defines security, authorization, and privacy requirements. Product features are specified in [PROJECT_OBJECTIVE.md](./PROJECT_OBJECTIVE.md). Non-security engineering, business-rule edge cases, testing, migrations, and release gates are specified in [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md). Avoid copying those documents into this one.

## 1. Security Objective

Treat the application as a real service that holds personal information and controls subscription benefits, bookings, professional access, and administrative actions. Security must be enforced on the server and database boundary; a hidden UI control is not authorization.

Use current OWASP guidance as a baseline, including the OWASP Top 10 and API Security Top 10. A checklist helps discover known risks but cannot prove that every vulnerability is absent.

## 2. Threat Model

Assume that:

- Any browser user can inspect frontend code, modify requests, call APIs directly, replay requests, and change IDs or payload fields.
- Users may attempt to view or modify other users' records.
- A professional account may be unapproved, suspended, or compromised.
- A customer may attempt to invoke administrative actions.
- Requests may be malformed, automated, duplicated, or sent at high volume.
- Logs, previews, build output, repositories, and configuration mistakes can expose secrets.
- Uploaded documents and user-generated reviews are untrusted input.

The assets requiring protection include identity/session data, addresses and contact details, booking and payment history, professional verification records, administrative actions, privileged credentials, and database integrity.

## 3. Identity and Session Management

### Authentication provider

- Prefer Supabase Auth for registration, sign-in, password reset, and identity/session management.
- Never store plaintext passwords in application tables or logs.
- Do not create a second custom password system unless a documented requirement demands it.
- Backend APIs must verify access tokens using a supported library and the provider's expected verification method. Never treat decoding a token as verification.
- Validate relevant token properties, including signature and applicable issuer, audience, expiry, and signing-key expectations.
- Handle expired, invalid, revoked, and missing credentials safely.
- Implement a deliberate account/session revocation process for suspended users and sensitive account changes.
- Require multifactor authentication for administrative accounts where supported and practical.

### Application roles

Use server-managed roles such as `CUSTOMER`, `PROFESSIONAL`, and `ADMIN`. A role is trusted only when derived from a protected source of truth; never accept role elevation from arbitrary request fields or frontend state.

Professional approval/suspension is a separate authorization condition from simply having the `PROFESSIONAL` role.

## 4. Authorization Rules

Use deny-by-default authorization. Every protected operation must confirm both the actor's permission and access to the specific record.

- Customers may access only their own profile, subscriptions, bookings, and payment history, except for explicitly public information.
- Professionals may access only their own profile/availability and service requests they are allowed to see or manage.
- Unapproved or suspended professionals must not receive restricted work or sensitive customer details.
- Only authorized administrators may manage plans/pricing, approve professionals, review platform-wide analytics, manage commissions, or decide disputes/refunds.
- All create, read, update, and delete operations require the applicable authorization check.
- A caller-supplied `userId`, `customerId`, `professionalId`, owner ID, role, price, commission, payment status, or approval status must not be trusted merely because it appears in a request body.
- Avoid returning entire database records by default. Return only fields the caller is authorized to see.

Test authorization with different users, not only with one logged-in administrator.

## 5. API Security Controls

- Validate request bodies, query parameters, path parameters, dates, numeric ranges, and enumerated values on the server using schemas (for example, Zod).
- Reject or ignore unknown fields deliberately; use explicit allowlists for updates to prevent mass assignment.
- Use Prisma's safe query facilities or parameterized SQL. Do not concatenate untrusted strings into SQL.
- Apply rate limits to authentication, registration, password reset, and abuse-prone operations.
- Configure Helmet and appropriate HTTP security headers.
- Configure CORS to allow only required frontend origins in production; do not combine permissive origins with credentialed requests.
- Enforce reasonable request-body and upload limits.
- Do not expose stack traces, SQL text, secrets, environment values, or internal implementation details to callers.
- Render user-generated text safely. Avoid unsafe HTML rendering; sanitize any exceptional HTML use case with a maintained solution.
- Restrict any server-side URL fetching to prevent server-side request forgery (SSRF).
- Do not rely on frontend form validation for security decisions.

## 6. Secrets and Environment Separation

- Store backend credentials in protected Render environment settings and other appropriate secret stores.
- Store frontend variables only when they are genuinely public. A frontend build variable is not secret.
- Never commit `.env` files, passwords, API secret keys, Supabase service-role keys, database passwords, signing secrets, or private certificates.
- Never put privileged credentials in browser bundles, local storage, URLs, screenshots, logs, or public documentation.
- Keep `.env.example` limited to variable names and safe placeholder values.
- Separate development, preview, and production credentials and data. Preview builds should not access production data by accident.
- Rotate a secret if it may have been exposed; deleting the line from the latest commit is not enough if it remains in history.

## 7. Supabase and PostgreSQL Access Boundaries

- Keep PostgreSQL connection credentials and privileged Supabase keys on the server.
- Use Express + Prisma as the normal application data-access path unless direct browser access to a specific Supabase feature is explicitly designed and reviewed.
- Enable and test Row Level Security (RLS) and suitable database grants for tables exposed through Supabase APIs.
- RLS policies must express the intended user's read/write permissions. Test select, insert, update, and delete behavior as applicable.
- Remember that privileged server credentials such as Supabase `service_role` can bypass RLS. Keep them server-side and restrict their use.
- Do not assume RLS policies automatically protect queries made by Prisma; evaluate the database role and connection actually used by the backend.
- Use a least-privilege database role where practical, separating migration privileges from normal runtime access when the deployment setup supports it.
- Avoid public storage buckets for verification documents. Use private storage and narrowly scoped, short-lived access links.

## 8. Privacy and Personal Data

Collect only the information needed to operate the service. Data may include names, contact details, service addresses, booking history, subscription history, reviews, and professional verification materials.

- Define which roles can view each category of personal data.
- Do not expose full addresses or direct contact information before it is operationally necessary.
- Restrict access to professional identity/verification documents to authorized reviewers.
- Avoid collecting real payment credentials in the dummy-payment flow. Do not ask for card CVVs, UPI PINs, banking passwords, or similar secrets.
- Never use real identity documents or real customer records as sample/demo data.
- Publish a clear explanation of collected data and its purpose before real users are onboarded.
- Define how account deletion requests, legal retention obligations, backups, and historical business records are handled. Do not silently delete unrelated records when removing an account.
- Choose a retention period for sensitive data and delete it when no longer required, subject to applicable obligations.
- Restrict analytics and logs from collecting unnecessary identifiers or sensitive content.

## 9. Logging and Security Auditing

Log security-relevant events such as failed authentication patterns, authorization denials, role changes, professional approval decisions, plan-pricing changes, and sensitive administrative actions.

Logs must be useful for investigation but must not contain passwords, access tokens, complete payment credentials, secret values, or unnecessary personal information. Restrict access to logs and define retention. Add alerts for significant repeated failures or suspicious access patterns where practical.

## 10. File and Dependency Safety

- Validate file size, allowed extension, content type, and file contents where feasible; never trust the supplied filename or MIME type alone.
- Store uploaded documents outside public static assets and serve them only through authorized access paths.
- Use maintained, correctly named dependencies with pinned lockfiles.
- Regularly review dependency advisories and remove unnecessary packages.
- Review generated code and third-party code before execution; do not run unknown installation scripts or copied shell commands without understanding their effects.
- Protect CI/CD secrets and review privileged build/deployment workflows.

## 11. Security Verification Requirements

Before release, tests must show that:

- Anonymous callers cannot reach protected data or operations.
- Customer A cannot access or alter Customer B's private records by changing IDs.
- Professionals cannot perform customer-only or administrator-only actions.
- Unapproved/suspended professionals cannot access restricted workflows.
- Customers cannot elevate their role or alter protected ownership, price, payment, commission, or approval fields.
- Invalid tokens and expired sessions are handled safely.
- RLS and grants enforce the intended access rules for any API-exposed tables.
- Secrets are absent from frontend bundles, repository history checks, and application logs.
- Malformed input, oversized payloads, and rate-limit violations are safely handled.

Use [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md) for the wider test strategy and release gates. Passing these checks reduces risk; it is not a guarantee that no security defect remains.

## 12. Security Decision Rule

When implementation convenience conflicts with protecting identity, personal data, authorization, or privileged operations, security requirements take precedence. If a security behavior is ambiguous, record the decision and test it instead of relying on an AI-generated assumption.
