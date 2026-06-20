import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import {
  TerminalInput,
  TerminalButton,
  TerminalAlert,
  TerminalDivider,
  FieldErrors,
} from '../../components/ui/Terminal.jsx';
import useAuthStore from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8,         label: 'At least 8 characters' },
  { test: (v) => /[A-Z]/.test(v),       label: 'One uppercase letter'  },
  { test: (v) => /[0-9]/.test(v),       label: 'One number'            },
];

const RegisterPage = () => {
  const navigate  = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({
    username: '', email: '', password: '', displayName: '',
  });
  const [fieldErrors, setFieldErrors]   = useState({});
  const [serverErrors, setServerErrors] = useState([]);
  const [showPwRules, setShowPwRules]   = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.username)  errs.username = 'Username required';
    else if (!/^[a-zA-Z0-9_-]{3,20}$/.test(form.username))
      errs.username = '3–20 chars, letters, numbers, _ or -';
    if (!form.email)     errs.email    = 'Email required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errs.email    = 'Invalid email';
    if (!form.password)  errs.password = 'Password required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'One uppercase letter required';
    else if (!/[0-9]/.test(form.password)) errs.password = 'One number required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setServerErrors([]);
    if (!validate()) return;

    const result = await register(form);
    if (result.ok) {
      navigate('/lobby', { replace: true });
    } else if (result.errors) {
      setServerErrors(result.errors);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((f) => ({ ...f, [field]: '' }));
    clearError();
    setServerErrors([]);
  };

  const pwStrength = PASSWORD_RULES.filter((r) => r.test(form.password)).length;

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
          SYS://AUTH/REGISTER
        </p>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Create operative
        </h2>
      </div>

      {error && (
        <TerminalAlert type="error" message={error} onClose={clearError} />
      )}
      <FieldErrors errors={serverErrors} />

      <form onSubmit={handleSubmit} noValidate>
        <TerminalInput
          label="Username"
          value={form.username}
          onChange={handleChange('username')}
          error={fieldErrors.username}
          placeholder="ghost_hax"
          autoComplete="username"
          autoFocus
          maxLength={20}
        />

        <TerminalInput
          label="Display name (optional)"
          value={form.displayName}
          onChange={handleChange('displayName')}
          placeholder="Ghost"
          autoComplete="name"
          maxLength={40}
          prefix={null}
        />

        <TerminalInput
          label="Email address"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          error={fieldErrors.email}
          placeholder="operative@breach.gg"
          autoComplete="email"
        />

        <div>
          <TerminalInput
            label="Password"
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            error={fieldErrors.password}
            placeholder="••••••••"
            autoComplete="new-password"
            onFocus={() => setShowPwRules(true)}
            onBlur={() => setShowPwRules(false)}
          />

          {/* Password strength meter */}
          {form.password && (
            <div style={{ marginTop: '-10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    flex:         1,
                    height:       '2px',
                    borderRadius: '1px',
                    background:   i < pwStrength
                      ? (pwStrength === 3 ? 'var(--green-bright)' : pwStrength === 2 ? 'var(--amber)' : 'var(--red-bright)')
                      : 'var(--border-dim)',
                    transition:   'background 0.3s',
                  }} />
                ))}
              </div>
              {showPwRules && (
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                  {PASSWORD_RULES.map((r) => (
                    <span key={r.label} style={{
                      display:     'block',
                      color:       r.test(form.password) ? 'var(--green-dim)' : 'var(--text-muted)',
                      marginBottom:'2px',
                    }}>
                      {r.test(form.password) ? '✓' : '○'} {r.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          By registering you agree to our{' '}
          <Link to="/terms" style={{ color: 'var(--text-dim)' }}>Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" style={{ color: 'var(--text-dim)' }}>Privacy Policy</Link>.
        </p>

        <TerminalButton
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          fullWidth
        >
          Create account
        </TerminalButton>
      </form>

      <TerminalDivider label="or" />

      <TerminalButton
        variant="secondary"
        size="lg"
        fullWidth
        onClick={() => { window.location.href = authApi.googleLoginUrl(); }}
      >
        <GoogleIcon />
        Continue with Google
      </TerminalButton>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-dim)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--green-bright)' }}>Log in</Link>
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

export default RegisterPage;
