import React from 'react';
import { getTierInfo, getTierProgress } from '../../theme/rankTiers.js';

// ─────────────────────────────────────────────────────────────────────────────
// RankBadge — shows tier name, points, and optionally a progress bar
// toward the next tier. Used in navbar, profile, leaderboard.
// ─────────────────────────────────────────────────────────────────────────────

const RankBadge = ({
  rank,                 // { tier, points, peak }
  size = 'md',          // 'sm' | 'md' | 'lg'
  showProgress = false,
  showPoints = true,
}) => {
  if (!rank) return null;

  const tier = getTierInfo(rank.tier);
  const progress = showProgress ? getTierProgress(rank.points) : null;

  const sizes = {
    sm: { font: '10px', pad: '3px 8px', gap: '4px' },
    md: { font: '11px', pad: '5px 12px', gap: '6px' },
    lg: { font: '13px', pad: '8px 16px', gap: '8px' },
  };
  const s = sizes[size];

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           s.gap,
        padding:       s.pad,
        border:        `1px solid ${tier.color}`,
        borderRadius:  'var(--radius-md)',
        background:    `${tier.color}11`,
      }}>
        <TierIcon tierName={tier.name} color={tier.color} size={size} />
        <span style={{
          fontFamily:    'var(--font-display)',
          fontSize:      s.font,
          letterSpacing: '0.08em',
          color:         tier.color,
          textTransform: 'uppercase',
          fontWeight:    700,
        }}>
          {tier.label}
        </span>
        {showPoints && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   s.font,
            color:      'var(--text-dim)',
          }}>
            {rank.points.toLocaleString()}
          </span>
        )}
      </div>

      {showProgress && progress && !progress.isMaxTier && (
        <div style={{ width: '100%', minWidth: '160px' }}>
          <div style={{
            height:       '4px',
            background:   'var(--bg-input)',
            borderRadius: '2px',
            overflow:     'hidden',
          }}>
            <div style={{
              height:     '100%',
              width:      `${progress.percent}%`,
              background: tier.color,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {progress.pointsToNext.toLocaleString()} pts to {progress.nextTier.label}
          </p>
        </div>
      )}
      {showProgress && progress?.isMaxTier && (
        <p style={{ fontSize: '9px', color: tier.color, marginTop: '2px' }}>
          ★ Max tier reached
        </p>
      )}
    </div>
  );
};

// ── Tier icon — simple geometric mark per tier, no external icon lib needed ──

const TierIcon = ({ tierName, color, size }) => {
  const dim = size === 'lg' ? 14 : size === 'sm' ? 10 : 12;

  const shapes = {
    SCRIPT_KIDDIE: <circle cx="7" cy="7" r="3" fill={color} />,
    GREY_HAT:      <rect x="4" y="4" width="6" height="6" fill={color} />,
    BLACK_HAT:     <path d="M7 2 L12 12 L2 12 Z" fill={color} />,
    ZERO_DAY:      <path d="M7 1 L13 7 L7 13 L1 7 Z" fill={color} />,
    APT:           <path d="M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z" fill={color} />,
  };

  return (
    <svg width={dim} height={dim} viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
      {shapes[tierName] ?? shapes.SCRIPT_KIDDIE}
    </svg>
  );
};

export default RankBadge;
