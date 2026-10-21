import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api, rupees, when } from '../api.js';
import { State } from './Public.jsx';

export function ProDashboard() {
  const me = useApi('/api/pro/me');
  const approved = me.data?.status === 'APPROVED';
  return (
    <section>
      <h1>Professional dashboard</h1>
      <State loading={me.loading} error={me.error} reload={me.reload} />
      {me.data && (
        <p>Status: <span className="badge">{me.data.status}</span> · {me.data.city} · {me.data.categories.map((c) => c.name).join(', ')}</p>
      )}
      {me.data && !approved && <p className="note">You can accept jobs once an admin approves your application.</p>}
      {approved && (
        <>
          <Earnings />
          <Work />
        </>
      )}
    </section>
  );
}

function Earnings() {
  const { data, loading, error, reload } = useApi('/api/pro/earnings');
  return (
    <section className="earnings-section">
      <h2>Earnings & Performance Summary</h2>
      <State loading={loading} error={error} reload={reload} />
      {data && (
        <div className="grid">
          <div className="card">
            <h3>Total Payout</h3>
            <p className="price">{rupees(data.totalEarningsPaise)}</p>
            <p className="note">Simulated earnings ({rupees(data.ratePerJobPaise)}/job)</p>
          </div>
          <div className="card">
            <h3>Completed Jobs</h3>
            <p className="price">{data.completedJobs}</p>
            <p className="note">{data.inProgressJobs} in progress · {data.acceptedJobs} scheduled</p>
          </div>
          <div className="card">
            <h3>Customer Rating</h3>
            <p className="price">{data.averageRating ? `${data.averageRating} / 5` : 'No ratings yet'}</p>
            <p className="note">{data.reviewCount} review{data.reviewCount === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Work() {
  const reqs = useApi('/api/pro/requests');
  const jobs = useApi('/api/pro/jobs');
  const [err, setErr] = useState(null);
  const act = async (path, body) => {
    setErr(null);
    try { await api(path, { method: 'POST', body }); } catch (e) { setErr(e.message); }
    reqs.reload(); jobs.reload();
  };
  return (
    <>
      {err && <p className="error" role="alert">{err}</p>}
      <h2>Eligible requests</h2>
      <p className="note">Customer details and full address are shown only after you accept.</p>
      <State loading={reqs.loading} error={reqs.error} empty={reqs.data && !reqs.data.length} reload={reqs.reload} />
      {reqs.data?.map((r) => (
        <article className="card" key={r.id}>
          <h3>{r.category.name}</h3><p>{when(r.slotStart)} · {r.city}</p>
          <button onClick={() => act(`/api/pro/requests/${r.id}/accept`)}>Accept</button>{' '}
          <button onClick={() => act(`/api/pro/requests/${r.id}/decline`)}>Decline</button>
        </article>
      ))}
      <h2>My jobs</h2>
      <State loading={jobs.loading} error={jobs.error} empty={jobs.data && !jobs.data.length} reload={jobs.reload} />
      {jobs.data?.map((j) => (
        <article className="card" key={j.id}>
          <h3>{j.category.name} <span className="badge">{j.status}</span></h3>
          <p>{when(j.slotStart)} · {j.address}, {j.city}</p>
          <p>Customer: {j.customer.fullName || 'Customer'}{j.notes ? ` · Notes: ${j.notes}` : ''}</p>
          {j.review && <p>Review: {j.review.rating}/5 {j.review.comment}</p>}
          {j.status === 'ACCEPTED' && <button onClick={() => act(`/api/pro/jobs/${j.id}/status`, { status: 'IN_PROGRESS' })}>Start work</button>}
          {j.status === 'IN_PROGRESS' && <button onClick={() => act(`/api/pro/jobs/${j.id}/status`, { status: 'COMPLETED' })}>Mark completed</button>}
        </article>
      ))}
    </>
  );
}
