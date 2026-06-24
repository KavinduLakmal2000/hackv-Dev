// ─────────────────────────────────────────────────────────────────────────────
// Rank tier constants — MUST mirror server/src/utils/rank.js exactly.
// Client never calculates rank — this is for DISPLAY only (badges, progress bars).
// ─────────────────────────────────────────────────────────────────────────────

export const TIERS = [
  { name: 'SCRIPT_KIDDIE', min: 0,     label: 'Script Kiddie', color: '#666666' },
  { name: 'GREY_HAT',      min: 500,   label: 'Grey Hat',      color: '#888888' },
  { name: 'BLACK_HAT',     min: 1500,  label: 'Black Hat',     color: '#cc3333' },
  { name: 'ZERO_DAY',      min: 4000,  label: 'Zero Day',      color: '#ff6600' },
  { name: 'APT',           min: 10000, label: 'APT',           color: '#00ff41' },
];

export const getTierInfo = (tierName) =>
  TIERS.find((t) => t.name === tierName) ?? TIERS[0];

/**
 * Returns progress toward the NEXT tier as a 0–100 percentage,
 * plus the points remaining. Used for the progress bar under RankBadge.
 */
export const getTierProgress = (points) => {
  const idx = TIERS.findIndex((t, i) => {
    const next = TIERS[i + 1];
    return points >= t.min && (!next || points < next.min);
  });

  const current = TIERS[idx] ?? TIERS[0];
  const next     = TIERS[idx + 1] ?? null;

  if (!next) return { percent: 100, pointsToNext: 0, isMaxTier: true };

  const span    = next.min - current.min;
  const earned  = points - current.min;
  const percent = Math.min(100, Math.round((earned / span) * 100));

  return { percent, pointsToNext: next.min - points, isMaxTier: false, nextTier: next };
};

export const PREFERRED_ROLES = [
  { value: 'any',       label: 'No preference' },
  { value: 'developer', label: 'Developer' },
  { value: 'hacker',    label: 'Hacker' },
];
