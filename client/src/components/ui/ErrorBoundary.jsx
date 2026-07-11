import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary — catches JS render errors anywhere in the component tree.
// Without this, a single component crash wipes the entire app.
// Must be a class component (React requirement for componentDidCatch).
// ─────────────────────────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production this would go to an error tracking service (Sentry, etc.)
    // Never expose stack traces to the UI in production.
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Navigate to home — safest recovery
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px',
        background: 'var(--bg-void)',
      }}>
        <div style={{
          maxWidth: '520px', width: '100%',
          border: '1px solid var(--red-mid)', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)', overflow: 'hidden',
        }}>
          <div style={{ height: '2px', background: 'var(--red-bright)' }} />
          <div style={{ padding: '32px' }}>
            <p style={{
              fontSize: '10px', color: 'var(--red-dim)', fontFamily: 'var(--font-display)',
              letterSpacing: '0.1em', marginBottom: '8px',
            }}>
              SYS://ERROR/UNHANDLED
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)', color: 'var(--red-bright)',
              marginBottom: '12px', fontSize: '1.2rem',
            }}>
              Critical system fault
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
              An unexpected error occurred. Your session data is intact.
              {' '}Click below to return to the main terminal.
            </p>

            {isDev && this.state.error && (
              <pre style={{
                fontSize: '11px', color: 'var(--red-dim)', background: 'var(--red-ghost)',
                border: '1px solid var(--red-dim)', borderRadius: 'var(--radius-md)',
                padding: '12px', overflowX: 'auto', marginBottom: '20px', whiteSpace: 'pre-wrap',
              }}>
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              style={{
                width: '100%', padding: '10px', background: 'var(--red-ghost)',
                border: '1px solid var(--red-mid)', color: 'var(--red-bright)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Return to terminal
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
