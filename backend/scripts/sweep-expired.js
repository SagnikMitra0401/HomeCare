// Sweep expired subscriptions: can be run as a cron job or scheduled task.
// Usage: node scripts/sweep-expired.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date();

try {
  const result = await prisma.subscription.updateMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lte: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });
  console.log(`[${now.toISOString()}] Subscription expiry sweep completed: ${result.count} subscriptions marked EXPIRED.`);
} catch (err) {
  console.error('Sweep error:', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
