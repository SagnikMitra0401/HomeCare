import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient(); // one shared client per process
