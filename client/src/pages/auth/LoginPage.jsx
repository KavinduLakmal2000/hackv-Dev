import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import {
  TerminalInput,
  TerminalButton,
  TerminalAlert,
  TerminalDivider,
} from '../../components/ui/Terminal.jsx';
import useAuthStore from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';

const LoginPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, isLoading, error, clearError, user } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from?.pathname || '/lobby';

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  // Show session expired message
  const expired = new URLSearchParams(location.search).get('expired');

  const validate = () => {
    const errs = {};
    if (!form.email)    errs.email    = 'Email required';
    if (!form.password) errs.password = 'Password required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    const result = await login(form);
    if (result.ok) navigate(from, { replace: true });
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((f) => ({ ...f, [field]: '' }));
    clearError();
  };

  const handleGoogleLogin = () => {
    window.location.href = authApi.googleLoginUrl();
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: '24px' }}>
        <p style={{
          fontSize:     '10px',
          color:        'var(--text-dim)',
          fontFamily:   'var(--font-display)',
          letterSpacing:'0.1em',
          marginBottom: '4px',
        }}>
          SYS://AUTH/LOGIN
        </p>
        <h2 style={{
          fontSize:   '1.3rem',
          color:      'var(--text-primary)',
          fontFamily: 'var(--font-display)',
        }}>
          Access terminal
        </h2>
      </div>

      {expired && (
        <TerminalAlert
          type="warning"
          message="Session expired. Please log in again."
        />
      )}

      {error && (
        <TerminalAlert
          type="error"
          message={error}
          onClose={clearError}
        />
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TerminalInput
          label="Email address"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          error={fieldErrors.email}
          placeholder="operative@breach.gg"
          autoComplete="email"
          autoFocus
        />

        <TerminalInput
          label="Password"
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          error={fieldErrors.password}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '-8px' }}>
          <Link
            to="/forgot-password"
            style={{ fontSize: '11px', color: 'var(--text-dim)' }}
          >
            Forgot password?
          </Link>
        </div>

        <TerminalButton
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          fullWidth
        >
          Log in
        </TerminalButton>
      </form>

      <TerminalDivider label="or" />

      {/* Google OAuth */}
      <TerminalButton
        variant="secondary"
        size="lg"
        fullWidth
        onClick={handleGoogleLogin}
        style={{ gap: '10px' }}
      >
        <GoogleIcon />
        Continue with Google
      </TerminalButton>

      <p style={{
        textAlign:  'center',
        marginTop:  '24px',
        fontSize:   '12px',
        color:      'var(--text-dim)',
      }}>
        No account?{' '}
        <Link to="/register" style={{ color: 'var(--green-bright)' }}>
          Register
        </Link>
      </p>
    </AuthLayout>
  );
};

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default LoginPage;
