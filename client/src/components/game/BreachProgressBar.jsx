import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// BreachProgressBar — HACKER VIEW ONLY.
// Developers never see this exact number, only the redacted dbHealth bar.
// ─────────────────────────────────────────────────────────────────────────────

const BreachProgressBar = ({ progress = 0 }) => {
  const danger = progress >= 80;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{
          fontSize: '10px', fontFamily: 'var(--font-display)',
          letterSpacing: '0.08em', color: 'var(--text-dim)', textTransform: 'uppercase',
        }}>
          Breach Progress
        </span>
        <span style={{
          fontSize: '12px', fontFamily: 'var(--font-mono)',
          color: danger ? 'var(--red-bright)' : 'var(--red-mid)', fontWeight: 700,
        }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div style={{
        height: '10px', background: 'var(--bg-input)',
        border: '1px solid var(--red-dim)', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${Math.max(0, Math.min(100, progress))}%`,
          background: 'var(--red-bright)', transition: 'width 0.4s ease',
          boxShadow: danger ? '0 0 14px var(--red-bright)' : 'none',
        }} />
      </div>
    </div>
  );
};

export default BreachProgressBar;
