import React, { useEffect, useState } from 'react';
import useMailStore from '../../store/mailStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// AnnouncementBanner — reads from the server's MaintenanceConfig singleton
// via GET /config. Admin sets this from ServerConfigPage.
// Shown above the Navbar for all authenticated users.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_STYLES = {
  info:     { bg: 'var(--blue-info)',   text: '#051020', border: 'var(--blue-info)' },
  warning:  { bg: 'var(--amber)',       text: '#0a0800', border: 'var(--amber)' },
  critical: { bg: 'var(--red-bright)',  text: '#0a0000', border: 'var(--red-bright)' },
};

const AnnouncementBanner = () => {
  const { publicConfig, fetchPublicConfig } = useMailStore();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { fetchPublicConfig(); }, [fetchPublicConfig]);

  const ann = publicConfig?.announcement;

  if (!ann?.enabled || !ann?.message || dismissed) return null;

  const s = TYPE_STYLES[ann.type] ?? TYPE_STYLES.info;

  return (
    <div style={{
      background:   s.bg,
      color:        s.text,
      padding:      '8px 20px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      gap:          '12px',
      fontSize:     '12px',
      fontFamily:   'var(--font-mono)',
      zIndex:       60,
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.05em' }}>
        {ann.type === 'critical' ? '⚠ CRITICAL' : ann.type === 'warning' ? '⚠ NOTICE' : 'ℹ INFO'}
      </span>
      <span>{ann.message}</span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          color: s.text, cursor: 'pointer', fontSize: '14px', opacity: 0.7,
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default AnnouncementBanner;
