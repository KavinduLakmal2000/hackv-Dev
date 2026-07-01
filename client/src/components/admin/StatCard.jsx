import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — single metric tile for the admin dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sublabel, color = 'var(--green-bright)', icon }) => (
  <div style={{
    padding: '18px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
      <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </p>
      {icon}
    </div>
    <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', color, fontWeight: 900 }}>
      {value}
    </p>
    {sublabel && (
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{sublabel}</p>
    )}
  </div>
);

export default StatCard;
