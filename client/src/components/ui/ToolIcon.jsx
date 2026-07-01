import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ToolIcon — minimal inline SVG icon set, one per tool icon key.
// No external icon library dependency for this small fixed set.
// ─────────────────────────────────────────────────────────────────────────────

const PATHS = {
  shield:        'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z',
  lock:          'M6 10V8a6 6 0 1112 0v2m-13 0h14v10H5V10z',
  bug:           'M9 9V7a3 3 0 116 0v2M5 13h14M7 9l-2-2m14 2l2-2M7 17l-2 2m14-2l2 2M9 9h6v8a3 3 0 01-6 0V9z',
  eye:           'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M12 14a2 2 0 100-4 2 2 0 000 4z',
  globe:         'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10c-2.5-2.5-4-6-4-10s1.5-7.5 4-10z',
  key:           'M15 7a4 4 0 11-4 4M3 21l8-8m2-2l2 2-2 2-2-2 2-2z',
  'shield-check':'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z M9 12l2 2 4-4',
  'shield-x':    'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z M9.5 9.5l5 5m0-5l-5 5',
  database:      'M12 4c-4.4 0-8 1.3-8 3v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7c0-1.7-3.6-3-8-3z M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  scan:          'M4 8V5a1 1 0 011-1h3M4 16v3a1 1 0 001 1h3M20 8V5a1 1 0 00-1-1h-3M20 16v3a1 1 0 01-1 1h-3M3 12h18',
  terminal:      'M4 4h16v16H4V4z M7 9l3 3-3 3M13 15h4',
  activity:      'M22 12h-4l-3 9L9 3l-3 9H2',
  search:        'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3',
  zap:           'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
  'eye-off':     'M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 4.2A10 10 0 0121 12a13 13 0 01-1.7 2.4M6.1 6.1A13 13 0 003 12a10 10 0 0010.7 6.2',
  'user-x':      'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM17 8l5 5m0-5l-5 5',
  download:      'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  skull:         'M12 2a8 8 0 00-8 8c0 3 1.5 5 2 6v2a1 1 0 001 1h1v-2h1v2h2v-2h1v2h1a1 1 0 001-1v-2c.5-1 2-3 2-6a8 8 0 00-8-8zM9 12a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2z',
  'lock-open':   'M6 10V8a6 6 0 0110-4.5M5 10h14v10H5V10z',
  crown:         'M3 18h18l-2-9-4 3-3-6-3 6-4-3-2 9z',
};

const ToolIcon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.6 }) => {
  const d = PATHS[name];
  if (!d) {
    return <svg width={size} height={size} viewBox="0 0 24 24" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default ToolIcon;
