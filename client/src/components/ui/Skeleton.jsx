import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loaders — terminal-aesthetic pulsing placeholders.
// Used while data is fetching so the layout doesn't jump.
// ─────────────────────────────────────────────────────────────────────────────

const pulse = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.8; }
  }
`;

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
  const style = document.createElement('style');
  style.id = 'skeleton-style';
  style.textContent = pulse;
  document.head.appendChild(style);
}

const BASE = {
  background:    'var(--bg-elevated)',
  borderRadius:  'var(--radius-md)',
  animation:     'skeleton-pulse 1.4s ease-in-out infinite',
};

// ── Primitives ─────────────────────────────────────────────────────────────────

export const SkeletonLine = ({ width = '100%', height = '14px', style = {} }) => (
  <div style={{ ...BASE, width, height, marginBottom: '8px', ...style }} />
);

export const SkeletonBox = ({ height = '80px', style = {} }) => (
  <div style={{ ...BASE, width: '100%', height, ...style }} />
);

export const SkeletonAvatar = ({ size = 40 }) => (
  <div style={{ ...BASE, width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
);

export const SkeletonBadge = () => (
  <div style={{ ...BASE, width: '90px', height: '24px', borderRadius: '4px' }} />
);

// ── Page-level skeleton layouts ────────────────────────────────────────────────

export const LeaderboardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px' }}>
        <SkeletonLine width="24px" height="14px" style={{ marginBottom: 0 }} />
        <SkeletonAvatar size={28} />
        <SkeletonLine width="140px" height="14px" style={{ marginBottom: 0 }} />
        <div style={{ flex: 1 }} />
        <SkeletonBadge />
        <SkeletonLine width="60px" height="14px" style={{ marginBottom: 0 }} />
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)' }}>
      <SkeletonAvatar size={80} />
      <SkeletonLine width="60%" />
      <SkeletonLine width="40%" />
      <SkeletonBadge />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)' }}>
      <SkeletonLine width="40%" height="18px" />
      <SkeletonLine />
      <SkeletonLine width="80%" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '8px' }}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonBox key={i} height="64px" />)}
      </div>
    </div>
  </div>
);

export const ShopSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
    {Array.from({ length: 8 }).map((_, i) => <SkeletonBox key={i} height="160px" />)}
  </div>
);

export const DashboardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height="90px" />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
      {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height="80px" />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <SkeletonBox height="240px" />
      <SkeletonBox height="240px" />
    </div>
  </div>
);

export const InboxSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)' }}>
        <SkeletonBadge />
        <SkeletonLine style={{ flex: 1, marginBottom: 0 }} />
        <SkeletonLine width="80px" style={{ marginBottom: 0 }} />
      </div>
    ))}
  </div>
);
