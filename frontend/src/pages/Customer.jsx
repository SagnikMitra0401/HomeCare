import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks.js';
import { api, rupees, when } from '../api.js';
import { useAuth } from '../auth.jsx';
import { State } from './Public.jsx';

export function Dashboard() {
  const { me, refreshMe } = useAuth();
  const sub = useApi('/api/subscriptions/current');
  const cats = useApi('/api/categories');
  return (
    <section>
      <h1>Welcome, {me.fullName || me.email}</h1>
      <h2>Your subscription</h2>
      <State loading={sub.loading} error={sub.error} reload={sub.reload} />
      {sub.data === null && !sub.loading && !sub.error && <p>No active subscription. <Link to="/">Browse plans</Link></p>}
      {sub.data && (
        <div className="card">
          <h3>{sub.data.planName} <span className="badge">{sub.data.status}</span></h3>
          <p>Paid {rupees(sub.data.pricePaise)} ({sub.data.interval.toLowerCase()}, simulated). Valid until {when(sub.data.endsAt)}.</p>
          <p className="note">Renewal is not automated yet: buy again after expiry or cancellation.</p>
          <ul>{sub.data.benefits.map((b) => (
            <li key={b.categoryName}>{b.categoryName}: {b.usedThisPeriod} used of {b.allowance === null ? 'unlimited' : b.allowance} this {b.periodMonths}-month period</li>
          ))}</ul>
          <div className="actions">
            <Link className="button" to="/bookings">Book a service</Link>{' '}
            <button onClick={async () => {
              if (window.confirm('Are you sure you want to cancel your active subscription?')) {
                try {
                  await api('/api/subscriptions/cancel', { method: 'POST' });
                  sub.reload();
                } catch (e) {
                  alert(e.message);
                }
              }
            }}>Cancel subscription</button>
          </div>
        </div>
      )}
      <h2>Are you a service professional?</h2>
      <ApplyPro categories={cats.data} onDone={refreshMe} />
    </section>
  );
}

function ApplyPro({ categories, onDone }) {
  const [city, setCity] = useState('');
  const [ids, setIds] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const toggle = (id) => setIds((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api('/api/pro/apply', { method: 'POST', body: { city, categoryIds: ids } }); await onDone(); }
    catch (err) { setMsg(err.message); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="card">
      <p className="note">Applying switches your account to a professional account. An admin must approve you before you can accept jobs. Document upload is not implemented yet.</p>
      <label>City<input required value={city} onChange={(e) => setCity(e.target.value)} /></label>
      <fieldset><legend>Services you provide</legend>
        {categories?.map((c) => (<label key={c.id} className="inline"><input type="checkbox" checked={ids.includes(c.id)} onChange={() => toggle(c.id)} /> {c.name}</label>))}
      </fieldset>
      <button disabled={busy || !ids.length}>{busy ? 'Submitting…' : 'Apply as professional'}</button>
      {msg && <p className="error" role="alert">{msg}</p>}
    </form>
  );
}

export function Checkout() {
  const { planId } = useParams();
  const { data: plans, loading, error } = useApi('/api/plans');
  const plan = plans?.find((p) => p.id === planId);
  const key = useMemo(() => crypto.randomUUID(), []); // same key on retry => no duplicate charge
  const [scenario, setScenario] = useState('APPROVE');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function pay() {
    setBusy(true); setErr(null);
    try { setResult(await api('/api/subscriptions/purchase', { method: 'POST', body: { planId, idempotencyKey: key, scenario } })); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  if (loading || error) return <State loading={loading} error={error} />;
  if (!plan) return <p>Plan not found or no longer available.</p>;
  return (
    <section className="narrow">
      <h1>Confirm simulated purchase</h1>
      <p className="note">TEST MODE: no real payment is taken. Do not enter card, UPI or bank details anywhere.</p>
      <div className="card"><h2>{plan.name}</h2><p className="price">{rupees(plan.pricePaise)}</p></div>
      <label>Test scenario
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          <option value="APPROVE">Simulate successful payment</option>
          <option value="DECLINE">Simulate declined payment (dev only)</option>
        </select>
      </label>
      {!result && <button onClick={pay} disabled={busy}>{busy ? 'Processing…' : 'Confirm simulated payment'}</button>}
      {err && <p className="error" role="alert">{err}</p>}
      {result && (result.payment.status === 'SUCCEEDED'
        ? <p className="ok" role="status">Simulated payment succeeded. Subscription active until {when(result.subscription.endsAt)}. <button onClick={() => nav('/dashboard')}>Go to dashboard</button></p>
        : <p className="error" role="alert">Simulated payment failed ({result.payment.failureReason}). No subscription was activated. <button onClick={() => window.location.reload()}>Try again</button></p>)}
    </section>
  );
}

export function Payments() {
  const { data, loading, error, reload } = useApi('/api/payments');
  return (
    <section>
      <h1>Payment history</h1>
      <p className="note">All entries are simulated test transactions.</p>
      <State loading={loading} error={error} empty={data && !data.length} reload={reload} />
      {data?.length > 0 && (
        <div className="scroll"><table><thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id}><td>{when(p.createdAt)}</td><td>{p.planName}</td><td>{rupees(p.amountPaise)}</td><td><span className="badge">{p.status}</span> (simulated)</td></tr>
          ))}</tbody></table></div>
      )}
    </section>
  );
}

export function Bookings() {
  const list = useApi('/api/bookings');
  const cats = useApi('/api/categories');
  const [form, setForm] = useState({ categoryId: '', slot: '', address: '', city: '', notes: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      await api('/api/bookings', { method: 'POST', body: {
        categoryId: form.categoryId, slotStart: new Date(form.slot).toISOString(),
        address: form.address, city: form.city, ...(form.notes ? { notes: form.notes } : {}),
      } });
      setMsg({ ok: true, text: 'Booking requested. It stays pending until a professional accepts.' });
      list.reload();
    } catch (err) { setMsg({ text: err.message }); }
    setBusy(false);
  }
  const act = async (path, body) => {
    try { await api(path, { method: 'POST', body }); list.reload(); } catch (e) { setMsg({ text: e.message }); }
  };

  return (
    <section>
      <h1>Bookings</h1>
      <h2>New booking</h2>
      <form onSubmit={submit} className="card">
        <label>Service
          <select required value={form.categoryId} onChange={set('categoryId')}>
            <option value="">Select…</option>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label>Date and time (on the hour or half hour)<input type="datetime-local" step="1800" required value={form.slot} onChange={set('slot')} /></label>
        <label>Address<input required minLength={5} maxLength={300} value={form.address} onChange={set('address')} /></label>
        <label>City<input required value={form.city} onChange={set('city')} /></label>
        <label>Notes (optional)<input maxLength={500} value={form.notes} onChange={set('notes')} /></label>
        <button disabled={busy}>{busy ? 'Booking…' : 'Request booking'}</button>
      </form>
      {msg && <p className={msg.ok ? 'ok' : 'error'} role="alert">{msg.text}</p>}
      <h2>Your bookings and service history</h2>
      <State loading={list.loading} error={list.error} empty={list.data && !list.data.length} reload={list.reload} />
      {list.data?.map((b) => (
        <article className="card" key={b.id}>
          <h3>{b.category.name} <span className="badge">{b.status}</span></h3>
          <p>{when(b.slotStart)} · {b.city}</p>
          {b.professional && <p>Professional: {b.professional.user.fullName || 'Assigned'}</p>}
          {['PENDING', 'ACCEPTED'].includes(b.status) && <button onClick={() => act(`/api/bookings/${b.id}/cancel`)}>Cancel</button>}
          {b.status === 'COMPLETED' && (b.review
            ? <p>Your review: {b.review.rating}/5 {b.review.comment}</p>
            : <ReviewForm onSubmit={(body) => act(`/api/bookings/${b.id}/review`, body)} />)}
        </article>
      ))}
    </section>
  );
}

function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ rating, ...(comment ? { comment } : {}) }); }}>
      <label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></label>
      <label>Comment<input maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
      <button>Submit review</button>
    </form>
  );
}
