// ── Rank tier thresholds ──────────────────────────────────────────────────────
// Points needed to REACH each tier

export const TIERS = [
  { name: 'SCRIPT_KIDDIE', min: 0,      label: 'Script Kiddie', color: '#666666' },
  { name: 'GREY_HAT',      min: 500,    label: 'Grey Hat',      color: '#888888' },
  { name: 'BLACK_HAT',     min: 1500,   label: 'Black Hat',     color: '#cc3333' },
  { name: 'ZERO_DAY',      min: 4000,   label: 'Zero Day',      color: '#ff6600' },
  { name: 'APT',           min: 10000,  label: 'APT',           color: '#00ff41' },
];

/**
 * Calculate the tier name for a given points total.
 */
export const getTierForPoints = (points) => {
  let tier = TIERS[0].name;
  for (const t of TIERS) {
    if (points >= t.min) tier = t.name;
    else break;
  }
  return tier;
};

/**
 * Calculate rank points earned after a game round.
 *
 * @param {object} result
 * @param {boolean} result.won
 * @param {boolean} result.draw
 * @param {string}  result.mode       - '1v1' | '5v5' | 'training'
 * @param {string}  result.playerRole - 'developer' | 'hacker'
 * @param {boolean} result.secretWordExposed
 * @param {number}  result.roundsPlayed
 */
export const calculateRankPoints = ({
  won,
  draw,
  mode,
  playerRole,
  secretWordExposed,
  roundsPlayed = 5,
}) => {
  if (mode === 'training') return 0; // training never gives rank points

  let base = 0;

  if (won)       base = 30;
  else if (draw) base = 10;
  else           base = -15; // loss

  // Mode multiplier
  const modeMultiplier = mode === '5v5' ? 1.5 : 1.0;

  // Bonus for exposing / protecting the secret word
  let bonus = 0;
  if (won && playerRole === 'hacker'    && secretWordExposed)  bonus = 10;
  if (won && playerRole === 'developer' && !secretWordExposed) bonus = 10;

  // Full round bonus
  if (roundsPlayed === 5) bonus += 5;

  return Math.round(base * modeMultiplier + bonus);
};

/**
 * Apply rank point delta to a user and update their tier.
 * Returns the updated rank object (not saved yet — caller must save).
 *
 * @param {object} rank - user.rank sub-document
 * @param {number} delta
 */
export const applyRankDelta = (rank, delta) => {
  const newPoints = Math.max(0, rank.points + delta);
  const newTier   = getTierForPoints(newPoints);

  // Track peak tier
  const tierOrder = TIERS.map(t => t.name);
  const peakIdx   = tierOrder.indexOf(rank.peak  || 'SCRIPT_KIDDIE');
  const newIdx    = tierOrder.indexOf(newTier);
  const peak      = newIdx > peakIdx ? newTier : rank.peak;

  return { points: newPoints, tier: newTier, peak };
};
