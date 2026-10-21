import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, parse, page } from '../errors.js';
import { authenticate, requireRole, requireApprovedPro } from '../auth.js';
import { canTransition } from '../rules.js';

export const proRouter = Router();
proRouter.use(authenticate);

const applySchema = z.object({
  city: z.string().trim().min(2).max(80),
  categoryIds: z.array(z.string().uuid()).min(1).max(10),
}).strict();

// A signed-in customer applies; role changes to PROFESSIONAL but work stays blocked until an admin approves.
proRouter.post('/apply', requireRole('CUSTOMER'), async (req, res) => {
  const body = parse(applySchema, req.body);
  const ids = [...new Set(body.categoryIds)];
  const found = await prisma.serviceCategory.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new HttpError(400, 'VALIDATION_ERROR', 'Unknown service category');
  await prisma.$transaction([
    prisma.professional.create({ data: { userId: req.user.id, city: body.city, categories: { connect: ids.map((id) => ({ id })) } } }),
    prisma.profile.update({ where: { id: req.user.id }, data: { role: 'PROFESSIONAL' } }),
  ]);
  res.status(201).json({ data: { status: 'PENDING' } });
});

proRouter.get('/me', requireRole('PROFESSIONAL'), async (req, res) => {
  const pro = await prisma.professional.findUnique({
    where: { userId: req.user.id },
    select: { status: true, city: true, categories: { select: { name: true } } },
  });
  res.json({ data: pro });
});

const work = [requireRole('PROFESSIONAL'), requireApprovedPro];
const idParam = z.object({ id: z.string().uuid() });

const eligible = (pro) => ({
  status: 'PENDING', professionalId: null, slotStart: { gt: new Date() },
  categoryId: { in: pro.categoryIds }, city: { equals: pro.city, mode: 'insensitive' },
  declines: { none: { professionalId: pro.id } },
});

// Customer identity and full address are NOT shown until the job is accepted.
proRouter.get('/requests', ...work, async (req, res) => {
  const rows = await prisma.booking.findMany({
    where: eligible(req.pro), orderBy: { slotStart: 'asc' }, ...page(req.query),
    select: { id: true, slotStart: true, city: true, category: { select: { name: true } } },
  });
  res.json({ data: rows });
});

proRouter.post('/requests/:id/accept', ...work, async (req, res) => {
  const { id } = parse(idParam, req.params);
  const r = await prisma.booking.updateMany({
    where: { id, ...eligible(req.pro) }, data: { professionalId: req.pro.id, status: 'ACCEPTED' },
  }); // atomic: first accepter wins; slot clash for this pro raises P2002 -> 409
  if (!r.count) throw new HttpError(409, 'UNAVAILABLE', 'Request is no longer available');
  res.json({ data: { id, status: 'ACCEPTED' } });
});

proRouter.post('/requests/:id/decline', ...work, async (req, res) => {
  const { id } = parse(idParam, req.params);
  if (!(await prisma.booking.count({ where: { id, ...eligible(req.pro) } }))) throw new HttpError(404, 'NOT_FOUND', 'Request not found');
  await prisma.bookingDecline.upsert({
    where: { bookingId_professionalId: { bookingId: id, professionalId: req.pro.id } }, update: {}, create: { bookingId: id, professionalId: req.pro.id },
  });
  res.json({ data: { id, declined: true } });
});

proRouter.get('/jobs', ...work, async (req, res) => {
  const rows = await prisma.booking.findMany({
    where: { professionalId: req.pro.id }, orderBy: { slotStart: 'desc' }, ...page(req.query),
    select: {
      id: true, status: true, slotStart: true, address: true, city: true, notes: true,
      category: { select: { name: true } }, customer: { select: { fullName: true } },
      review: { select: { rating: true, comment: true } },
    },
  });
  res.json({ data: rows });
});

const statusSchema = z.object({ status: z.enum(['IN_PROGRESS', 'COMPLETED']) }).strict();

proRouter.post('/jobs/:id/status', ...work, async (req, res) => {
  const { id } = parse(idParam, req.params);
  const { status } = parse(statusSchema, req.body);
  const job = await prisma.booking.findFirst({ where: { id, professionalId: req.pro.id } });
  if (!job) throw new HttpError(404, 'NOT_FOUND', 'Job not found');
  if (!canTransition(job.status, status, 'PROFESSIONAL')) throw new HttpError(409, 'BAD_TRANSITION', `Cannot move ${job.status} to ${status}`);
  const r = await prisma.booking.updateMany({ where: { id, professionalId: req.pro.id, status: job.status }, data: { status } });
  if (!r.count) throw new HttpError(409, 'BAD_TRANSITION', 'Job changed; refresh and retry');
  res.json({ data: { id, status } });
});

proRouter.get('/earnings', ...work, async (req, res) => {
  // Payout calculation: Each completed job pays a simulated flat rate of ₹400 (40,000 paise).
  const completedJobs = await prisma.booking.count({
    where: { professionalId: req.pro.id, status: 'COMPLETED' },
  });
  const inProgressJobs = await prisma.booking.count({
    where: { professionalId: req.pro.id, status: 'IN_PROGRESS' },
  });
  const acceptedJobs = await prisma.booking.count({
    where: { professionalId: req.pro.id, status: 'ACCEPTED' },
  });

  const reviews = await prisma.review.aggregate({
    where: { booking: { professionalId: req.pro.id } },
    _avg: { rating: true },
    _count: true,
  });

  const ratePerJobPaise = 40000; // ₹400 simulated payout per service completion
  const totalEarningsPaise = completedJobs * ratePerJobPaise;

  res.json({
    data: {
      ratePerJobPaise,
      completedJobs,
      inProgressJobs,
      acceptedJobs,
      totalEarningsPaise,
      averageRating: reviews._avg.rating ? Number(reviews._avg.rating.toFixed(2)) : null,
      reviewCount: reviews._count,
    },
  });
});

