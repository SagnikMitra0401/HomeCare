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
