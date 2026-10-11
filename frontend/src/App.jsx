import React from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Plans, Login } from './pages/Public.jsx';
import { Dashboard, Checkout, Payments, Bookings } from './pages/Customer.jsx';
import { ProDashboard } from './pages/Pro.jsx';
import { AdminDashboard } from './pages/Admin.jsx';

function Guard({ roles, children }) {
  const { me, loading, session, error } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  if (error || !me) return <p className="error" role="alert">{error || 'Could not load your account.'}</p>;
  if (!roles.includes(me.role)) return <p className="error" role="alert">You do not have access to this page.</p>;
  return children;
}

export default function App() {
  const { me, signOut } = useAuth();
  return (
    <>
      <header className="topbar">
        <strong>HomeCare Plans</strong>
        <nav aria-label="Main">
          <Link to="/">Plans</Link>
          {me?.role === 'CUSTOMER' && (<>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/bookings">Bookings</Link>
            <Link to="/payments">Payments</Link>
          </>)}
          {me?.role === 'PROFESSIONAL' && <Link to="/pro">Professional</Link>}
          {me?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
          {me ? <button onClick={signOut}>Sign out</button> : <Link to="/login">Sign in</Link>}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Plans />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Guard roles={['CUSTOMER']}><Dashboard /></Guard>} />
          <Route path="/checkout/:planId" element={<Guard roles={['CUSTOMER']}><Checkout /></Guard>} />
          <Route path="/payments" element={<Guard roles={['CUSTOMER']}><Payments /></Guard>} />
          <Route path="/bookings" element={<Guard roles={['CUSTOMER']}><Bookings /></Guard>} />
          <Route path="/pro" element={<Guard roles={['PROFESSIONAL']}><ProDashboard /></Guard>} />
          <Route path="/admin" element={<Guard roles={['ADMIN']}><AdminDashboard /></Guard>} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
