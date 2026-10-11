// Business logic that touches several tables. Routes stay thin.
import { prisma } from './db.js';
import { config } from './config.js';
import { HttpError } from './errors.js';
import { INTERVAL_MONTHS, addMonths, benefitWindow, slotError } from './rules.js';

const activeSubWhere = (customerId) => ({ customerId, status: 'ACTIVE', endsAt: { gt: new Date() } });

async function paymentResult(payment) {
  const subscription = payment.subscriptionId
    ? await prisma.subscription.findUnique({ where: { id: payment.subscriptionId }, select: subSelect })
    : null;
  return { payment: publicPayment(payment), subscription };
}
const subSelect = { id: true, planName: true, status: true, pricePaise: true, interval: true, startsAt: true, endsAt: true };
export const publicPayment = (p) => ({
  id: p.id, amountPaise: p.amountPaise, currency: p.currency, status: p.status,
  simulated: p.simulated, failureReason: p.failureReason, createdAt: p.createdAt,
});

// Simulated purchase. Safe to retry with the same idempotencyKey.
export async function purchasePlan(user, { planId, idempotencyKey, scenario }) {
  const find = () => prisma.payment.findUnique({ where: { idempotencyKey } });
  const existing = await find();
  if (existing) {
    if (existing.customerId !== user.id) throw new HttpError(409, 'CONFLICT', 'Key already used');
    return { ...(await paymentResult(existing)), replayed: true };
  }
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id = ${user.id}::uuid FOR UPDATE`; // serialize per customer
      const plan = await tx.plan.findFirst({
        where: { id: planId, active: true },
        include: { benefits: { include: { category: true } } },
      });
      if (!plan) throw new HttpError(404, 'NOT_FOUND', 'Plan not found');
      if (await tx.subscription.findFirst({ where: activeSubWhere(user.id) }))
        throw new HttpError(409, 'ALREADY_SUBSCRIBED', 'You already have an active subscription');

      // Outcome is decided by the server. Decline test scenario only honoured when explicitly enabled.
      const succeeds = !(config.allowSimulatedFailure && scenario === 'DECLINE');
      const payment = await tx.payment.create({
        data: {
          customerId: user.id, planId: plan.id, idempotencyKey, amountPaise: plan.pricePaise,
          status: succeeds ? 'SUCCEEDED' : 'FAILED', failureReason: succeeds ? null : 'Simulated decline (test scenario)',
        },
      });
      if (!succeeds) return { payment: publicPayment(payment), subscription: null };

      const startsAt = new Date();
      const subscription = await tx.subscription.create({
        data: {
          customerId: user.id, planId: plan.id, planName: plan.name, pricePaise: plan.pricePaise,
          interval: plan.interval, startsAt, endsAt: addMonths(startsAt, INTERVAL_MONTHS[plan.interval]),
          benefitsSnapshot: plan.benefits.map((b) => ({
            categoryId: b.categoryId, categoryName: b.category.name, allowance: b.allowance, periodMonths: b.periodMonths,
          })),
        },
        select: subSelect,
      });
      const linked = await tx.payment.update({ where: { id: payment.id }, data: { subscriptionId: subscription.id } });
      return { payment: publicPayment(linked), subscription };
    });
  } catch (e) {
    if (e?.code === 'P2002') {
      const again = await find(); // concurrent retry with same key
      if (again && again.customerId === user.id) return { ...(await paymentResult(again)), replayed: true };
    }
    throw e;
  }
}

const countUsed = (db, sub, b, at) => {
  const [from, to] = benefitWindow(sub.startsAt, b.periodMonths, at);
  return db.booking.count({
    where: { subscriptionId: sub.id, categoryId: b.categoryId, status: { not: 'CANCELLED' }, slotStart: { gte: from, lt: to } },
  });
};

export async function currentSubscription(customerId) {
  const sub = await prisma.subscription.findFirst({ where: activeSubWhere(customerId), orderBy: { endsAt: 'desc' } });
  if (!sub) return null;
  const benefits = [];
  for (const b of sub.benefitsSnapshot) {
    benefits.push({ categoryName: b.categoryName, allowance: b.allowance, periodMonths: b.periodMonths, usedThisPeriod: await countUsed(prisma, sub, b, new Date()) });
  }
  return {
    id: sub.id, planName: sub.planName, status: sub.status, pricePaise: sub.pricePaise,
    interval: sub.interval, startsAt: sub.startsAt, endsAt: sub.endsAt, benefits,
  };
}

// Entitlement is consumed at booking time and released on cancellation (see docs/ASSUMPTIONS.md).
export async function createBooking(user, input) {
  const slot = new Date(input.slotStart);
  const err = slotError(slot);
  if (err) throw new HttpError(400, 'INVALID_SLOT', err);
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`
      SELECT id FROM "Subscription"
      WHERE "customerId" = ${user.id}::uuid AND status = 'ACTIVE' AND "endsAt" > now()
      ORDER BY "endsAt" DESC LIMIT 1 FOR UPDATE`; // serializes concurrent bookings on one subscription
    if (!locked.length) throw new HttpError(403, 'NO_SUBSCRIPTION', 'An active subscription is required to book');
    const sub = await tx.subscription.findUnique({ where: { id: locked[0].id } });
    if (slot >= sub.endsAt) throw new HttpError(400, 'INVALID_SLOT', 'Slot is after your subscription ends');
    const benefit = sub.benefitsSnapshot.find((b) => b.categoryId === input.categoryId);
    if (!benefit) throw new HttpError(403, 'NOT_COVERED', 'Your plan does not include this service');
    if (benefit.allowance !== null && (await countUsed(tx, sub, benefit, slot)) >= benefit.allowance)
      throw new HttpError(409, 'ALLOWANCE_USED', 'No remaining allowance for this service in that period');
    if (await tx.booking.count({ where: { customerId: user.id, slotStart: slot, status: { not: 'CANCELLED' } } }))
      throw new HttpError(409, 'SLOT_TAKEN', 'You already have a booking at that time');
    return tx.booking.create({
      data: { customerId: user.id, subscriptionId: sub.id, categoryId: input.categoryId, slotStart: slot, address: input.address, city: input.city, notes: input.notes ?? null },
      select: { id: true, status: true, slotStart: true },
    });
  });
}
