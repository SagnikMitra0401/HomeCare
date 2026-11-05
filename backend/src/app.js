import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { prisma } from './db.js';
import { authenticate } from './auth.js';
import { errorHandler } from './errors.js';
import { publicRouter } from './routes/public.js';
import { customerRouter } from './routes/customer.js';
import { proRouter } from './routes/pro.js';
import { adminRouter } from './routes/admin.js';

export const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy
app.disable('x-powered-by');
app.use(helmet());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any Vercel preview domain if CORS_ORIGINS includes vercel.app
    if (config.corsOrigins.some((o) => o.includes('vercel.app')) && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Authorization', 'Content-Type'],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '20kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

const sensitive = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
app.use('/api/subscriptions/purchase', sensitive);
app.use('/api/pro/apply', sensitive);
app.use('/api/bookings', rateLimit({ windowMs: 60 * 1000, limit: 30 }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/me', authenticate, async (req, res) => {
  const pro = await prisma.professional.findUnique({ where: { userId: req.user.id }, select: { status: true } });
  res.json({ data: { id: req.user.id, email: req.user.email, fullName: req.user.fullName, role: req.user.role, professionalStatus: pro?.status ?? null } });
});

app.use('/api', publicRouter);
app.use('/api', customerRouter);
app.use('/api/pro', proRouter);
app.use('/api/admin', adminRouter);

app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
app.use(errorHandler);
