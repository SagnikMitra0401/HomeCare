import React, { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Plans, Services, Login } from './pages/Public.jsx';
import { Dashboard, Checkout, Payments, Bookings } from './pages/Customer.jsx';
import { ProDashboard } from './pages/Pro.jsx';
import { AdminDashboard } from './pages/Admin.jsx';

function Guard({ roles, children }) {
  const { me, loading, session, error } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  if (error || !me) return <div className="alert alert-danger">{error || 'Could not load your account.'}</div>;
  if (!roles.includes(me.role)) return <div className="alert alert-danger">You do not have access to this page.</div>;
  return children;
}

const HouseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function App() {
  const { me, signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const close = () => setNavOpen(false);
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <>
      <header className={`topbar${navOpen ? ' nav-open' : ''}`}>
        <Link to="/" className="topbar-brand" onClick={close}>
          <HouseIcon /> HomeCare
        </Link>

        <nav className="topbar-nav" onClick={close}>
          <Link to="/" className={isActive('/')}>Plans</Link>
          <Link to="/services" className={isActive('/services')}>Services</Link>
          {me?.role === 'CUSTOMER' && (<>
            <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
            <Link to="/bookings" className={isActive('/bookings')}>Bookings</Link>
            <Link to="/payments" className={isActive('/payments')}>Payments</Link>
          </>)}
          {me?.role === 'PROFESSIONAL' && <Link to="/pro" className={isActive('/pro')}>Professional</Link>}
          {me?.role === 'ADMIN' && <Link to="/admin" className={isActive('/admin')}>Admin</Link>}
          {/* Mobile-only auth button */}
          <div className="topbar-auth" style={{ display: 'none' }}>
            {me
              ? <button className="nav-btn" onClick={(e) => { e.stopPropagation(); signOut(); }}>Sign out</button>
              : <Link to="/login" className="button button-lg button-full">Sign in</Link>}
          </div>
        </nav>

        <div className="topbar-auth">
          {me
            ? <button className="button-ghost" onClick={signOut}>Sign out</button>
            : <Link to="/login" className="button">Sign in</Link>}
        </div>

        <button className="hamburger" onClick={() => setNavOpen(!navOpen)} aria-label="Toggle menu">
          {navOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {navOpen && <div className="nav-overlay" onClick={close} />}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Plans />} />
          <Route path="/services" element={<Services />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Guard roles={['CUSTOMER']}><Dashboard /></Guard>} />
          <Route path="/checkout/:planId" element={<Guard roles={['CUSTOMER']}><Checkout /></Guard>} />
          <Route path="/payments" element={<Guard roles={['CUSTOMER']}><Payments /></Guard>} />
          <Route path="/bookings" element={<Guard roles={['CUSTOMER']}><Bookings /></Guard>} />
          <Route path="/pro" element={<Guard roles={['PROFESSIONAL']}><ProDashboard /></Guard>} />
          <Route path="/admin" element={<Guard roles={['ADMIN']}><AdminDashboard /></Guard>} />
          <Route path="*" element={
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <p>Page not found.</p>
            </div>
          } />
        </Routes>
      </main>
    </>
  );
}
