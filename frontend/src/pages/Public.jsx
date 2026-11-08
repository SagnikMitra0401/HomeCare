import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks.js';
import { rupees, catIcon } from '../api.js';
import { useAuth } from '../auth.jsx';
import { supabase } from '../supabase.js';

/* ========== SKELETON BUILDING BLOCKS ========== */

export function SkeletonCard() {
  return (
    <div className="card skeleton-card-inner">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text skeleton-text-short" />
      <div className="skeleton skeleton-price" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text skeleton-text-xs" />
      <div className="skeleton skeleton-button" />
    </div>
  );
}

export function SkeletonGrid({ count = 3 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card">
      <div className="skeleton skeleton-circle" />
      <div className="skeleton skeleton-price" />
      <div className="skeleton skeleton-text skeleton-text-short" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 3 }) {
  return (
    <div className="grid grid-stats">
      {Array.from({ length: count }, (_, i) => <SkeletonStat key={i} />)}
    </div>
  );
}

export function SkeletonTable({ rows = 3 }) {
  return (
    <div className="scroll">
      <table>
        <thead><tr><th><div className="skeleton skeleton-text" style={{ width: 60 }} /></th><th><div className="skeleton skeleton-text" style={{ width: 80 }} /></th><th><div className="skeleton skeleton-text" style={{ width: 60 }} /></th><th><div className="skeleton skeleton-text" style={{ width: 50 }} /></th></tr></thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}><td><div className="skeleton skeleton-text" /></td><td><div className="skeleton skeleton-text" /></td><td><div className="skeleton skeleton-text skeleton-text-short" /></td><td><div className="skeleton skeleton-text skeleton-text-xs" /></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ========== STATE COMPONENT ========== */

export const State = ({ loading, error, empty, reload, skeleton }) => {
  if (loading) return skeleton || <SkeletonGrid />;
  if (error) return (
    <div className="alert alert-danger">
      <span>{error}</span>
      {reload && <button className="button-ghost" onClick={reload} style={{ marginLeft: 'auto' }}>Retry</button>}
    </div>
  );
  if (empty) return (
    <div className="empty-state">
      <div className="empty-state-icon">📋</div>
      <p>Nothing here yet.</p>
    </div>
  );
  return null;
};

/* ========== PLANS PAGE ========== */

const allowanceText = (b) =>
  `${b.category.name}: ${b.allowance === null ? 'unlimited' : b.allowance} per ${b.periodMonths === 1 ? 'month' : `${b.periodMonths} months`}`;

export function Plans() {
  const { data, loading, error, reload } = useApi('/api/plans');
  const { me } = useAuth();
  return (
    <section>
      <div className="hero">
        <h1>Home Maintenance, <span>Simplified</span></h1>
        <p>Choose a subscription plan and get scheduled cleaning, plumbing, electrical, and AC services at predictable monthly prices.</p>
        {!me && <Link to="/login" className="button button-lg">Get Started</Link>}
      </div>

      <State loading={loading} error={error} empty={data && !data.length} reload={reload}
        skeleton={<SkeletonGrid count={4} />} />

      {data?.length > 0 && (
        <div className="grid">
          {data.map((p, idx) => {
            const isPopular = p.name.toLowerCase().includes('standard');
            return (
              <article className={`card card-hover card-accent${isPopular ? ' card-featured' : ''}`} key={p.id}>
                <h2>{p.name}</h2>
                <p className="note">{p.description}</p>
                <p className="price">{rupees(p.pricePaise)} <small>/ {p.interval.toLowerCase()}</small></p>
                <ul className="benefit-list">
                  {p.benefits.map((b, i) => <li key={i}>{allowanceText(b)}</li>)}
                  {p.perks.map((x) => <li key={x}>{x}</li>)}
                </ul>
                <div className="actions">
                  {me?.role === 'CUSTOMER' && <Link className="button button-full" to={`/checkout/${p.id}`}>Choose Plan</Link>}
                  {!me && <Link className="button button-full" to="/login">Sign in to Subscribe</Link>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
        All payments in this application are simulated test transactions. No real money is charged.
      </div>
    </section>
  );
}

/* ========== SERVICES PAGE ========== */

export function Services() {
  const { data, loading, error, reload } = useApi('/api/categories');
  return (
    <section>
      <div className="page-header">
        <h1>Our Services</h1>
        <p>Professional home maintenance services included in subscription plans. Compare plans to get scheduled visits and priority emergency repairs.</p>
      </div>

      <State loading={loading} error={error} empty={data && !data.length} reload={reload}
        skeleton={<SkeletonGrid count={5} />} />

      {data?.length > 0 && (
        <div className="grid">
          {data.map((cat, i) => (
            <article className="card card-hover" key={cat.id}>
              <div className={`cat-icon cat-bg-${i % 5}`}>
                {catIcon(cat.name, i)}
              </div>
              <h2>{cat.name}</h2>
              <p className="note">Available across supported cities. Covered under Basic, Standard, and Premium subscription plans.</p>
              <div style={{ marginTop: '1rem' }}>
                <Link className="button-secondary button" to="/">View Plans</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ========== LOGIN / REGISTER ========== */

export function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { session } = useAuth();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  React.useEffect(() => {
    if (session) nav('/dashboard', { replace: true });
  }, [session, nav]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data, error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      : await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.fullName },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
    setBusy(false);
    if (error) return setMsg({ error: true, text: error.message });
    if (data.session) return nav('/dashboard');
    setMsg({ text: 'Account created! If email confirmation is enabled, check your email to confirm, then sign in.' });
  }

  return (
    <section className="narrow">
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="note" style={{ margin: 0 }}>
            {mode === 'login' ? 'Sign in to manage your home care services' : 'Start your home maintenance journey'}
          </p>
        </div>

        <div className="tabs">
          <button className={`tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')} type="button">Sign In</button>
          <button className={`tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')} type="button">Register</button>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>Full name
              <input required maxLength={100} value={form.fullName} onChange={set('fullName')} placeholder="Your full name" />
            </label>
          )}
          <label>Email
            <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>Password
            <input type="password" required minLength={8} value={form.password} onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Min. 8 characters" />
          </label>
          <button className="button-full button-lg" disabled={busy} style={{ marginTop: '0.5rem' }}>
            {busy && <span className="spinner" />}
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {msg && (
          <div className={`alert ${msg.error ? 'alert-danger' : 'alert-success'}`} style={{ marginTop: '1rem', marginBottom: 0 }} role="alert">
            {msg.text}
          </div>
        )}
      </div>
      <p className="note" style={{ textAlign: 'center', marginTop: '1rem' }}>
        New accounts are always customers. Professionals apply from the dashboard after signing up.
      </p>
    </section>
  );
}
