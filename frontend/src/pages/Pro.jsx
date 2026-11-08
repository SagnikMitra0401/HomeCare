import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api, rupees, when, statusBadge, statusBorder } from '../api.js';
import { State, SkeletonStatGrid, SkeletonGrid, SkeletonCard } from './Public.jsx';

/* ========== PRO DASHBOARD ========== */

export function ProDashboard() {
  const me = useApi('/api/pro/me');
  const approved = me.data?.status === 'APPROVED';
  return (
    <section>
      <div className="page-header">
        <h1>Professional Dashboard</h1>
        <p>Manage your jobs, track earnings, and view customer feedback.</p>
      </div>

      <State loading={me.loading} error={me.error} reload={me.reload}
        skeleton={<SkeletonCard />} />

      {me.data && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="flex-between">
            <div>
              <h3 style={{ margin: 0 }}>Your Profile</h3>
              <p className="note" style={{ margin: '0.25rem 0 0' }}>
                {me.data.city} · {me.data.categories.map((c) => c.name).join(', ')}
              </p>
            </div>
            <span className={`badge ${statusBadge(me.data.status)}`}>{me.data.status}</span>
          </div>
        </div>
      )}

      {me.data && !approved && (
        <div className="alert alert-info">
          Your application is under review. You can accept jobs once an admin approves your application.
        </div>
      )}

      {approved && (
        <>
          <Earnings />
          <hr className="divider" />
          <Work />
        </>
      )}
    </section>
  );
}

/* ========== EARNINGS ========== */

function Earnings() {
  const { data, loading, error, reload } = useApi('/api/pro/earnings');
  return (
    <section>
      <h2>Performance Summary</h2>
      <State loading={loading} error={error} reload={reload}
        skeleton={<SkeletonStatGrid count={3} />} />

      {data && (
        <div className="grid grid-stats">
          <div className="card">
            <div className="stat-icon stat-icon-teal">💰</div>
            <p className="stat-value">{rupees(data.totalEarningsPaise)}</p>
            <p className="stat-label">Total Payout ({rupees(data.ratePerJobPaise)}/job)</p>
          </div>
          <div className="card">
            <div className="stat-icon stat-icon-green">✓</div>
            <p className="stat-value">{data.completedJobs}</p>
            <p className="stat-label">{data.inProgressJobs} in progress · {data.acceptedJobs} scheduled</p>
          </div>
          <div className="card">
            <div className="stat-icon stat-icon-amber">★</div>
            <p className="stat-value">{data.averageRating ? `${data.averageRating} / 5` : '—'}</p>
            <p className="stat-label">{data.reviewCount} review{data.reviewCount === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}
    </section>
  );
}

/* ========== WORK (REQUESTS + JOBS) ========== */

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
      {err && <div className="alert alert-danger">{err}</div>}

      <h2>Eligible Requests</h2>
      <p className="note" style={{ marginBottom: '1rem' }}>Customer details and full address are shown only after you accept.</p>
      <State loading={reqs.loading} error={reqs.error} empty={reqs.data && !reqs.data.length} reload={reqs.reload}
        skeleton={<SkeletonGrid count={2} />} />

      {reqs.data?.map((r) => (
        <article className="card status-pending" key={r.id} style={{ marginBottom: '0.75rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{r.category.name}</h3>
            <span className="badge badge-warning">NEW</span>
          </div>
          <p className="note" style={{ margin: 0 }}>{when(r.slotStart)} · {r.city}</p>
          <div className="actions">
            <button onClick={() => act(`/api/pro/requests/${r.id}/accept`)}>Accept</button>
            <button className="button-secondary" onClick={() => act(`/api/pro/requests/${r.id}/decline`)}>Decline</button>
          </div>
        </article>
      ))}

      <hr className="divider" />

      <h2>My Jobs</h2>
      <State loading={jobs.loading} error={jobs.error} empty={jobs.data && !jobs.data.length} reload={jobs.reload}
        skeleton={<SkeletonGrid count={2} />} />

      {jobs.data?.map((j) => (
        <article className={`card ${statusBorder(j.status)}`} key={j.id} style={{ marginBottom: '0.75rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{j.category.name}</h3>
            <span className={`badge ${statusBadge(j.status)}`}>{j.status}</span>
          </div>
          <p className="note" style={{ margin: '0 0 0.25rem' }}>{when(j.slotStart)} · {j.address}, {j.city}</p>
          <p className="note" style={{ margin: '0 0 0.5rem' }}>
            Customer: {j.customer.fullName || 'Customer'}
            {j.notes ? ` · ${j.notes}` : ''}
          </p>

          {j.review && (
            <div className="alert alert-success" style={{ marginBottom: '0.5rem' }}>
              Customer review: {'★'.repeat(j.review.rating)}{'☆'.repeat(5 - j.review.rating)} {j.review.comment}
            </div>
          )}

          <div className="actions">
            {j.status === 'ACCEPTED' && (
              <button onClick={() => act(`/api/pro/jobs/${j.id}/status`, { status: 'IN_PROGRESS' })}>Start Work</button>
            )}
            {j.status === 'IN_PROGRESS' && (
              <button onClick={() => act(`/api/pro/jobs/${j.id}/status`, { status: 'COMPLETED' })}>Mark Completed</button>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
