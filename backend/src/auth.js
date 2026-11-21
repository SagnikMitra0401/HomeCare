import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from './config.js';
import { prisma } from './db.js';
import { HttpError } from './errors.js';

const issuer = `${config.supabaseUrl}/auth/v1`;
const secret = config.jwtSecret ? new TextEncoder().encode(config.jwtSecret) : null;
const jwks = secret ? null : createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

// Verifies signature, issuer, audience and expiry. Role comes from our DB, never from the token.
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in required');
  let payload;
  try {
    ({ payload } = await jwtVerify(header.slice(7), secret || jwks, {
      issuer,
      audience: 'authenticated',
      algorithms: secret ? ['HS256'] : ['ES256', 'RS256', 'EdDSA'],
    }));
  } catch {
    throw new HttpError(401, 'INVALID_TOKEN', 'Session invalid or expired');
  }
  if (!payload.sub || !payload.email) throw new HttpError(401, 'INVALID_TOKEN', 'Session invalid or expired');
  const name = payload.user_metadata?.full_name;
  // Use findUnique + conditional create instead of upsert(update:{}) to avoid a write on every request.
  let profile = await prisma.profile.findUnique({ where: { id: payload.sub } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: { id: payload.sub, email: payload.email, fullName: typeof name === 'string' ? name.slice(0, 100) : null, role: 'CUSTOMER' },
    });
  } else if (typeof name === 'string' && name.length > 0 && profile.fullName !== name) {
    // Keep the display name in sync when the user updates it in Supabase Auth.
    profile = await prisma.profile.update({ where: { id: payload.sub }, data: { fullName: name.slice(0, 100) } });
  }
  if (profile.suspended) throw new HttpError(403, 'SUSPENDED', 'Account suspended');
  req.user = profile;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    console.warn(JSON.stringify({ event: 'authz.denied', userId: req.user.id, role: req.user.role, path: req.path }));
    throw new HttpError(403, 'FORBIDDEN', 'Not allowed');
  }
  next();
};

// Professional role AND approved status are both required for work endpoints.
export async function requireApprovedPro(req, _res, next) {
  const pro = await prisma.professional.findUnique({
    where: { userId: req.user.id },
    include: { categories: { select: { id: true } } },
  });
  if (!pro || pro.status !== 'APPROVED') throw new HttpError(403, 'PRO_NOT_APPROVED', 'Your professional account is not approved');
  req.pro = { id: pro.id, city: pro.city, categoryIds: pro.categories.map((c) => c.id) };
  next();
}
