-- =====================================================================
-- SAFE & IDEMPOTENT SUPABASE SCHEMA SETUP (Can be run multiple times safely)
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS "public";

-- Safe Enum Creation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'PROFESSIONAL', 'ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProStatus') THEN
    CREATE TYPE "ProStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Interval') THEN
    CREATE TYPE "Interval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubStatus') THEN
    CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayStatus') THEN
    CREATE TYPE "PayStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeStatus') THEN
    CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED', 'REFUNDED');
  END IF;
END $$;

-- Table: Profile
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- Table: ServiceCategory
CREATE TABLE IF NOT EXISTS "ServiceCategory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- Table: Professional
CREATE TABLE IF NOT EXISTS "Professional" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ProStatus" NOT NULL DEFAULT 'PENDING',
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- Table: Plan
CREATE TABLE IF NOT EXISTS "Plan" (
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

-- Table: PlanBenefit
CREATE TABLE IF NOT EXISTS "PlanBenefit" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "allowance" INTEGER,
    "periodMonths" INTEGER NOT NULL,
    CONSTRAINT "PlanBenefit_pkey" PRIMARY KEY ("id")
);

-- Table: Subscription
CREATE TABLE IF NOT EXISTS "Subscription" (
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

-- Table: Payment
CREATE TABLE IF NOT EXISTS "Payment" (
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

-- Table: Booking
CREATE TABLE IF NOT EXISTS "Booking" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- Table: BookingDecline
CREATE TABLE IF NOT EXISTS "BookingDecline" (
    "bookingId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    CONSTRAINT "BookingDecline_pkey" PRIMARY KEY ("bookingId","professionalId")
);

-- Table: Review
CREATE TABLE IF NOT EXISTS "Review" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Table: Dispute
CREATE TABLE IF NOT EXISTS "Dispute" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- Join Table: _ProfessionalToServiceCategory
CREATE TABLE IF NOT EXISTS "_ProfessionalToServiceCategory" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,
    CONSTRAINT "_ProfessionalToServiceCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- Safe Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_email_key" ON "Profile"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCategory_slug_key" ON "ServiceCategory"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Professional_userId_key" ON "Professional"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_name_key" ON "Plan"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "PlanBenefit_planId_categoryId_key" ON "PlanBenefit"("planId", "categoryId");
CREATE INDEX IF NOT EXISTS "Subscription_customerId_status_endsAt_idx" ON "Subscription"("customerId", "status", "endsAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_subscriptionId_key" ON "Payment"("subscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Payment_customerId_createdAt_idx" ON "Payment"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_status_categoryId_city_idx" ON "Booking"("status", "categoryId", "city");
CREATE INDEX IF NOT EXISTS "Booking_professionalId_status_idx" ON "Booking"("professionalId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_professionalId_slotStart_key" ON "Booking"("professionalId", "slotStart");
CREATE UNIQUE INDEX IF NOT EXISTS "Review_bookingId_key" ON "Review"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "Dispute_bookingId_key" ON "Dispute"("bookingId");
CREATE INDEX IF NOT EXISTS "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "_ProfessionalToServiceCategory_B_index" ON "_ProfessionalToServiceCategory"("B");
CREATE UNIQUE INDEX IF NOT EXISTS one_active_subscription_per_customer ON "Subscription" ("customerId") WHERE "status" = 'ACTIVE';

-- Safe Foreign Keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Professional_userId_fkey') THEN
    ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanBenefit_planId_fkey') THEN
    ALTER TABLE "PlanBenefit" ADD CONSTRAINT "PlanBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanBenefit_categoryId_fkey') THEN
    ALTER TABLE "PlanBenefit" ADD CONSTRAINT "PlanBenefit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_customerId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_customerId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_planId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_subscriptionId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_customerId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_categoryId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_subscriptionId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_professionalId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingDecline_bookingId_fkey') THEN
    ALTER TABLE "BookingDecline" ADD CONSTRAINT "BookingDecline_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingDecline_professionalId_fkey') THEN
    ALTER TABLE "BookingDecline" ADD CONSTRAINT "BookingDecline_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_bookingId_fkey') THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Dispute_bookingId_fkey') THEN
    ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_ProfessionalToServiceCategory_A_fkey') THEN
    ALTER TABLE "_ProfessionalToServiceCategory" ADD CONSTRAINT "_ProfessionalToServiceCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_ProfessionalToServiceCategory_B_fkey') THEN
    ALTER TABLE "_ProfessionalToServiceCategory" ADD CONSTRAINT "_ProfessionalToServiceCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Safe Check Constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_price_nonneg') THEN
    ALTER TABLE "Plan" ADD CONSTRAINT plan_price_nonneg CHECK ("pricePaise" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'benefit_allowance_pos') THEN
    ALTER TABLE "PlanBenefit" ADD CONSTRAINT benefit_allowance_pos CHECK ("allowance" IS NULL OR "allowance" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'benefit_period_pos') THEN
    ALTER TABLE "PlanBenefit" ADD CONSTRAINT benefit_period_pos CHECK ("periodMonths" BETWEEN 1 AND 12);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_amount_nonneg') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT payment_amount_nonneg CHECK ("amountPaise" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_rating_range') THEN
    ALTER TABLE "Review" ADD CONSTRAINT review_rating_range CHECK ("rating" BETWEEN 1 AND 5);
  END IF;
END $$;

-- Enable RLS and Lock Down PostgREST Public Access
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

-- ==========================================
-- SEED INITIAL DATA (Safe Upserts)
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
