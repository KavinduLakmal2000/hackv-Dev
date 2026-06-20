import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import { Spinner, TerminalAlert } from '../../components/ui/Terminal.jsx';
import useAuthStore from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';

// ─────────────────────────────────────────────────────────────────────────────
// OAuthCallbackPage
// Server redirects here after Google auth completes.
// The access token is NEVER placed in the URL (avoids browser history /
// proxy log leakage) — the server sets the httpOnly refresh cookie during
// the OAuth redirect, and this page just calls /auth/refresh + /auth/me
// to bootstrap the session, exactly like a normal page load would.
// ─────────────────────────────────────────────────────────────────────────────

const OAuthCallbackPage = () => {
  const navigate     = useNavigate();
  const { initialize, user } = useAuthStore();
  const [error, setError]    = React.useState('');
  const hasRun        = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const finish = async () => {
      try {
        await initialize();
        navigate('/lobby', { replace: true });
      } catch {
        setError('Google sign-in failed. Please try again.');
      }
    };

    finish();
  }, [initialize, navigate]);

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        {error ? (
          <>
            <TerminalAlert type="error" message={error} />
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none', border: 'none', color: 'var(--green-bright)',
                cursor: 'pointer', fontSize: '12px', marginTop: '12px',
              }}
            >
              ← Back to login
            </button>
          </>
        ) : (
          <>
            <Spinner size={32} />
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
              Authenticating with Google<span className="cursor" />
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default OAuthCallbackPage;
