import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api, rupees, when } from '../api.js';
import { State } from './Public.jsx';

export function AdminDashboard() {
  return (
    <section>
      <h1>Admin Dashboard</h1>
      <Analytics />
      <Disputes />
      <Professionals />
      <Plans />
    </section>
  );
}

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
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <section className="disputes-section">
      <h2>Open Disputes & Refund Requests</h2>
      {err && <p className="error" role="alert">{err}</p>}
      <State loading={loading} error={error} empty={data && !data.length} reload={reload} />
      {data?.map((d) => (
        <article className="card" key={d.id}>
          <h3>{d.booking.category.name} ({d.booking.city})</h3>
          <p>Customer: {d.booking.customer.fullName || d.booking.customer.email} · Professional: {d.booking.professional?.user?.fullName || 'None'}</p>
          <p><strong>Dispute Reason:</strong> {d.reason}</p>
          <label>Resolution note:
            <input
              value={notes[d.id] || ''}
              onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
              placeholder="Add resolution or refund comments..."
            />
          </label>
          <button onClick={() => resolve(d.id, 'RESOLVED')}>Resolve without refund</button>{' '}
          <button onClick={() => resolve(d.id, 'REFUNDED')}>Simulate Refund</button>
        </article>
      ))}
    </section>
  );
}


function Analytics() {
  const { data, loading, error, reload } = useApi('/api/admin/analytics');
  return (
    <section className="analytics-section">
      <h2>Operational Analytics</h2>
      <State loading={loading} error={error} reload={reload} />
      {data && (
        <div className="grid">
          <div className="card">
            <h3>Monthly Recurring Revenue (MRR)</h3>
            <p className="price">{rupees(data.mrrPaise)}</p>
            <p className="note">{data.activeSubscriptionsCount} active subscription{data.activeSubscriptionsCount === 1 ? '' : 's'}</p>
          </div>
          <div className="card">
            <h3>Customers</h3>
            <p className="price">{data.totalCustomers}</p>
            <p className="note">Registered accounts</p>
          </div>
          <div className="card">
            <h3>Service Fulfillment</h3>
            <p className="price">{data.completionRate}%</p>
            <p className="note">{data.completedBookings} of {data.totalBookings} bookings completed</p>
          </div>
          <div className="card">
            <h3>Customer Satisfaction</h3>
            <p className="price">{data.averageRating ? `${data.averageRating} / 5` : 'No reviews'}</p>
            <p className="note">{data.reviewCount} total review{data.reviewCount === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Professionals() {
  const { data, loading, error, reload } = useApi('/api/admin/professionals?status=PENDING');
  const [err, setErr] = useState(null);
  const decide = async (id, status) => {
    setErr(null);
    try { await api(`/api/admin/professionals/${id}`, { method: 'PATCH', body: { status } }); } catch (e) { setErr(e.message); }
    reload();
  };
  return (
    <>
      <h2>Pending professional applications</h2>
      {err && <p className="error" role="alert">{err}</p>}
      <State loading={loading} error={error} empty={data && !data.length} reload={reload} />
      {data?.map((p) => (
        <article className="card" key={p.id}>
          <h3>{p.user.fullName || p.user.email}</h3>
          <p>{p.user.email} · {p.city} · {p.categories.map((c) => c.name).join(', ')} · applied {when(p.createdAt)}</p>
          <button onClick={() => decide(p.id, 'APPROVED')}>Approve</button>{' '}
          <button onClick={() => decide(p.id, 'REJECTED')}>Reject</button>
        </article>
      ))}
    </>
  );
}

function Plans() {
  const { data, loading, error, reload } = useApi('/api/admin/plans');
  const [err, setErr] = useState(null);
  const patch = async (id, body) => {
    setErr(null);
    try { await api(`/api/admin/plans/${id}`, { method: 'PATCH', body }); } catch (e) { setErr(e.message); }
    reload();
  };
  return (
    <>
      <h2>Plans</h2>
      <p className="note">Price changes apply to future purchases only. Editing benefits is not implemented yet.</p>
      {err && <p className="error" role="alert">{err}</p>}
      <State loading={loading} error={error} reload={reload} />
      {data?.map((p) => <PlanRow key={p.id} plan={p} onPatch={patch} />)}
      <NewPlan onCreated={reload} />
    </>
  );
}

function PlanRow({ plan, onPatch }) {
  const [price, setPrice] = useState(String(plan.pricePaise / 100));
  return (
    <article className="card">
      <h3>{plan.name} <span className="badge">{plan.active ? 'ACTIVE' : 'HIDDEN'}</span></h3>
      <p>{plan.interval.toLowerCase()} · currently {rupees(plan.pricePaise)}</p>
      <label>New price (₹)<input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      <button onClick={() => onPatch(plan.id, { pricePaise: Math.round(Number(price) * 100) })}>Update price</button>{' '}
      <button onClick={() => onPatch(plan.id, { active: !plan.active })}>{plan.active ? 'Hide plan' : 'Show plan'}</button>
    </article>
  );
}

function NewPlan({ onCreated }) {
  const cats = useApi('/api/categories');
  const [f, setF] = useState({ name: '', description: '', interval: 'MONTHLY', price: '', categoryId: '', allowance: '1' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setMsg(null);
    const months = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 }[f.interval];
    try {
      await api('/api/admin/plans', { method: 'POST', body: {
        name: f.name, description: f.description, interval: f.interval, pricePaise: Math.round(Number(f.price) * 100),
        benefits: f.categoryId ? [{ categoryId: f.categoryId, allowance: f.allowance === '' ? null : Number(f.allowance), periodMonths: months }] : [],
      } });
      setF({ ...f, name: '', description: '', price: '' }); onCreated();
    } catch (err) { setMsg(err.message); }
  }
  return (
    <form onSubmit={submit} className="card">
      <h3>Create plan</h3>
      <label>Name<input required value={f.name} onChange={set('name')} /></label>
      <label>Description<input required value={f.description} onChange={set('description')} /></label>
      <label>Interval<select value={f.interval} onChange={set('interval')}><option>MONTHLY</option><option>QUARTERLY</option><option>YEARLY</option></select></label>
      <label>Price (₹)<input type="number" min="0" step="0.01" required value={f.price} onChange={set('price')} /></label>
      <label>First benefit service<select value={f.categoryId} onChange={set('categoryId')}><option value="">None</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Allowance per term (blank = unlimited)<input type="number" min="1" value={f.allowance} onChange={set('allowance')} /></label>
      <button>Create plan</button>
      {msg && <p className="error" role="alert">{msg}</p>}
    </form>
  );
}
