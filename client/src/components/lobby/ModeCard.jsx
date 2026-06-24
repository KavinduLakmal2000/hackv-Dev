import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ModeCard — selectable game mode tile (1v1 / 5v5 / Training)
// ─────────────────────────────────────────────────────────────────────────────

const MODE_META = {
  '1v1': {
    title:    '1 vs 1',
    subtitle: 'Solo infiltration',
    desc:     'One developer. One hacker. No room to hide.',
    icon:     <path d="M7 14a3 3 0 100-6 3 3 0 000 6zm0 1.5c-2.7 0-8 1.35-8 4.05V21h16v-1.45c0-2.7-5.3-4.05-8-4.05z" />,
  },
  '5v5': {
    title:    '5 vs 5',
    subtitle: 'Full squad breach',
    desc:     'Coordinated teams. Maximum chaos. 10 players.',
    icon:     <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
  },
  training: {
    title:    'Training',
    subtitle: 'No rank at stake',
    desc:     'Practice both roles. Zero pressure, zero points.',
    icon:     <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01z" />,
  },
};

const ModeCard = ({ mode, selected, onClick }) => {
  const meta = MODE_META[mode];
  if (!meta) return null;

  return (
    <button
      onClick={onClick}
      style={{
        flex:         1,
        textAlign:    'left',
        padding:      '20px',
        background:   selected ? 'var(--green-ghost)' : 'var(--bg-secondary)',
        border:       `1px solid ${selected ? 'var(--green-bright)' : 'var(--border-primary)'}`,
        borderRadius: 'var(--radius-md)',
        cursor:       'pointer',
        transition:   'all var(--transition)',
        position:     'relative',
      }}
    >
      <svg
        width="28" height="28" viewBox="0 0 24 24"
        fill={selected ? 'var(--green-bright)' : 'var(--text-dim)'}
        style={{ marginBottom: '12px' }}
      >
        {meta.icon}
      </svg>
      <h3 style={{
        fontFamily:   'var(--font-display)',
        fontSize:     '1rem',
        color:        selected ? 'var(--green-bright)' : 'var(--text-primary)',
        marginBottom: '4px',
      }}>
        {meta.title}
      </h3>
      <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
        {meta.subtitle}
      </p>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        {meta.desc}
      </p>

      {selected && (
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '8px', height: '8px', borderRadius: '50%',
          background: 'var(--green-bright)',
          boxShadow: '0 0 8px var(--green-bright)',
        }} />
      )}
    </button>
  );
};

export default ModeCard;
