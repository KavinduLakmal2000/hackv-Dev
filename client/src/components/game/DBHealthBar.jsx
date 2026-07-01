import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DBHealthBar — shared between both views. Shows database integrity 0-100.
// Server is the only source of this number; never computed client-side.
// ─────────────────────────────────────────────────────────────────────────────

const DBHealthBar = ({ health = 100, accent = 'green' }) => {
  const color =
    health > 60 ? 'var(--green-bright)' :
    health > 30 ? 'var(--amber)' :
                  'var(--red-bright)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{
          fontSize: '10px', fontFamily: 'var(--font-display)',
          letterSpacing: '0.08em', color: 'var(--text-dim)', textTransform: 'uppercase',
        }}>
          Database Integrity
        </span>
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>
          {Math.round(health)}%
        </span>
      </div>
      <div style={{
        height: '10px', background: 'var(--bg-input)',
        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${Math.max(0, Math.min(100, health))}%`,
          background: color, transition: 'width 0.4s ease, background 0.4s ease',
          boxShadow: health < 30 ? `0 0 12px ${color}` : 'none',
        }} />
      </div>
    </div>
  );
};

export default DBHealthBar;
