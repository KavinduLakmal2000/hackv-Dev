// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Server-side Timer Manager
// All timers live here — never on the client.
// Client shows a countdown UI, but the server decides when time is actually up.
// ─────────────────────────────────────────────────────────────────────────────

import { creditIncomeTick } from '../controllers/gameController.js';

const CREDIT_TICK_INTERVAL = 10_000; // 10 seconds

class TimerManager {
  constructor() {
    // sessionId → { roundTimer, creditTimer }
    this._timers = new Map();
  }

  // ── startRoundTimer ─────────────────────────────────────────────────────────
  /**
   * Starts a countdown for the given session's current round.
   * When it fires, emits 'game:round_expired' and cleans up.
   *
   * @param {string}   sessionId
   * @param {number}   durationSeconds
   * @param {object}   io             - Socket.io server instance
   * @param {Function} onExpire       - async callback(sessionId, io)
   */
  startRoundTimer(sessionId, durationSeconds, io, onExpire) {
    this.clearRoundTimer(sessionId); // always clear existing first

    const existing = this._timers.get(sessionId) ?? {};

    // Tick countdown every second → sends time_remaining to clients
    let remaining = durationSeconds;
    const countdownInterval = setInterval(() => {
      remaining--;
      io.to(`game:${sessionId}`).emit('game:tick', { remaining });

      // Warning pulses
      if (remaining === 30 || remaining === 10 || remaining === 5) {
        io.to(`game:${sessionId}`).emit('game:timer_warning', { remaining });
      }

      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1_000);

    // Hard expiry fires exactly once after duration
    const roundTimeout = setTimeout(async () => {
      clearInterval(countdownInterval);
      try {
        await onExpire(sessionId, io);
      } catch (err) {
        console.error(`[TimerManager] onExpire error for ${sessionId}:`, err);
      }
      this.clearRoundTimer(sessionId);
    }, durationSeconds * 1_000);

    this._timers.set(sessionId, {
      ...existing,
      roundTimeout,
      countdownInterval,
    });

    console.log(`[TimerManager] Round timer started: ${sessionId} (${durationSeconds}s)`);
  }

  // ── startCreditTick ─────────────────────────────────────────────────────────
  /**
   * Starts the passive credit income tick for a session.
   * Fires every 10s for the life of the round.
   */
  startCreditTick(sessionId, io) {
    this.clearCreditTick(sessionId);

    const existing = this._timers.get(sessionId) ?? {};

    const creditInterval = setInterval(async () => {
      try {
        await creditIncomeTick(sessionId, io);
      } catch (err) {
        console.error(`[TimerManager] creditIncomeTick error for ${sessionId}:`, err);
      }
    }, CREDIT_TICK_INTERVAL);

    this._timers.set(sessionId, { ...existing, creditInterval });

    console.log(`[TimerManager] Credit tick started: ${sessionId}`);
  }

  // ── clearRoundTimer ─────────────────────────────────────────────────────────
  clearRoundTimer(sessionId) {
    const timers = this._timers.get(sessionId);
    if (!timers) return;

    if (timers.roundTimeout)      clearTimeout(timers.roundTimeout);
    if (timers.countdownInterval) clearInterval(timers.countdownInterval);

    this._timers.set(sessionId, {
      ...timers,
      roundTimeout:      null,
      countdownInterval: null,
    });
  }

  // ── clearCreditTick ─────────────────────────────────────────────────────────
  clearCreditTick(sessionId) {
    const timers = this._timers.get(sessionId);
    if (!timers) return;

    if (timers.creditInterval) clearInterval(timers.creditInterval);

    this._timers.set(sessionId, { ...timers, creditInterval: null });
  }

  // ── clearAll ────────────────────────────────────────────────────────────────
  clearAll(sessionId) {
    this.clearRoundTimer(sessionId);
    this.clearCreditTick(sessionId);
    this._timers.delete(sessionId);
    console.log(`[TimerManager] All timers cleared: ${sessionId}`);
  }

  // ── hasActiveTimer ──────────────────────────────────────────────────────────
  hasActiveTimer(sessionId) {
    const t = this._timers.get(sessionId);
    return !!(t?.roundTimeout);
  }

  // ── activeCount ─────────────────────────────────────────────────────────────
  get activeCount() {
    return this._timers.size;
  }
}

// Singleton — one timer manager for the entire process
export const timerManager = new TimerManager();
