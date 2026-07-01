import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// RoundTimer — purely displays whatever `remaining` the server last sent
// via the 'game:tick' socket event (once per second). This component never
// runs its own setInterval — the server is the only clock that matters.
// ─────────────────────────────────────────────────────────────────────────────

const RoundTimer = ({ remaining, accent = 'green' }) => {
  if (remaining === null || remaining === undefined) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          --:--
        </span>
      </div>
    );
  }

  const mins = Math.floor(Math.max(0, remaining) / 60);
  const secs = Math.max(0, remaining) % 60;
  const danger = remaining <= 10;
  const warn   = remaining <= 30 && !danger;

  const color = danger ? 'var(--red-bright)' : warn ? 'var(--amber)' : `var(--${accent}-bright)`;

  return (
    <div style={{ textAlign: 'center' }}>
      <span style={{
        fontFamily:    'var(--font-display)',
        fontSize:      '1.8rem',
        fontWeight:    900,
        color,
        letterSpacing: '0.05em',
        animation:     danger ? 'blink 0.6s step-end infinite' : 'none',
        textShadow:    `0 0 16px ${color}55`,
      }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};

export default RoundTimer;
