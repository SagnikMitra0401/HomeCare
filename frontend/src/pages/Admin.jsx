import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api, rupees, when, statusBadge } from '../api.js';
import { State, SkeletonStatGrid, SkeletonGrid, SkeletonCard } from './Public.jsx';

/* ========== ADMIN DASHBOARD ========== */

export function AdminDashboard() {
  return (
    <section>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform analytics, professional approvals, dispute resolution, and plan management.</p>
      </div>
      <Analytics />
      <hr className="divider" />
      <Disputes />
      <hr className="divider" />
      <Professionals />
      <hr className="divider" />
      <Plans />
    </section>
  );
}

/* ========== ANALYTICS ========== */

function Analytics() {
  const { data, loading, error, reload } = useApi('/api/admin/analytics');
  return (
    <section>
      <h2>Operational Analytics</h2>
      <State loading={loading} error={error} reload={reload}
        skeleton={<SkeletonStatGrid count={4} />} />

      {data && (
        <div className="grid grid-stats">
          <div className="card">
            <div className="stat-icon stat-icon-teal">📊</div>
            <p className="stat-value">{rupees(data.mrrPaise)}</p>
            <p className="stat-label">Monthly Recurring Revenue</p>
          </div>
          <div className="card">
            <div className="stat-icon stat-icon-blue">👥</div>
            <p className="stat-value">{data.totalCustomers}</p>
            <p className="stat-label">{data.activeSubscriptionsCount} active subscription{data.activeSubscriptionsCount === 1 ? '' : 's'}</p>
          </div>
          <div className="card">
            <div className="stat-icon stat-icon-green">✓</div>
            <p className="stat-value">{data.completionRate}%</p>
            <p className="stat-label">{data.completedBookings} / {data.totalBookings} bookings completed</p>
          </div>
          <div className="card">
            <div className="stat-icon stat-icon-amber">★</div>
            <p className="stat-value">{data.averageRating ? `${data.averageRating} / 5` : '—'}</p>
            <p className="stat-label">{data.reviewCount} customer review{data.reviewCount === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}
    </section>
  );
}

/* ========== DISPUTES ========== */

function Disputes() {
  const { data, loading, error, reload } = useApi('/api/admin/disputes?status=OPEN');
  const [notes, setNotes] = useState({});
  const [err, setErr] = useState(null);

  const resolve = async (id, status) => {
    setErr(null);
    const note = notes[id] || (status === 'REFUNDED' ? 'Simulated refund processed' : 'Issue resolved');
    try {
      await api(`/api/admin/disputes/${id}`, { method: 'PATCH', body: { status, resolutionNote: note } });
      reload();
    } catch (e) { setErr(e.message); }
  };

  return (
    <section>
      <h2>Open Disputes</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      <State loading={loading} error={error} empty={data && !data.length} reload={reload}
        skeleton={<SkeletonGrid count={2} />} />

      {data?.map((d) => (
        <article className="card status-pending" key={d.id} style={{ marginBottom: '0.75rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{d.booking.category.name} — {d.booking.city}</h3>
            <span className="badge badge-warning">OPEN</span>
          </div>
          <p className="note" style={{ margin: '0 0 0.25rem' }}>
            Customer: {d.booking.customer.fullName || d.booking.customer.email}
            {d.booking.professional?.user?.fullName && ` · Professional: ${d.booking.professional.user.fullName}`}
          </p>
          <div className="alert alert-warning" style={{ marginTop: '0.75rem' }}>
            <strong>Reason:</strong> {d.reason}
          </div>
          <label>Resolution note
            <input
              value={notes[d.id] || ''}
              onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
              placeholder="Add resolution or refund comments…"
            />
          </label>
          <div className="actions">
            <button onClick={() => resolve(d.id, 'RESOLVED')}>Resolve</button>
            <button className="button-secondary" onClick={() => resolve(d.id, 'REFUNDED')}>Simulate Refund</button>
          </div>
        </article>
      ))}
    </section>
  );
}

/* ========== PROFESSIONALS ========== */

function Professionals() {
  const { data, loading, error, reload } = useApi('/api/admin/professionals?status=PENDING');
  const [err, setErr] = useState(null);
  const decide = async (id, status) => {
    setErr(null);
    try { await api(`/api/admin/professionals/${id}`, { method: 'PATCH', body: { status } }); } catch (e) { setErr(e.message); }
    reload();
  };

  return (
    <section>
      <h2>Pending Applications</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      <State loading={loading} error={error} empty={data && !data.length} reload={reload}
        skeleton={<SkeletonGrid count={2} />} />

      {data?.map((p) => (
        <article className="card" key={p.id} style={{ marginBottom: '0.75rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{p.user.fullName || p.user.email}</h3>
            <span className="badge badge-warning">PENDING</span>
          </div>
          <p className="note" style={{ margin: '0 0 0.5rem' }}>
            {p.user.email} · {p.city} · {p.categories.map((c) => c.name).join(', ')} · Applied {when(p.createdAt)}
          </p>
          <div className="actions">
            <button onClick={() => decide(p.id, 'APPROVED')}>Approve</button>
            <button className="button-danger" onClick={() => decide(p.id, 'REJECTED')}>Reject</button>
          </div>
        </article>
      ))}
    </section>
  );
}

/* ========== PLANS ========== */

function Plans() {
  const { data, loading, error, reload } = useApi('/api/admin/plans');
  const [err, setErr] = useState(null);
  const patch = async (id, body) => {
    setErr(null);
    try { await api(`/api/admin/plans/${id}`, { method: 'PATCH', body }); } catch (e) { setErr(e.message); }
    reload();
  };

  return (
    <section>
      <h2>Manage Plans</h2>
      <p className="note" style={{ marginBottom: '1rem' }}>Price changes apply to future purchases only.</p>
      {err && <div className="alert alert-danger">{err}</div>}
      <State loading={loading} error={error} reload={reload}
        skeleton={<SkeletonGrid count={3} />} />

      {data?.map((p) => <PlanRow key={p.id} plan={p} onPatch={patch} />)}

      <hr className="divider" />
      <NewPlan onCreated={reload} />
    </section>
  );
}

function PlanRow({ plan, onPatch }) {
  const [price, setPrice] = useState(String(plan.pricePaise / 100));
  return (
    <article className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>{plan.name}</h3>
        <span className={`badge ${plan.active ? 'badge-success' : 'badge-danger'}`}>
          {plan.active ? 'ACTIVE' : 'HIDDEN'}
        </span>
      </div>
      <p className="note" style={{ margin: '0 0 0.75rem' }}>
        {plan.interval.toLowerCase()} · currently {rupees(plan.pricePaise)}
      </p>
      <div className="grid" style={{ gap: '0 1.25rem', alignItems: 'end' }}>
        <label style={{ margin: 0 }}>New price (₹)
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <div className="actions" style={{ marginTop: 0, marginBottom: '1rem' }}>
          <button onClick={() => onPatch(plan.id, { pricePaise: Math.round(Number(price) * 100) })}>Update Price</button>
          <button className="button-secondary" onClick={() => onPatch(plan.id, { active: !plan.active })}>
            {plan.active ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
    </article>
  );
}

function NewPlan({ onCreated }) {
  const cats = useApi('/api/categories');
  const [f, setF] = useState({ name: '', description: '', interval: 'MONTHLY', price: '', categoryId: '', allowance: '1' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setMsg(null); setBusy(true);
    const months = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 }[f.interval];
    try {
      await api('/api/admin/plans', { method: 'POST', body: {
        name: f.name, description: f.description, interval: f.interval, pricePaise: Math.round(Number(f.price) * 100),
        benefits: f.categoryId ? [{ categoryId: f.categoryId, allowance: f.allowance === '' ? null : Number(f.allowance), periodMonths: months }] : [],
      } });
      setF({ ...f, name: '', description: '', price: '' }); onCreated();
    } catch (err) { setMsg(err.message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card">
      <h3 style={{ marginBottom: '1rem' }}>Create New Plan</h3>
      <div className="grid" style={{ gap: '0 1.25rem' }}>
        <label>Name<input required value={f.name} onChange={set('name')} placeholder="e.g. Premium Yearly" /></label>
        <label>Interval
          <select value={f.interval} onChange={set('interval')}>
            <option>MONTHLY</option><option>QUARTERLY</option><option>YEARLY</option>
          </select>
        </label>
      </div>
      <label>Description<input required value={f.description} onChange={set('description')} placeholder="Brief plan description" /></label>
      <div className="grid" style={{ gap: '0 1.25rem' }}>
        <label>Price (₹)<input type="number" min="0" step="0.01" required value={f.price} onChange={set('price')} placeholder="299" /></label>
        <label>First benefit service
          <select value={f.categoryId} onChange={set('categoryId')}>
            <option value="">None</option>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      {f.categoryId && (
        <label>Allowance per term (blank = unlimited)
          <input type="number" min="1" value={f.allowance} onChange={set('allowance')} />
        </label>
      )}
      <button disabled={busy}>
        {busy && <span className="spinner" />}
        {busy ? 'Creating…' : 'Create Plan'}
      </button>
      {msg && <div className="alert alert-danger" style={{ marginTop: '0.75rem', marginBottom: 0 }}>{msg}</div>}
    </form>
  );
}
