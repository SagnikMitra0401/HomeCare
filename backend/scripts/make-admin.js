// Usage (run by a trusted operator with DB access): npm run make-admin -- someone@example.com
// The person must have signed up and signed in once so a Profile row exists.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2];
if (!email) { console.error('Usage: npm run make-admin -- <email>'); process.exit(1); }
const prisma = new PrismaClient();
const r = await prisma.profile.updateMany({ where: { email: email.toLowerCase() }, data: { role: 'ADMIN' } });
console.log(r.count ? 'Role set to ADMIN. Enable MFA on this account in Supabase.' : 'No profile with that email (sign in once first).');
await prisma.$disconnect();
