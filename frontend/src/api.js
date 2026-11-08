import { supabase } from './supabase.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function api(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (!BASE && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      throw new Error('Backend API URL is not configured. Set VITE_API_URL on Vercel.');
    }
    throw new Error('Network error. Check your connection or API server status.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || `Request failed (${res.status})`);
  return json.data;
}

export const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
export const when = (iso) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const statusBadge = (s) => ({
  ACTIVE: 'badge-success', PENDING: 'badge-warning', ACCEPTED: 'badge-info',
  IN_PROGRESS: 'badge-brand', COMPLETED: 'badge-success', CANCELLED: 'badge-danger',
  EXPIRED: 'badge-danger', APPROVED: 'badge-success', REJECTED: 'badge-danger',
  SUCCEEDED: 'badge-success', FAILED: 'badge-danger', OPEN: 'badge-warning',
  RESOLVED: 'badge-success', REFUNDED: 'badge-brand',
})[s] || '';

export const statusBorder = (s) => ({
  PENDING: 'status-pending', ACCEPTED: 'status-accepted',
  IN_PROGRESS: 'status-in-progress', COMPLETED: 'status-completed',
  CANCELLED: 'status-cancelled',
})[s] || '';

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const CAT_ICONS = { Cleaning: '✨', Plumbing: '🔧', Electrical: '⚡', 'AC Servicing': '❄️', Appliance: '⚙️' };
const FALLBACK_ICONS = ['🏠', '🔨', '🛠️', '📐', '🏗️'];
export const catIcon = (name, i) => CAT_ICONS[name] || FALLBACK_ICONS[i % 5];
