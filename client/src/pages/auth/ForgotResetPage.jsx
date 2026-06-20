import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import {
  TerminalInput, TerminalButton, TerminalAlert,
} from '../../components/ui/Terminal.jsx';
import { authApi } from '../../api/auth.js';

// ── ForgotPasswordPage ────────────────────────────────────────────────────────

export const ForgotPasswordPage = () => {
  const [email,     setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          SYS://AUTH/RECOVER
        </p>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Reset access
        </h2>
      </div>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
          <p style={{ color: 'var(--green-bright)', marginBottom: '8px', fontSize: '13px' }}>
            If that email exists, a reset link is on its way.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '24px' }}>
            Check your inbox. The link expires in 1 hour.
          </p>
          <Link to="/login" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            ← Back to login
          </Link>
        </div>
      ) : (
        <>
          {error && <TerminalAlert type="error" message={error} onClose={() => setError('')} />}
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
            Enter your email and we'll send a reset link.
          </p>
          <form onSubmit={handleSubmit} noValidate>
            <TerminalInput
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operative@breach.gg"
              autoFocus
            />
            <TerminalButton type="submit" variant="primary" size="lg" loading={loading} fullWidth>
              Send reset link
            </TerminalButton>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-dim)' }}>
            <Link to="/login" style={{ color: 'var(--text-dim)' }}>← Back to login</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
};

// ── ResetPasswordPage ─────────────────────────────────────────────────────────

export const ResetPasswordPage = () => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token') || '';

  const [form, setForm]   = useState({ newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <AuthLayout>
        <TerminalAlert type="error" message="Invalid or missing reset token. Request a new link." />
        <Link to="/forgot-password">← Request new link</Link>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 8)      { setError('At least 8 characters'); return; }
    if (!/[A-Z]/.test(form.newPassword))  { setError('One uppercase letter required'); return; }
    if (!/[0-9]/.test(form.newPassword))  { setError('One number required'); return; }
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(token, form.newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          SYS://AUTH/NEW-KEY
        </p>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Set new password
        </h2>
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
          <p style={{ color: 'var(--green-bright)', fontSize: '13px', marginBottom: '8px' }}>
            Password updated.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Redirecting to login...
          </p>
        </div>
      ) : (
        <>
          {error && <TerminalAlert type="error" message={error} onClose={() => setError('')} />}
          <form onSubmit={handleSubmit} noValidate>
            <TerminalInput
              label="New password"
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="••••••••"
              autoComplete="new-password"
              autoFocus
            />
            <TerminalInput
              label="Confirm password"
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <TerminalButton type="submit" variant="primary" size="lg" loading={loading} fullWidth>
              Set password
            </TerminalButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
};
