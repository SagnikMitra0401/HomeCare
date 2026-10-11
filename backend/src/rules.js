// Pure business rules (no DB / env access) so they are easy to unit test.
export const INTERVAL_MONTHS = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

// Who may move a booking from one status to another. Single source of truth.
export const TRANSITIONS = {
  PENDING: { CUSTOMER: ['CANCELLED'], PROFESSIONAL: ['ACCEPTED'] },
  ACCEPTED: { CUSTOMER: ['CANCELLED'], PROFESSIONAL: ['IN_PROGRESS'] },
  IN_PROGRESS: { PROFESSIONAL: ['COMPLETED'] },
  COMPLETED: {},
  CANCELLED: {},
};
export const canTransition = (from, to, actor) => !!TRANSITIONS[from]?.[actor]?.includes(to);

export function addMonths(date, n) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

// Benefit window [from, to) containing `at`, anchored at subscription start.
export function benefitWindow(startsAt, periodMonths, at) {
  let k = 0;
  while (k < 120 && addMonths(startsAt, (k + 1) * periodMonths) <= at) k++;
  return [addMonths(startsAt, k * periodMonths), addMonths(startsAt, (k + 1) * periodMonths)];
}

// Slots: future, on the hour/half hour, within 90 days.
export function slotError(slot, now = new Date()) {
  if (Number.isNaN(slot.getTime())) return 'Invalid slot';
  if (slot <= now) return 'Slot must be in the future';
  if (slot.getUTCMinutes() % 30 !== 0 || slot.getUTCSeconds() !== 0 || slot.getUTCMilliseconds() !== 0)
    return 'Slot must start on the hour or half hour';
  if (slot > new Date(now.getTime() + 90 * 86400000)) return 'Slot is more than 90 days ahead';
  return null;
}
