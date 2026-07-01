import React, { useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EventFeed — rolling terminal-style log of everything happening in the
// round. Purely cosmetic/informational — never the source of game state.
// ─────────────────────────────────────────────────────────────────────────────

const TONE_COLORS = {
  info:    'var(--text-dim)',
  success: 'var(--green-bright)',
  danger:  'var(--red-bright)',
  warn:    'var(--amber)',
  dev:     'var(--blue-info)',
};

const EventFeed = ({ events }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [events]);

  return (
    <div
      ref={scrollRef}
      style={{
        height: '160px', overflowY: 'auto', display: 'flex',
        flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px',
      }}
    >
      {events.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
          Awaiting activity...
        </p>
      )}
      {events.map((e, i) => (
        <div key={`${e.ts}-${i}`} style={{ display: 'flex', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            {new Date(e.ts).toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span style={{ color: TONE_COLORS[e.tone] ?? TONE_COLORS.info }}>
            {e.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default EventFeed;
