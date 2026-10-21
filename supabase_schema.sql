-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'PROFESSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Interval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PayStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professional" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ProStatus" NOT NULL DEFAULT 'PENDING',
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "interval" "Interval" NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "perks" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanBenefit" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "allowance" INTEGER,
    "periodMonths" INTEGER NOT NULL,

    CONSTRAINT "PlanBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "planName" TEXT NOT NULL,
    "status" "SubStatus" NOT NULL DEFAULT 'ACTIVE',
    "pricePaise" INTEGER NOT NULL,
    "interval" "Interval" NOT NULL,
    "benefitsSnapshot" JSONB NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "subscriptionId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PayStatus" NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "professionalId" UUID,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDecline" (
    "bookingId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,

    CONSTRAINT "BookingDecline_pkey" PRIMARY KEY ("bookingId","professionalId")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfessionalToServiceCategory" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ProfessionalToServiceCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlanBenefit_planId_categoryId_key" ON "PlanBenefit"("planId", "categoryId");

-- CreateIndex
CREATE INDEX "Subscription_customerId_status_endsAt_idx" ON "Subscription"("customerId", "status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_subscriptionId_key" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_customerId_createdAt_idx" ON "Payment"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_categoryId_city_idx" ON "Booking"("status", "categoryId", "city");

-- CreateIndex
CREATE INDEX "Booking_professionalId_status_idx" ON "Booking"("professionalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_professionalId_slotStart_key" ON "Booking"("professionalId", "slotStart");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "_ProfessionalToServiceCategory_B_index" ON "_ProfessionalToServiceCategory"("B");

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBenefit" ADD CONSTRAINT "PlanBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBenefit" ADD CONSTRAINT "PlanBenefit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDecline" ADD CONSTRAINT "BookingDecline_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDecline" ADD CONSTRAINT "BookingDecline_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessionalToServiceCategory" ADD CONSTRAINT "_ProfessionalToServiceCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessionalToServiceCategory" ADD CONSTRAINT "_ProfessionalToServiceCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: constraints_and_rls
-- Check constraints, unique partial index, and RLS lockdown for PostgREST

ALTER TABLE "Plan" ADD CONSTRAINT plan_price_nonneg CHECK ("pricePaise" >= 0);
ALTER TABLE "PlanBenefit" ADD CONSTRAINT benefit_allowance_pos CHECK ("allowance" IS NULL OR "allowance" > 0);
ALTER TABLE "PlanBenefit" ADD CONSTRAINT benefit_period_pos CHECK ("periodMonths" BETWEEN 1 AND 12);
ALTER TABLE "Payment" ADD CONSTRAINT payment_amount_nonneg CHECK ("amountPaise" >= 0);
ALTER TABLE "Review" ADD CONSTRAINT review_rating_range CHECK ("rating" BETWEEN 1 AND 5);

-- At most one ACTIVE subscription per customer (backstop for the application-level lock).
CREATE UNIQUE INDEX one_active_subscription_per_customer ON "Subscription" ("customerId") WHERE "status" = 'ACTIVE';

-- Supabase exposes the public schema through PostgREST. This app uses Express + Prisma only,
-- so enable RLS on every table with NO policies and revoke API-role grants (deny by default).
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_prisma%' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
-- Prisma connects as the table-owning role, which bypasses RLS. Authorization is enforced in Express.
-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Dispute" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_bookingId_key" ON "Dispute"("bookingId");

-- CreateIndex
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable RLS and revoke API grants on Dispute table
ALTER TABLE public."Dispute" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public."Dispute" FROM anon, authenticated;
  END IF;
END $$;


-- ==========================================
-- SEED INITIAL DATA (Categories & Default Plans)
-- ==========================================

-- Insert Service Categories
INSERT INTO "ServiceCategory" ("id", "slug", "name")
VALUES
  (gen_random_uuid(), 'cleaning', 'Home Cleaning'),
  (gen_random_uuid(), 'plumbing', 'Plumbing'),
  (gen_random_uuid(), 'electrical', 'Electrical'),
  (gen_random_uuid(), 'ac-servicing', 'AC Servicing'),
  (gen_random_uuid(), 'appliance', 'Appliance Maintenance')
ON CONFLICT ("slug") DO NOTHING;

-- Insert Plans
INSERT INTO "Plan" ("id", "name", "description", "interval", "pricePaise", "perks", "active")
VALUES
  (
    gen_random_uuid(),
    'Basic Monthly',
    'Essentials for a small home.',
    'MONTHLY',
    29900,
    ARRAY['Discount on emergency services'],
    true
  ),
  (
    gen_random_uuid(),
    'Standard Monthly',
    'Regular upkeep, billed monthly.',
    'MONTHLY',
    59900,
    ARRAY[]::TEXT[],
    true
  ),
  (
    gen_random_uuid(),
    'Standard Quarterly',
    'Regular upkeep, billed quarterly.',
    'QUARTERLY',
    159900,
    ARRAY[]::TEXT[],
    true
  ),
  (
    gen_random_uuid(),
    'Premium Yearly',
    'Maximum coverage for the year.',
    'YEARLY',
    599900,
    ARRAY['Priority emergency support', 'Dedicated service manager'],
    true
  )
ON CONFLICT ("name") DO NOTHING;

-- Link Benefits for Basic Monthly
INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, 1, 1
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Basic Monthly' AND c.slug IN ('cleaning', 'plumbing', 'electrical')
ON CONFLICT ("planId", "categoryId") DO NOTHING;

-- Link Benefits for Standard Monthly
INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, 2, 1
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Standard Monthly' AND c.slug IN ('cleaning', 'electrical')
ON CONFLICT ("planId", "categoryId") DO NOTHING;

INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, NULL, 1
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Standard Monthly' AND c.slug = 'plumbing'
ON CONFLICT ("planId", "categoryId") DO NOTHING;

INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, 1, 3
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Standard Monthly' AND c.slug = 'ac-servicing'
ON CONFLICT ("planId", "categoryId") DO NOTHING;

-- Link Benefits for Standard Quarterly
INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, 2, 3
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Standard Quarterly' AND c.slug IN ('cleaning', 'electrical')
ON CONFLICT ("planId", "categoryId") DO NOTHING;

INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, NULL, 3
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Standard Quarterly' AND c.slug = 'plumbing'
ON CONFLICT ("planId", "categoryId") DO NOTHING;

INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, 1, 3
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Standard Quarterly' AND c.slug = 'ac-servicing'
ON CONFLICT ("planId", "categoryId") DO NOTHING;

-- Link Benefits for Premium Yearly
INSERT INTO "PlanBenefit" ("id", "planId", "categoryId", "allowance", "periodMonths")
SELECT gen_random_uuid(), p.id, c.id, NULL, 12
FROM "Plan" p, "ServiceCategory" c
WHERE p.name = 'Premium Yearly' AND c.slug IN ('cleaning', 'appliance')
ON CONFLICT ("planId", "categoryId") DO NOTHING;
