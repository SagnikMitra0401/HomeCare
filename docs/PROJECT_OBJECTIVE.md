# Subscription-Based Home Care Platform — Project Objective

> **Purpose:** This document defines the product goal, scope, users, capabilities, and expected outcomes. It does not define security controls or the engineering quality checklist; see [SECURITY.md](./SECURITY.md) and [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md) for those topics.

## 1. Product Vision

Build a responsive, subscription-based home-maintenance platform that helps households plan and manage routine care instead of relying entirely on reactive, one-off service bookings. The platform should make costs more predictable, improve access to trusted professionals, encourage preventive maintenance, and provide a consistent service experience.

Urban Company is a reference for the type of home-service experience, not a requirement to copy its branding, proprietary design, or exact business practices. The collaborating organization is Unified Mentor.

## 2. Problem Being Solved

Current home-service experiences can involve:

- Unpredictable one-time service costs.
- Difficulty finding trusted and available professionals.
- Delays when urgent repairs are needed.
- Inconsistent service quality and customer experience.
- Little structured preventive maintenance.
- Minor issues being neglected until they become expensive repairs.

The product should connect subscriptions, scheduled maintenance, service booking, professional fulfillment, and feedback into one coherent workflow.

## 3. Objectives

### Primary objectives

1. Offer affordable subscription-based home-maintenance plans.
2. Encourage regular preventive inspections and servicing.
3. Support long-term customer relationships and renewals.
4. Provide access to appropriately verified service professionals.

### Secondary objectives

1. Help local service professionals participate in a digital service marketplace.
2. Make plan benefits and service pricing understandable.
3. Reduce avoidable emergencies through preventive maintenance.
4. Support consistent service quality and accountability.

## 4. Technology and Deployment Decision

Use the following project stack unless a documented technical constraint requires a change:

- **Frontend:** React, HTML5, CSS3, JavaScript; responsive web UI hosted on **Vercel**.
- **Backend:** Node.js and Express.js, exposing REST APIs; hosted on **Render**.
- **Database:** **Supabase PostgreSQL**.
- **Data access and migrations:** Prisma ORM.
- **Authentication:** Supabase Auth is the preferred identity provider; application authorization is handled by the backend.

This is a React + Express + Node.js + PostgreSQL stack, **not strictly MERN**, because the database is PostgreSQL rather than MongoDB. Do not introduce MongoDB simply to make the acronym fit.

The user-facing application must not connect to PostgreSQL with privileged credentials. Security details belong in [SECURITY.md](./SECURITY.md). Migration, testing, and deployment workflow details belong in [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md).

## 5. User Types and Capabilities

### Customer

Customers should be able to:

- Register, sign in, and manage their profile.
- Browse and compare subscription plans.
- Purchase, view, manage, and renew a subscription.
- Book available service slots.
- View booking status and service history.
- View simulated payment history.
- Rate completed services and submit feedback.
- Receive renewal reminders.

### Service professional

Professionals should be able to:

- Register and submit required verification information.
- Select the service categories they are qualified to provide.
- Manage availability.
- Accept or reject eligible service requests.
- View assigned work, earnings summaries, and ratings/reviews.

Professional onboarding must account for every service category actually offered by the plans, including cleaning, plumbing, electrical work, AC servicing, and appliance maintenance where included. Resolve qualification and assignment rules before implementation; see [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md).

### Administrator

Administrators should be able to:

- Create and manage subscription plans and benefits.
- Manage pricing.
- Approve or reject professional applications.
- View platform and operational analytics.
- Handle disputes and simulated refunds.
- Manage or review commission rules.

## 6. Subscription Plans in the Initial Brief

Treat the following as the initial product brief, not as a substitute for a finalized entitlement specification.

### Basic — Monthly

- One general home cleaning.
- One plumbing inspection.
- One electrical safety check.
- Discount on emergency services.

### Standard — Monthly or quarterly

- Two cleanings.
- Unlimited minor plumbing fixes.
- Two electrical visits.
- AC servicing once per quarter.

### Premium — Yearly

- Unlimited cleaning.
- Priority emergency support.
- Dedicated service manager.
- Appliance servicing coverage.

Before implementation, explicitly define each benefit's allowance period, eligibility, exclusions, fair-use boundaries (where applicable), and behavior on plan change, cancellation, expiry, and renewal. The engineering requirements for keeping these rules consistent are documented in [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md).

## 7. Phase 1 Scope

### In scope

- Responsive web application.
- Customer, professional, and admin role experiences.
- Subscription plan creation and management.
- Subscription purchase and lifecycle management.
- Service booking, assignment, and status tracking.
- Professional onboarding and approval.
- Basic payment flow in **simulation/test mode**.
- Service history, ratings, and feedback.
- Admin dashboard and basic operational analytics.
- Working REST APIs and database persistence.

### Out of scope for Phase 1

- Native Android or iOS applications.
- AI-based predictive maintenance.
- IoT device integration.
- International expansion.
- Real recurring payment collection unless a separate, explicit approved scope change is made.

Future possibilities include mobile apps, AI-assisted maintenance reminders, IoT integration, insurance partnerships, corporate housing subscriptions, and group discounts.

## 8. Core End-to-End Journeys

### Subscription journey

1. Customer registers or signs in.
2. Customer compares plans and selects one.
3. Customer confirms a simulated payment.
4. The system persists the payment outcome and subscription state.
5. Customer can view benefits, status, history, and renewal information.

### Service journey

1. Customer selects an eligible service and available slot.
2. System validates eligibility and booking availability.
3. A permitted professional is assigned or offered the request.
4. Professional accepts/rejects; accepted work progresses through defined statuses.
5. Completion or cancellation is persisted and reflected in service history.
6. Customer can submit feedback for eligible completed work.

Exact transitions, retry semantics, and edge cases are engineering requirements in [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md).

## 9. Functional Page Coverage

The application must contain at least **6–8 interconnected functional pages**. A reasonable minimum page plan is:

1. Login / registration.
2. Subscription plans and plan details.
3. Customer dashboard and subscription management.
4. Service booking and booking details.
5. Payment history.
6. Professional dashboard and request management.
7. Professional availability/profile management.
8. Admin dashboard, with plan/professional management available through connected admin views.

These are a minimum planning baseline, not a restriction against adding needed detail pages. Each screen must be connected to actual backend workflows rather than being a static mockup.

## 10. Business Metrics

The platform should support accurate definitions and reporting for:

- Monthly Recurring Revenue (MRR), based on the explicitly defined subscription revenue rules.
- Customer retention rate.
- Subscription renewal rate.
- Average service rating.
- Customer Acquisition Cost (CAC), if acquisition-spend data is available.
- Service completion rate.

Do not display fabricated analytics as real results. If data is insufficient, label metrics as demo/sample data or indicate that the metric is not yet available.

## 11. Non-Functional Outcomes

The project should aim for:

- Page load time below three seconds under a documented test setup.
- Secure authentication and role-based access.
- A data model that supports multiple cities without requiring a redesign.
- A target availability of 99%, while recognizing that actual uptime depends on hosting plans, dependencies, and monitoring.
- Responsive, understandable interfaces for non-technical users.
- Maintainable code and reproducible environment setup.

Security acceptance criteria are defined in [SECURITY.md](./SECURITY.md). Testing, performance verification, resilience, and deployment gates are defined in [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md).

## 12. Required Deliverables

- Working end-to-end web application.
- Customer, professional, and admin role experiences.
- Working subscription and booking workflows.
- Dummy/test payment integration with clear simulation labels.
- Authentication and role-based access.
- Live deployed application link.
- Product Requirements Document (PRD) and basic technical documentation.
- README containing setup instructions, environment-variable names, migration/seed commands, and safe demo test credentials.
- Evidence that key workflows have been tested.

Never place real secrets or personal records in documentation. Consult [SECURITY.md](./SECURITY.md) for data handling and [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md) for verification and release requirements.

## 13. Product Assumptions and Constraints

### Assumptions

- Customers value predictable home-maintenance expenses.
- Suitable professionals are available in supported localities.
- Customers and professionals have internet access.

### Constraints

- Professional availability can vary during peak periods.
- Service quality requires operational oversight.
- Multi-city operation introduces scheduling and service-area complexity.
- Phase 1 must remain achievable without native apps, IoT, AI prediction, or real recurring payments.

## 14. Source-of-Truth Rule

When implementing a feature, use this document to decide **what product capability is required**. Use [SECURITY.md](./SECURITY.md) for security/privacy controls and [MUST_TAKE_CARE_OF.md](./MUST_TAKE_CARE_OF.md) for engineering correctness, unresolved business rules, testing, migrations, performance, and release discipline. If a requirement is ambiguous, record and resolve it instead of silently inventing behavior.
