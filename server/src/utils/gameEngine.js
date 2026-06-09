// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Game Engine (Pure Logic)
// No Express, no Mongoose here — only game rules.
// All state mutations happen here, then the controller persists them.
// ─────────────────────────────────────────────────────────────────────────────

import { getTool, validateToolPurchase } from '../config/tools.js';

// ── Win condition constants ───────────────────────────────────────────────────

export const WIN_CONDITIONS = {
  BREACH:       'breach',        // hacker reached 100% breach progress
  DB_DESTROYED: 'db_destroyed',  // db health hit 0
  WORD_EXPOSED: 'word_exposed',  // hacker correctly submitted the secret word
  TIME_LIMIT:   'time_limit',    // timer ran out → developer wins
  INSTA_WIN:    'insta_win',     // root access succeeded
};

// ── Credit income ─────────────────────────────────────────────────────────────

export const CREDIT_INCOME_PER_TICK   = 15;  // credits earned every 10s passively
export const CREDIT_KILL_BONUS        = 30;  // bonus for destroying a defense tool
export const CREDIT_BLOCK_BONUS       = 10;  // developer earns this per blocked attack

// ── Deploy a defense tool ─────────────────────────────────────────────────────

/**
 * Attempt to deploy a defense tool for a developer.
 * Returns { success, reason, playerState, tool }
 */
export const deployTool = (playerState, toolId) => {
  if (playerState.isLocked) {
    return { success: false, reason: 'Your tools are locked by Ransomware' };
  }

  const { valid, reason, tool } = validateToolPurchase(toolId, 'developer', playerState.credits);
  if (!valid) return { success: false, reason };

  // Check not already deployed
  const alreadyDeployed = playerState.activeTools.some(
    t => t.toolId === toolId && !t.isDestroyed
  );
  if (alreadyDeployed) {
    return { success: false, reason: `${tool.name} is already deployed` };
  }

  const newTool = {
    toolId,
    deployedAt:  new Date(),
    isDestroyed: false,
    hitsToBreak: tool.stats.hitsToBreak ?? null,
    currentHits: 0,
  };

  return {
    success: true,
    tool,
    newTool,
    creditCost: tool.cost,
  };
};

// ── Launch an attack ──────────────────────────────────────────────────────────

/**
 * Resolve an attack from a hacker against the current round state.
 *
 * @param {object} hackerState    - attacker's playerState
 * @param {object} roundState     - { dbHealth, breachProgress, defenseTools[] }
 * @param {string} toolId         - which attack tool
 * @param {object} targetDefenses - array of active (non-destroyed) defense deployedTool docs
 *
 * @returns {object} resolution — what happened, new state deltas
 */
export const resolveAttack = (hackerState, roundState, toolId, targetDefenses) => {
  const { valid, reason, tool } = validateToolPurchase(toolId, 'hacker', hackerState.credits);
  if (!valid) return { success: false, reason };

  const result = {
    success:        true,
    toolId,
    toolName:       tool.name,
    wasBlocked:     false,
    wasDetected:    false,
    blockedBy:      null,
    damageDealt:    0,
    breachProgress: 0,
    destroyedToolId:null,
    stealthUsed:    false,
    creditCost:     tool.cost,
    devCreditBonus: 0,        // developer earns on block
    effects:        [],       // narrative effects for UI
  };

  // ── Stealth check ────────────────────────────────────────────────────────
  if (hackerState.isStealthed && hackerState.stealthCharges > 0) {
    result.stealthUsed = true;
    // stealthed attacks skip IDS detection — handled in controller
  }

  // ── Unblockable tools skip defense ───────────────────────────────────────
  if (tool.stats.unblockable) {
    result.effects.push('UNBLOCKABLE');
    // Zero Day: destroy a random active defense tool
    if (tool.stats.destroysOneTool && targetDefenses.length > 0) {
      const rndIdx = Math.floor(Math.random() * targetDefenses.length);
      result.destroyedToolId = targetDefenses[rndIdx].toolId;
      result.effects.push(`DESTROYED:${result.destroyedToolId}`);
    }
    result.damageDealt    = tool.stats.damage ?? 0;
    result.breachProgress = tool.stats.breachProgress ?? 0;
    return result;
  }

  // ── Defense resolution ────────────────────────────────────────────────────
  // Find active defenses that counter this tool
  const counteringDefenses = targetDefenses.filter(
    d => !d.isDestroyed && getTool(d.toolId)?.counters?.includes(toolId)
  );

  for (const defense of counteringDefenses) {
    const defTool = getTool(defense.toolId);

    // Block chance roll
    const blockChance = defTool.stats.blockChance ?? 0;
    const blockRoll   = Math.random() * 100;

    if (blockRoll < blockChance) {
      result.wasBlocked   = true;
      result.blockedBy    = defense.toolId;
      result.devCreditBonus = CREDIT_BLOCK_BONUS;
      result.effects.push(`BLOCKED_BY:${defense.toolId}`);
      break;
    }

    // Defense boost reduces damage even if not fully blocked
    const damageReduction = (defTool.stats.defenseBoost ?? 0) / 100;
    result.damageDealt    = Math.round((tool.stats.damage ?? 0) * (1 - damageReduction));
    result.breachProgress = Math.round((tool.stats.breachProgress ?? 0) * (1 - damageReduction));

    // Encryption: hit tracking
    if (defTool.stats.hitsToBreak) {
      defense.currentHits++;
      if (defense.currentHits >= defTool.stats.hitsToBreak) {
        result.destroyedToolId = defense.toolId;
        result.effects.push(`BROKE:${defense.toolId}`);
      }
    }

    // Honeypot: trap
    if (defTool.stats.trapDuration) {
      result.effects.push(`TRAPPED:${defTool.stats.trapDuration}`);
      result.wasBlocked = true;
      result.blockedBy  = defense.toolId;
    }

    // Miss chance (VPN Shield)
    const missChance = defTool.stats.missChance ?? 0;
    if (Math.random() * 100 < missChance) {
      result.wasBlocked = true;
      result.blockedBy  = defense.toolId;
      result.effects.push(`MISSED:${defense.toolId}`);
    }
  }

  // If no defense blocked, apply full damage
  if (!result.wasBlocked && counteringDefenses.length === 0) {
    result.damageDealt    = tool.stats.damage ?? 0;
    result.breachProgress = tool.stats.breachProgress ?? 0;
  }

  // ── IDS detection ─────────────────────────────────────────────────────────
  if (!result.stealthUsed) {
    const idsTools = targetDefenses.filter(d => !d.isDestroyed && d.toolId === 'IDS');
    if (idsTools.length > 0) {
      const ids = getTool('IDS');
      if (Math.random() * 100 < (ids.stats.detectionChance ?? 0)) {
        result.wasDetected = true;
        result.effects.push('DETECTED_BY_IDS');
      }
    }
  }

  // ── Data Exfil: reveal secret word letters ────────────────────────────────
  if (tool.stats.revealLetters && !result.wasBlocked) {
    result.revealLetters = tool.stats.revealLetters;
    result.effects.push(`REVEAL_LETTERS:${tool.stats.revealLetters}`);
  }

  return result;
};

// ── Secret word reveal helper ─────────────────────────────────────────────────

/**
 * Given a secret word and how many letters to reveal,
 * returns a masked version: e.g. "NETWORK" → "N_T_O_K"
 */
export const revealLetters = (word, count, alreadyRevealed = []) => {
  const upper    = word.toUpperCase();
  const indices  = [...Array(upper.length).keys()]
    .filter(i => !alreadyRevealed.includes(i))
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  const allRevealed = [...new Set([...alreadyRevealed, ...indices])].sort();
  const masked = upper
    .split('')
    .map((ch, i) => (allRevealed.includes(i) ? ch : '_'))
    .join('');

  return { masked, revealedIndices: allRevealed };
};

// ── Win condition checker ─────────────────────────────────────────────────────

/**
 * Check if the round has a winner yet.
 * Called after every state change.
 *
 * @returns {{ winner: 'developer'|'hacker'|null, condition: string|null }}
 */
export const checkWinCondition = (roundState) => {
  const { breachProgress, dbHealth, secretWordExposed } = roundState;

  if (secretWordExposed) {
    return { winner: 'hacker', condition: WIN_CONDITIONS.WORD_EXPOSED };
  }
  if (breachProgress >= 100) {
    return { winner: 'hacker', condition: WIN_CONDITIONS.BREACH };
  }
  if (dbHealth <= 0) {
    return { winner: 'hacker', condition: WIN_CONDITIONS.DB_DESTROYED };
  }
  return { winner: null, condition: null };
};

/**
 * Called when the round timer expires with no winner.
 * Developer wins by default (they protected the DB).
 */
export const resolveTimerExpiry = () => ({
  winner:    'developer',
  condition: WIN_CONDITIONS.TIME_LIMIT,
});

// ── Side-switch helper ────────────────────────────────────────────────────────

/**
 * Swap all players' currentTeam after round 5.
 * Returns updated players array.
 */
export const switchSides = (players) =>
  players.map(p => ({
    ...p,
    currentTeam: p.currentTeam === 'developer' ? 'hacker' : 'developer',
  }));

// ── Credit income tick ────────────────────────────────────────────────────────

/**
 * Apply passive credit income to all player states.
 * Called every 10 seconds by the game tick.
 */
export const applyIncomeTick = (playerStates) =>
  playerStates.map(p => ({
    ...p,
    credits: p.credits + CREDIT_INCOME_PER_TICK,
  }));

// ── Status effect expiry ──────────────────────────────────────────────────────

/**
 * Clear expired status effects (ransomware lock, stealth) on each tick.
 */
export const tickStatusEffects = (playerState, now = new Date()) => {
  const updated = { ...playerState };
  if (updated.isLocked && updated.lockExpiresAt && now >= updated.lockExpiresAt) {
    updated.isLocked      = false;
    updated.lockExpiresAt = null;
  }
  return updated;
};

// ── Build fresh player states for a new round ─────────────────────────────────

export const buildPlayerStates = (players, startCredits) =>
  players.map(p => ({
    userId:          p.userId,
    username:        p.username,
    team:            p.currentTeam,
    credits:         startCredits,
    activeTools:     [],
    isLocked:        false,
    lockExpiresAt:   null,
    isStealthed:     false,
    stealthCharges:  0,
    damageDealt:     0,
    damageBlocked:   0,
    toolsDeployed:   0,
    attacksLaunched: 0,
  }));
