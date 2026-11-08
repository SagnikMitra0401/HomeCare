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
export const when = (iso) => new Date(iso).toLocaleString();
