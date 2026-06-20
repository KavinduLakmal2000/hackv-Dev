import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';
import { Spinner } from '../ui/Terminal.jsx';

// ── RequireAuth ───────────────────────────────────────────────────────────────
// Redirects to /login if not authenticated

export const RequireAuth = ({ children }) => {
  const { user, isReady } = useAuthStore();
  const location          = useLocation();

  if (!isReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// ── RequireAdmin ──────────────────────────────────────────────────────────────

export const RequireAdmin = ({ children }) => {
  const { user, isReady, isAdmin } = useAuthStore();
  const location                   = useLocation();

  if (!isReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;

  return children;
};

// ── RequireGuest ──────────────────────────────────────────────────────────────
// Redirects logged-in users away from auth pages

export const RequireGuest = ({ children }) => {
  const { user, isReady } = useAuthStore();

  if (!isReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (user) return <Navigate to="/lobby" replace />;

  return children;
};
