// Safe, repeatable seed of synthetic catalog data only (no users, no payments). Never deletes anything.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const categories = [
  ['cleaning', 'Home Cleaning'], ['plumbing', 'Plumbing'], ['electrical', 'Electrical'],
  ['ac-servicing', 'AC Servicing'], ['appliance', 'Appliance Maintenance'],
];
// [slug, allowance (null = unlimited), periodMonths]
const plans = [
  { name: 'Basic Monthly', description: 'Essentials for a small home.', interval: 'MONTHLY', pricePaise: 29900,
    perks: ['Discount on emergency services'], benefits: [['cleaning', 1, 1], ['plumbing', 1, 1], ['electrical', 1, 1]] },
  { name: 'Standard Monthly', description: 'Regular upkeep, billed monthly.', interval: 'MONTHLY', pricePaise: 59900, perks: [],
    benefits: [['cleaning', 2, 1], ['plumbing', null, 1], ['electrical', 2, 1], ['ac-servicing', 1, 3]] },
  { name: 'Standard Quarterly', description: 'Regular upkeep, billed quarterly.', interval: 'QUARTERLY', pricePaise: 159900, perks: [],
    benefits: [['cleaning', 2, 3], ['plumbing', null, 3], ['electrical', 2, 3], ['ac-servicing', 1, 3]] },
  { name: 'Premium Yearly', description: 'Maximum coverage for the year.', interval: 'YEARLY', pricePaise: 599900,
    perks: ['Priority emergency support', 'Dedicated service manager'], benefits: [['cleaning', null, 12], ['appliance', null, 12]] },
];

const bySlug = {};
for (const [slug, name] of categories) bySlug[slug] = await prisma.serviceCategory.upsert({ where: { slug }, update: {}, create: { slug, name } });
for (const p of plans) {
  const exists = await prisma.plan.findUnique({ where: { name: p.name } });
  if (exists) continue; // never overwrite admin-edited plans
  await prisma.plan.create({
    data: {
      name: p.name, description: p.description, interval: p.interval, pricePaise: p.pricePaise, perks: p.perks,
      benefits: { create: p.benefits.map(([slug, allowance, periodMonths]) => ({ categoryId: bySlug[slug].id, allowance, periodMonths })) },
    },
  });
}
console.log('Seed complete');
await prisma.$disconnect();
