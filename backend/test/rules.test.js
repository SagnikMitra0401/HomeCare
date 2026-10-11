import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, benefitWindow, slotError, addMonths } from '../src/rules.js';

test('only permitted actors can make transitions', () => {
  assert.equal(canTransition('PENDING', 'ACCEPTED', 'PROFESSIONAL'), true);
  assert.equal(canTransition('PENDING', 'ACCEPTED', 'CUSTOMER'), false);
  assert.equal(canTransition('PENDING', 'COMPLETED', 'PROFESSIONAL'), false);
  assert.equal(canTransition('COMPLETED', 'CANCELLED', 'CUSTOMER'), false);
  assert.equal(canTransition('IN_PROGRESS', 'CANCELLED', 'CUSTOMER'), false);
});
test('benefit window is anchored to subscription start', () => {
  const start = new Date('2026-01-10T00:00:00Z');
  const [a, b] = benefitWindow(start, 3, new Date('2026-05-01T00:00:00Z'));
  assert.equal(a.toISOString(), addMonths(start, 3).toISOString());
  assert.equal(b.toISOString(), addMonths(start, 6).toISOString());
});
test('slot validation', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.equal(slotError(new Date('2025-12-31T10:00:00Z'), now), 'Slot must be in the future');
  assert.notEqual(slotError(new Date('2026-01-02T10:15:00Z'), now), null);
  assert.equal(slotError(new Date('2026-01-02T10:00:00Z'), now), null);
  assert.notEqual(slotError(new Date('2026-06-02T10:00:00Z'), now), null);
});
