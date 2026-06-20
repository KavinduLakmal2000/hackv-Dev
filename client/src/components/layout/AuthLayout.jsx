import React from 'react';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// AuthLayout — wraps all auth pages (login, register, etc.)
// Full-screen terminal aesthetic with centered panel
// ─────────────────────────────────────────────────────────────────────────────

const AuthLayout = ({ children }) => (
  <div style={{
    minHeight:      '100vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px',
    position:       'relative',
  }}>

    {/* Corner decorations — CRT frame effect */}
    <CornerDecor position="top-left" />
    <CornerDecor position="top-right" />
    <CornerDecor position="bottom-left" />
    <CornerDecor position="bottom-right" />

    {/* Status bar */}
    <div style={{
      position:     'fixed',
      top:          0,
      left:         0,
      right:        0,
      height:       '28px',
      borderBottom: '1px solid var(--border-dim)',
      background:   'var(--bg-primary)',
      display:      'flex',
      alignItems:   'center',
      padding:      '0 16px',
      fontSize:     '10px',
      color:        'var(--text-muted)',
      fontFamily:   'var(--font-mono)',
      gap:          '24px',
      zIndex:       100,
    }}>
      <span style={{ color: 'var(--green-bright)' }}>BREACH</span>
      <span>SYS://AUTH</span>
      <span style={{ marginLeft: 'auto' }}>
        <BlinkDot /> SECURE CONNECTION ESTABLISHED
      </span>
    </div>

    {/* Logo */}
    <Link to="/" style={{ textDecoration: 'none', marginBottom: '40px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily:   'var(--font-display)',
          fontSize:     '3rem',
          fontWeight:   900,
          color:        'var(--green-bright)',
          letterSpacing:'0.3em',
          lineHeight:   1,
          textShadow:   '0 0 40px rgba(0,255,65,0.3)',
        }}>
          BREACH
        </h1>
        <p style={{
          fontSize:     '10px',
          color:        'var(--text-dim)',
          letterSpacing:'0.4em',
          fontFamily:   'var(--font-display)',
          marginTop:    '4px',
        }}>
          HACK OR BE HACKED
        </p>
      </div>
    </Link>

    {/* Panel */}
    <div style={{
      width:        '100%',
      maxWidth:     '420px',
      border:       '1px solid var(--border-primary)',
      borderRadius: 'var(--radius-lg)',
      background:   'var(--bg-secondary)',
      position:     'relative',
      overflow:     'hidden',
    }}>
      {/* Top accent line */}
      <div style={{ height: '2px', background: 'var(--green-mid)', opacity: 0.6 }} />

      <div style={{ padding: '32px' }}>
        {children}
      </div>
    </div>

    {/* Footer */}
    <p style={{
      marginTop:    '24px',
      fontSize:     '10px',
      color:        'var(--text-muted)',
      fontFamily:   'var(--font-mono)',
    }}>
      © {new Date().getFullYear()} BREACH — breach.gg
    </p>
  </div>
);

// ── Corner decoration ─────────────────────────────────────────────────────────

const CornerDecor = ({ position }) => {
  const styles = {
    position: 'fixed',
    zIndex:   0,
    opacity:  0.15,
    ...(position === 'top-left'     && { top: 40, left: 0 }),
    ...(position === 'top-right'    && { top: 40, right: 0 }),
    ...(position === 'bottom-left'  && { bottom: 0, left: 0 }),
    ...(position === 'bottom-right' && { bottom: 0, right: 0 }),
  };

  return (
    <div style={styles}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <path
          d={
            position === 'top-left'     ? 'M0 120 L0 0 L120 0' :
            position === 'top-right'    ? 'M120 120 L120 0 L0 0' :
            position === 'bottom-left'  ? 'M0 0 L0 120 L120 120' :
                                          'M120 0 L120 120 L0 120'
          }
          fill="none"
          stroke="var(--green-bright)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

// ── Blinking dot ──────────────────────────────────────────────────────────────

const BlinkDot = () => (
  <span style={{
    display:      'inline-block',
    width:        '5px',
    height:       '5px',
    background:   'var(--green-bright)',
    borderRadius: '50%',
    marginRight:  '6px',
    verticalAlign:'middle',
    animation:    'blink 1.2s step-end infinite',
  }} />
);

export default AuthLayout;
