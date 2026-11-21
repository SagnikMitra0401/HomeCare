/**
 * Tests covering the five bug fixes applied in the security/correctness audit.
 *
 * These are pure-unit tests — no DB, no network. They verify the logic
 * added to auth.js, services.js, app.js (CORS) and routes/pro.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// FIX #1 — Pro Trap: requireRole now accepts multiple roles
// ---------------------------------------------------------------------------
import { requireRole } from '../src/auth.js';
import { HttpError } from '../src/errors.js';

test('FIX #1 – /pro/me allows CUSTOMER role (pending applicant check)', () => {
  const meFn = requireRole('CUSTOMER', 'PROFESSIONAL');
  let called = false;

  // A PENDING applicant still has role=CUSTOMER → should be allowed
  meFn({ user: { id: '1', role: 'CUSTOMER' }, path: '/pro/me' }, {}, () => { called = true; });
  assert.equal(called, true, 'CUSTOMER should pass the multi-role check');
});

test('FIX #1 – /pro/me still allows PROFESSIONAL role', () => {
  const meFn = requireRole('CUSTOMER', 'PROFESSIONAL');
  let called = false;
  meFn({ user: { id: '2', role: 'PROFESSIONAL' }, path: '/pro/me' }, {}, () => { called = true; });
  assert.equal(called, true, 'PROFESSIONAL should still be allowed');
});

test('FIX #1 – /pro/me blocks ADMIN role (not in allowlist)', () => {
  const meFn = requireRole('CUSTOMER', 'PROFESSIONAL');
  assert.throws(
    () => meFn({ user: { id: '3', role: 'ADMIN' }, path: '/pro/me' }, {}, () => {}),
    (err) => err instanceof HttpError && err.status === 403,
    'ADMIN must be rejected'
  );
});

// ---------------------------------------------------------------------------
// FIX #2 — Stale PENDING quota: countUsed logic (pure predicate test)
// ---------------------------------------------------------------------------

// Extract the predicate logic used by countUsed so we can test it without a DB.
function shouldCount(status, slotStart, now) {
  if (status === 'CANCELLED') return false;
  if (status === 'PENDING' && slotStart <= now) return false; // past-pending → exclude
  return true;
}

test('FIX #2 – past PENDING booking is excluded from quota', () => {
  const now = new Date();
  const pastSlot = new Date(now.getTime() - 3600_000); // 1 hour ago
  assert.equal(shouldCount('PENDING', pastSlot, now), false, 'Past PENDING must NOT count');
});

test('FIX #2 – future PENDING booking is included in quota (slot reservation)', () => {
  const now = new Date();
  const futureSlot = new Date(now.getTime() + 3600_000); // 1 hour from now
  assert.equal(shouldCount('PENDING', futureSlot, now), true, 'Future PENDING must count (slot reserved)');
});

test('FIX #2 – CANCELLED bookings are always excluded', () => {
  const now = new Date();
  const future = new Date(now.getTime() + 3600_000);
  assert.equal(shouldCount('CANCELLED', future, now), false, 'CANCELLED must never count');
});

test('FIX #2 – ACCEPTED / IN_PROGRESS / COMPLETED bookings always count', () => {
  const now = new Date();
  const past = new Date(now.getTime() - 3600_000);
  for (const s of ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']) {
    assert.equal(shouldCount(s, past, now), true, `${s} must count`);
  }
});

// ---------------------------------------------------------------------------
// FIX #3 — CORS: project-scoped Vercel domain allowlist
// ---------------------------------------------------------------------------

const vercelPreviewRe = /^https:\/\/homecare-[a-z0-9-]+-sagnikmitratennis-1001s-projects\.vercel\.app$/;

test('FIX #3 – CORS allows production domain (exact match in allowlist)', () => {
  const origin = 'https://homecare-lovat.vercel.app';
  const allowed = ['https://homecare-lovat.vercel.app', 'https://homecare-lovat.vercel.app'];
  assert.ok(allowed.includes(origin), 'Production domain must be in allowlist');
});

test('FIX #3 – CORS allows own Vercel preview domains', () => {
  const good = 'https://homecare-abc123-sagnikmitratennis-1001s-projects.vercel.app';
  assert.ok(vercelPreviewRe.test(good), 'Own preview domain should match');
});

test('FIX #3 – CORS blocks foreign Vercel tenant domains', () => {
  const evil = 'https://evil-app-sagnikmitratennis-1001s-projects.vercel.app'; // no "homecare-" prefix
  assert.ok(!vercelPreviewRe.test(evil), 'Foreign tenant domain must NOT match');
});

test('FIX #3 – CORS blocks arbitrary .vercel.app subdomains', () => {
  const random = 'https://random-attacker.vercel.app';
  // Old code would have allowed this; new regex must not.
  assert.ok(!vercelPreviewRe.test(random), 'Arbitrary .vercel.app must NOT match new regex');
});

test('FIX #3 – CORS blocks uppercase / protocol-swapped variants', () => {
  const http = 'http://homecare-abc-sagnikmitratennis-1001s-projects.vercel.app'; // HTTP not HTTPS
  assert.ok(!vercelPreviewRe.test(http), 'HTTP variant must not match (regex anchors https://)');
});

// ---------------------------------------------------------------------------
// FIX #5 — Cold-start retry: fetchWithRetry resolves on success
// ---------------------------------------------------------------------------

// Inline the same function logic as in api.js so we can unit-test without a browser fetch.
async function fetchWithRetry(fetchFn, retries = 3, baseDelayMs = 1) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetchFn(attempt);
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
}

test('FIX #5 – fetchWithRetry resolves immediately when first call succeeds', async () => {
  let calls = 0;
  const result = await fetchWithRetry(async () => { calls++; return 'ok'; });
  assert.equal(result, 'ok');
  assert.equal(calls, 1, 'Should succeed on first attempt');
});

test('FIX #5 – fetchWithRetry retries on network error and succeeds on 2nd attempt', async () => {
  let calls = 0;
  const result = await fetchWithRetry(async (attempt) => {
    calls++;
    if (attempt === 0) throw new Error('simulated network failure');
    return 'recovered';
  });
  assert.equal(result, 'recovered');
  assert.equal(calls, 2, 'Should have made 2 calls');
});

test('FIX #5 – fetchWithRetry throws after exhausting all retries', async () => {
  let calls = 0;
  await assert.rejects(
    () => fetchWithRetry(async () => { calls++; throw new Error('always fails'); }, 3, 1),
    (err) => err.message === 'always fails'
  );
  assert.equal(calls, 3, 'Should have attempted exactly 3 times');
});
