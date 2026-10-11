import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, parse } from '../errors.js';
import { authenticate, requireRole } from '../auth.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('ADMIN'));

const audit = (event, req, extra) => console.info(JSON.stringify({ event, actor: req.user.id, ...extra }));
const idParam = z.object({ id: z.string().uuid() });

adminRouter.get('/plans', async (_req, res) => {
  res.json({ data: await prisma.plan.findMany({ orderBy: { createdAt: 'asc' }, include: { benefits: { include: { category: { select: { name: true } } } } } }) });
});

const createPlan = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(500),
  interval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  pricePaise: z.number().int().min(0).max(100000000),
  perks: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  benefits: z.array(z.object({
    categoryId: z.string().uuid(),
    allowance: z.number().int().min(1).max(1000).nullable(), // null = unlimited
    periodMonths: z.number().int().min(1).max(12),
  }).strict()).max(10).default([]),
}).strict();

adminRouter.post('/plans', async (req, res) => {
  const { benefits, ...rest } = parse(createPlan, req.body);
  const plan = await prisma.plan.create({ data: { ...rest, benefits: { create: benefits } } });
  audit('plan.created', req, { planId: plan.id });
  res.status(201).json({ data: plan });
});

// Only these fields can change. Existing subscriptions keep their purchase-time snapshot.
const patchPlan = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().min(2).max(500).optional(),
  pricePaise: z.number().int().min(0).max(100000000).optional(),
  perks: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
  active: z.boolean().optional(),
}).strict();

adminRouter.patch('/plans/:id', async (req, res) => {
  const { id } = parse(idParam, req.params);
  const data = parse(patchPlan, req.body);
  if (!Object.keys(data).length) throw new HttpError(400, 'VALIDATION_ERROR', 'No changes supplied');
  const plan = await prisma.plan.update({ where: { id }, data }).catch((e) => { if (e.code === 'P2025') throw new HttpError(404, 'NOT_FOUND', 'Plan not found'); throw e; });
  audit('plan.updated', req, { planId: id, fields: Object.keys(data) });
  res.json({ data: plan });
});

adminRouter.get('/professionals', async (req, res) => {
  const status = z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional().parse(req.query.status);
  const rows = await prisma.professional.findMany({
    where: status ? { status } : {}, orderBy: { createdAt: 'asc' }, take: 50,
    select: { id: true, status: true, city: true, createdAt: true, categories: { select: { name: true } }, user: { select: { fullName: true, email: true } } },
  });
  res.json({ data: rows });
});

adminRouter.patch('/professionals/:id', async (req, res) => {
  const { id } = parse(idParam, req.params);
  const { status } = parse(z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).strict(), req.body);
  const pro = await prisma.professional.update({ where: { id }, data: { status, decidedAt: new Date() }, select: { id: true, status: true } })
    .catch((e) => { if (e.code === 'P2025') throw new HttpError(404, 'NOT_FOUND', 'Professional not found'); throw e; });
  audit('professional.decision', req, { professionalId: id, status });
  res.json({ data: pro });
});
