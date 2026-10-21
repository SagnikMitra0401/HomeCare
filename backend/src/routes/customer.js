import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, parse, page } from '../errors.js';
import { authenticate, requireRole } from '../auth.js';
import { canTransition } from '../rules.js';
import { purchasePlan, currentSubscription, createBooking, publicPayment } from '../services.js';

export const customerRouter = Router();
customerRouter.use(authenticate, requireRole('CUSTOMER'));

const purchaseSchema = z.object({
  planId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  scenario: z.enum(['APPROVE', 'DECLINE']).optional(),
}).strict();

customerRouter.post('/subscriptions/purchase', async (req, res) => {
  const body = parse(purchaseSchema, req.body);
  const result = await purchasePlan(req.user, body);
  res.status(result.replayed ? 200 : 201).json({ data: result });
});

customerRouter.get('/subscriptions/current', async (req, res) => {
  res.json({ data: await currentSubscription(req.user.id) });
});

customerRouter.post('/subscriptions/cancel', async (req, res) => {
  const sub = await prisma.subscription.findFirst({
    where: { customerId: req.user.id, status: 'ACTIVE', endsAt: { gt: new Date() } },
  });
  if (!sub) throw new HttpError(404, 'NOT_FOUND', 'No active subscription found to cancel');

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'CANCELLED' },
    select: { id: true, planName: true, status: true, endsAt: true },
  });
  res.json({ data: updated });
});

customerRouter.get('/payments', async (req, res) => {
  const rows = await prisma.payment.findMany({
    where: { customerId: req.user.id }, orderBy: { createdAt: 'desc' }, ...page(req.query),
    include: { plan: { select: { name: true } } },
  });
  res.json({ data: rows.map((p) => ({ ...publicPayment(p), planName: p.plan.name })) });
});

const bookingSchema = z.object({
  categoryId: z.string().uuid(),
  slotStart: z.string().datetime(),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(500).optional(),
}).strict();

customerRouter.post('/bookings', async (req, res) => {
  res.status(201).json({ data: await createBooking(req.user, parse(bookingSchema, req.body)) });
});

customerRouter.get('/bookings', async (req, res) => {
  const rows = await prisma.booking.findMany({
    where: { customerId: req.user.id }, orderBy: { slotStart: 'desc' }, ...page(req.query),
    select: {
      id: true, status: true, slotStart: true, city: true, address: true, notes: true,
      category: { select: { name: true } },
      professional: { select: { user: { select: { fullName: true } } } }, // name only, no contact details
      review: { select: { rating: true, comment: true } },
      dispute: { select: { id: true, reason: true, status: true, resolutionNote: true } },
    },
  });
  res.json({ data: rows });
});


const idParam = z.object({ id: z.string().uuid() });

customerRouter.post('/bookings/:id/cancel', async (req, res) => {
  const { id } = parse(idParam, req.params);
  const b = await prisma.booking.findFirst({ where: { id, customerId: req.user.id } });
  if (!b) throw new HttpError(404, 'NOT_FOUND', 'Booking not found');
  if (!canTransition(b.status, 'CANCELLED', 'CUSTOMER')) throw new HttpError(409, 'BAD_TRANSITION', `Cannot cancel a ${b.status} booking`);
  // professionalId cleared so the slot is released; guarded on current status to stay race-safe.
  const r = await prisma.booking.updateMany({ where: { id, customerId: req.user.id, status: b.status }, data: { status: 'CANCELLED', professionalId: null } });
  if (!r.count) throw new HttpError(409, 'BAD_TRANSITION', 'Booking changed; refresh and retry');
  res.json({ data: { id, status: 'CANCELLED' } });
});

const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() }).strict();

customerRouter.post('/bookings/:id/review', async (req, res) => {
  const { id } = parse(idParam, req.params);
  const body = parse(reviewSchema, req.body);
  const b = await prisma.booking.findFirst({ where: { id, customerId: req.user.id } });
  if (!b) throw new HttpError(404, 'NOT_FOUND', 'Booking not found');
  if (b.status !== 'COMPLETED') throw new HttpError(409, 'NOT_COMPLETED', 'Only completed services can be reviewed');
  const review = await prisma.review.create({ data: { bookingId: id, rating: body.rating, comment: body.comment ?? null }, select: { rating: true, comment: true } }); // unique bookingId => one review
  res.status(201).json({ data: review });
});

const disputeSchema = z.object({ reason: z.string().trim().min(5).max(1000) }).strict();

customerRouter.post('/bookings/:id/dispute', async (req, res) => {
  const { id } = parse(idParam, req.params);
  const body = parse(disputeSchema, req.body);
  const b = await prisma.booking.findFirst({ where: { id, customerId: req.user.id } });
  if (!b) throw new HttpError(404, 'NOT_FOUND', 'Booking not found');
  if (!['COMPLETED', 'CANCELLED'].includes(b.status)) {
    throw new HttpError(409, 'BAD_REQUEST', 'Disputes can only be raised for completed or cancelled services');
  }
  const dispute = await prisma.dispute.create({
    data: { bookingId: id, customerId: req.user.id, reason: body.reason },
    select: { id: true, reason: true, status: true, createdAt: true },
  });
  res.status(201).json({ data: dispute });
});

