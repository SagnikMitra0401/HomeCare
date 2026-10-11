import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../src/auth.js';
import { HttpError, parse, page } from '../src/errors.js';
import { z } from 'zod';

test('requireRole middleware blocks non-matching roles with 403', () => {
  const customerOnly = requireRole('CUSTOMER');
  const reqPro = { user: { id: 'user-1', role: 'PROFESSIONAL' }, path: '/test' };
  const reqAdmin = { user: { id: 'user-2', role: 'ADMIN' }, path: '/test' };
  const reqCust = { user: { id: 'user-3', role: 'CUSTOMER' }, path: '/test' };

  let nextCalled = false;
  const next = () => { nextCalled = true; };

  assert.throws(() => customerOnly(reqPro, {}, next), (err) => err instanceof HttpError && err.status === 403 && err.code === 'FORBIDDEN');
  assert.equal(nextCalled, false);

  assert.throws(() => customerOnly(reqAdmin, {}, next), (err) => err instanceof HttpError && err.status === 403 && err.code === 'FORBIDDEN');
  assert.equal(nextCalled, false);

  customerOnly(reqCust, {}, next);
  assert.equal(nextCalled, true);
});

test('requireRole allows multiple allowed roles', () => {
  const staffOrAdmin = requireRole('PROFESSIONAL', 'ADMIN');
  let called = false;
  staffOrAdmin({ user: { id: '1', role: 'ADMIN' }, path: '/test' }, {}, () => { called = true; });
  assert.equal(called, true);

  called = false;
  staffOrAdmin({ user: { id: '2', role: 'PROFESSIONAL' }, path: '/test' }, {}, () => { called = true; });
  assert.equal(called, true);

  assert.throws(
    () => staffOrAdmin({ user: { id: '3', role: 'CUSTOMER' }, path: '/test' }, {}, () => {}),
    (err) => err instanceof HttpError && err.status === 403
  );
});

test('pagination helper caps bounds safely', () => {
  assert.deepEqual(page({ limit: '10', offset: '5' }), { take: 10, skip: 5 });
  assert.deepEqual(page({ limit: '100', offset: '-5' }), { take: 50, skip: 0 }); // max 50, min 0
  assert.deepEqual(page({ limit: 'abc', offset: 'xyz' }), { take: 20, skip: 0 }); // default fallback
});

test('schema parser throws HttpError 400 with VALIDATION_ERROR on malformed input', () => {
  const schema = z.object({ city: z.string().min(2) }).strict();
  assert.throws(
    () => parse(schema, { city: 'A' }),
    (err) => err instanceof HttpError && err.status === 400 && err.code === 'VALIDATION_ERROR'
  );
  assert.throws(
    () => parse(schema, { city: 'Mumbai', extraKey: 123 }),
    (err) => err instanceof HttpError && err.status === 400 && err.code === 'VALIDATION_ERROR'
  );
  const valid = parse(schema, { city: 'Mumbai' });
  assert.equal(valid.city, 'Mumbai');
});
