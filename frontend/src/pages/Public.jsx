import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks.js';
import { rupees } from '../api.js';
import { useAuth } from '../auth.jsx';
import { supabase } from '../supabase.js';

export const State = ({ loading, error, empty, reload }) => {
  if (loading) return <p role="status">Loading…</p>;
  if (error) return <p className="error" role="alert">{error} {reload && <button onClick={reload}>Retry</button>}</p>;
  if (empty) return <p>Nothing here yet.</p>;
  return null;
};

const allowanceText = (b) =>
  `${b.category.name}: ${b.allowance === null ? 'unlimited' : b.allowance} per ${b.periodMonths === 1 ? 'month' : `${b.periodMonths} months`}`;

export function Plans() {
  const { data, loading, error, reload } = useApi('/api/plans');
  const { me } = useAuth();
  return (
    <section>
      <h1>Subscription plans</h1>
      <p className="note">Payments in this app are simulated test transactions. No real money is charged.</p>
      <State loading={loading} error={error} empty={data && !data.length} reload={reload} />
      <div className="grid">
        {data?.map((p) => (
          <article className="card" key={p.id}>
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <p className="price">{rupees(p.pricePaise)} <small>/ {p.interval.toLowerCase()}</small></p>
            <ul>
              {p.benefits.map((b, i) => <li key={i}>{allowanceText(b)}</li>)}
              {p.perks.map((x) => <li key={x}>{x}</li>)}
            </ul>
            {me?.role === 'CUSTOMER' && <Link className="button" to={`/checkout/${p.id}`}>Choose plan</Link>}
            {!me && <Link className="button" to="/login">Sign in to subscribe</Link>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data, error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      : await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName } } });
    setBusy(false);
    if (error) return setMsg({ error: true, text: error.message });
    if (data.session) return nav('/dashboard');
    setMsg({ text: 'Account created. Confirm your email if prompted, then sign in.' });
  }

  return (
    <section className="narrow">
      <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <form onSubmit={submit}>
        {mode === 'register' && (<label>Full name<input required maxLength={100} value={form.fullName} onChange={set('fullName')} /></label>)}
        <label>Email<input type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={8} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
      </form>
      {msg && <p className={msg.error ? 'error' : 'ok'} role="alert">{msg.text}</p>}
      <p><button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
      </button></p>
      <p className="note">New accounts are always customers. Professionals apply from the dashboard after signing up.</p>
    </section>
  );
}
