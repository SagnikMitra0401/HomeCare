import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks.js';
import { api, rupees, when, statusBadge, statusBorder, greeting } from '../api.js';
import { useAuth } from '../auth.jsx';
import { State, SkeletonCard, SkeletonGrid, SkeletonStatGrid, SkeletonTable } from './Public.jsx';

/* ========== DASHBOARD ========== */

export function Dashboard() {
  const { me, refreshMe } = useAuth();
  const sub = useApi('/api/subscriptions/current');
  const cats = useApi('/api/categories');

  const isExpiringSoon = useMemo(() => {
    if (!sub.data?.endsAt) return false;
    const diffDays = (new Date(sub.data.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 7;
  }, [sub.data?.endsAt]);

  return (
    <section>
      <div className="page-header">
        <h1>{greeting()}, {me.fullName || me.email.split('@')[0]}</h1>
        <p>Manage your subscription, book services, and track your home maintenance.</p>
      </div>

      {isExpiringSoon && (
        <div className="alert alert-warning">
          <span>⚠️</span>
          <span><strong>Renewal Reminder:</strong> Your subscription ends on {when(sub.data.endsAt)}. Renew to continue your home maintenance visits.</span>
        </div>
      )}

      <h2>Your Subscription</h2>
      <State loading={sub.loading} error={sub.error} reload={sub.reload}
        skeleton={<SkeletonCard />} />

      {sub.data === null && !sub.loading && !sub.error && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>📋</div>
          <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>No active subscription</p>
          <Link to="/" className="button">Browse Plans</Link>
        </div>
      )}

      {sub.data && (
        <div className="card card-accent">
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>{sub.data.planName}</h3>
            <span className={`badge ${statusBadge(sub.data.status)}`}>{sub.data.status}</span>
          </div>
          <p style={{ margin: '0 0 0.25rem' }}>
            Paid {rupees(sub.data.pricePaise)} ({sub.data.interval.toLowerCase()}, simulated)
          </p>
          <p className="note" style={{ margin: '0 0 1rem' }}>Valid until {when(sub.data.endsAt)}</p>

          {sub.data.benefits.map((b) => {
            const used = b.usedThisPeriod;
            const total = b.allowance;
            const pct = total === null ? 0 : Math.min((used / total) * 100, 100);
            const fillClass = total !== null && pct >= 90 ? 'progress-fill-danger' : pct >= 70 ? 'progress-fill-warning' : '';
            return (
              <div key={b.categoryName} className="progress-wrap">
                <div className="progress-header">
                  <span>{b.categoryName}</span>
                  <span>{used} / {total === null ? '∞' : total} used</span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${fillClass}`} style={{ width: total === null ? '0%' : `${pct}%` }} />
                </div>
              </div>
            );
          })}

          <div className="actions">
            <Link className="button" to="/bookings">Book a Service</Link>
            <button className="button-secondary" onClick={async () => {
              if (window.confirm('Are you sure you want to cancel your active subscription?')) {
                try { await api('/api/subscriptions/cancel', { method: 'POST' }); sub.reload(); }
                catch (e) { alert(e.message); }
              }
            }}>Cancel Subscription</button>
          </div>
        </div>
      )}

      <hr className="divider" />

      <h2>Become a Service Professional</h2>
      <ApplyPro categories={cats.data} onDone={refreshMe} />
    </section>
  );
}

/* ========== APPLY AS PROFESSIONAL ========== */

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
      <p className="note" style={{ marginBottom: '1rem' }}>
        Applying switches your account to a professional account. An admin must approve you before you can accept jobs.
      </p>
      <label>City<input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai, Delhi" /></label>
      <fieldset><legend>Services you provide</legend>
        {categories?.map((c) => (
          <label key={c.id} className="inline">
            <input type="checkbox" checked={ids.includes(c.id)} onChange={() => toggle(c.id)} /> {c.name}
          </label>
        ))}
      </fieldset>
      <button disabled={busy || !ids.length}>
        {busy && <span className="spinner" />}
        {busy ? 'Submitting…' : 'Apply as Professional'}
      </button>
      {msg && <div className="alert alert-danger" style={{ marginTop: '0.75rem', marginBottom: 0 }}>{msg}</div>}
    </form>
  );
}

/* ========== CHECKOUT ========== */

export function Checkout() {
  const { planId } = useParams();
  const { data: plans, loading, error } = useApi('/api/plans');
  const plan = plans?.find((p) => p.id === planId);
  const key = useMemo(() => crypto.randomUUID(), []);
  const [method, setMethod] = useState('UPI');
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

  if (loading || error) return <State loading={loading} error={error} skeleton={<SkeletonCard />} />;
  if (!plan) return <div className="alert alert-danger">Plan not found or no longer available.</div>;

  const methods = [
    { id: 'UPI', label: 'UPI', desc: 'Google Pay / PhonePe / Paytm', detail: 'user@dummyupi' },
    { id: 'CARD', label: 'Card', desc: 'Credit or Debit Card', detail: '•••• •••• •••• 4242' },
    { id: 'NETBANKING', label: 'Net Banking', desc: 'HDFC, ICICI, SBI', detail: null },
  ];

  return (
    <section className="narrow">
      <div className="page-header">
        <h1>Confirm Purchase</h1>
        <p>Review your plan and complete the simulated payment.</p>
      </div>

      <div className="alert alert-info">
        Test mode — no real financial transaction will occur. Do not enter real credentials.
      </div>

      {/* Plan summary */}
      <div className="card card-accent" style={{ marginBottom: '1.25rem' }}>
        <div className="flex-between">
          <h3 style={{ margin: 0 }}>{plan.name}</h3>
          <span className="badge badge-brand">{plan.interval}</span>
        </div>
        <p className="price">{rupees(plan.pricePaise)} <small>/ {plan.interval.toLowerCase()}</small></p>
        <p className="note" style={{ margin: 0 }}>{plan.description}</p>
      </div>

      {/* Payment method */}
      <h3 style={{ marginBottom: '0.5rem' }}>Payment Method</h3>
      <div className="radio-group">
        {methods.map((m) => (
          <label key={m.id} className={`radio-card${method === m.id ? ' selected' : ''}`}
            onClick={() => setMethod(m.id)}>
            <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
            <div className="radio-card-info">
              <span className="radio-card-label">{m.label}</span>
              <span className="radio-card-desc">{m.desc} (Simulated)</span>
              {method === m.id && m.detail && (
                <span className="radio-card-desc" style={{ fontFamily: 'monospace', marginTop: '0.25rem', display: 'block' }}>{m.detail}</span>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Outcome simulation */}
      <label style={{ marginTop: '1rem' }}>Outcome Simulation
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          <option value="APPROVE">Simulate successful payment</option>
          <option value="DECLINE">Simulate declined payment</option>
        </select>
      </label>

      {/* CTA */}
      {!result && (
        <button className="button-full button-lg" onClick={pay} disabled={busy} style={{ marginTop: '0.75rem' }}>
          {busy && <span className="spinner" />}
          {busy ? 'Processing…' : `Pay ${rupees(plan.pricePaise)} via ${method}`}
        </button>
      )}

      {err && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>{err}</div>}

      {result && (result.payment.status === 'SUCCEEDED'
        ? (
          <div className="alert alert-success" style={{ marginTop: '0.75rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span>Payment successful! Subscription active until {when(result.subscription.endsAt)}.</span>
            <button onClick={() => nav('/dashboard')}>Go to Dashboard</button>
          </div>
        )
        : (
          <div className="alert alert-danger" style={{ marginTop: '0.75rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span>Payment failed: {result.payment.failureReason}. No subscription was activated.</span>
            <button className="button-secondary" onClick={() => window.location.reload()}>Try Again</button>
          </div>
        )
      )}
    </section>
  );
}

/* ========== PAYMENTS ========== */

export function Payments() {
  const { data, loading, error, reload } = useApi('/api/payments');
  return (
    <section>
      <div className="page-header">
        <h1>Payment History</h1>
        <p>All entries are simulated test transactions.</p>
      </div>

      <State loading={loading} error={error} empty={data && !data.length} reload={reload}
        skeleton={<SkeletonTable rows={4} />} />

      {data?.length > 0 && (
        <div className="scroll">
          <table>
            <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{data.map((p) => (
              <tr key={p.id}>
                <td>{when(p.createdAt)}</td>
                <td>{p.planName}</td>
                <td style={{ fontWeight: 600 }}>{rupees(p.amountPaise)}</td>
                <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ========== BOOKINGS ========== */

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
      setForm({ categoryId: '', slot: '', address: '', city: '', notes: '' });
      list.reload();
    } catch (err) { setMsg({ text: err.message }); }
    setBusy(false);
  }

  const act = async (path, body) => {
    try { await api(path, { method: 'POST', body }); list.reload(); } catch (e) { setMsg({ text: e.message }); }
  };

  return (
    <section>
      <div className="page-header">
        <h1>Bookings</h1>
        <p>Schedule services and track your booking history.</p>
      </div>

      {/* New Booking Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>New Booking</h3>
        <form onSubmit={submit}>
          <div className="grid" style={{ gap: '0 1.25rem' }}>
            <label>Service
              <select required value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Select a service…</option>
                {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Date &amp; Time
              <input type="datetime-local" step="1800" required value={form.slot} onChange={set('slot')} />
            </label>
          </div>
          <div className="grid" style={{ gap: '0 1.25rem' }}>
            <label>Address<input required minLength={5} maxLength={300} value={form.address} onChange={set('address')} placeholder="Full address" /></label>
            <label>City<input required value={form.city} onChange={set('city')} placeholder="e.g. Mumbai" /></label>
          </div>
          <label>Notes <span style={{ fontWeight: 400 }}>(optional)</span>
            <input maxLength={500} value={form.notes} onChange={set('notes')} placeholder="Any special instructions…" />
          </label>
          <button disabled={busy}>
            {busy && <span className="spinner" />}
            {busy ? 'Booking…' : 'Request Booking'}
          </button>
        </form>
      </div>

      {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-danger'}`} role="alert">{msg.text}</div>}

      {/* Booking History */}
      <h2>Your Service History</h2>
      <State loading={list.loading} error={list.error} empty={list.data && !list.data.length} reload={list.reload}
        skeleton={<SkeletonGrid count={2} />} />

      {list.data?.map((b) => (
        <article className={`card ${statusBorder(b.status)}`} key={b.id} style={{ marginBottom: '0.75rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{b.category.name}</h3>
            <span className={`badge ${statusBadge(b.status)}`}>{b.status}</span>
          </div>
          <p className="note" style={{ margin: '0 0 0.25rem' }}>{when(b.slotStart)} · {b.city}</p>
          {b.professional && <p className="note" style={{ margin: '0 0 0.5rem' }}>Professional: {b.professional.user.fullName || 'Assigned'}</p>}

          {['PENDING', 'ACCEPTED'].includes(b.status) && (
            <div className="actions" style={{ marginTop: '0.75rem' }}>
              <button className="button-danger" onClick={() => act(`/api/bookings/${b.id}/cancel`)}>Cancel</button>
            </div>
          )}

          {b.status === 'COMPLETED' && (b.review
            ? <div className="alert alert-success" style={{ marginTop: '0.75rem', marginBottom: 0 }}>Your review: {'★'.repeat(b.review.rating)}{'☆'.repeat(5 - b.review.rating)} {b.review.comment}</div>
            : <ReviewForm onSubmit={(body) => act(`/api/bookings/${b.id}/review`, body)} />
          )}

          {['COMPLETED', 'CANCELLED'].includes(b.status) && (b.dispute
            ? <div className="alert alert-info" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                Dispute: <strong>{b.dispute.status}</strong> — {b.dispute.reason}
                {b.dispute.resolutionNote ? ` (${b.dispute.resolutionNote})` : ''}
              </div>
            : <DisputeForm onSubmit={(body) => act(`/api/bookings/${b.id}/dispute`, body)} />
          )}
        </article>
      ))}
    </section>
  );
}

/* ========== DISPUTE FORM ========== */

function DisputeForm({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (!open) return (
    <div style={{ marginTop: '0.75rem' }}>
      <button className="button-ghost" onClick={() => setOpen(true)}>Raise a dispute</button>
    </div>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ reason }); setOpen(false); }} style={{ marginTop: '0.75rem' }}>
      <label>Reason for dispute
        <input required minLength={5} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue…" />
      </label>
      <div className="actions" style={{ marginTop: '0.5rem' }}>
        <button>Submit Dispute</button>
        <button type="button" className="button-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

/* ========== REVIEW FORM ========== */

function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ rating, ...(comment ? { comment } : {}) }); }} style={{ marginTop: '0.75rem' }}>
      <div className="grid" style={{ gap: '0 1.25rem' }}>
        <label>Rating
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n}/5)</option>)}
          </select>
        </label>
        <label>Comment <span style={{ fontWeight: 400 }}>(optional)</span>
          <input maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience…" />
        </label>
      </div>
      <button>Submit Review</button>
    </form>
  );
}
