import { Router } from 'express';
import { prisma } from '../db.js';

export const publicRouter = Router();

publicRouter.get('/plans', async (_req, res) => {
  const data = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { pricePaise: 'asc' },
    select: {
      id: true, name: true, description: true, interval: true, pricePaise: true, perks: true,
      benefits: { select: { allowance: true, periodMonths: true, category: { select: { name: true } } } },
    },
  });
  res.json({ data });
});

publicRouter.get('/categories', async (_req, res) => {
  res.json({ data: await prisma.serviceCategory.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: 'asc' } }) });
});
