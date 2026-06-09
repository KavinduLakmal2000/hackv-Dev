// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Game Socket Handler
// Handles all real-time in-game events.
// REST API handles persistence; Socket.io handles live synchronization.
//
// Room naming:
//   game:{sessionId}          — all players in a game
//   game:{sessionId}:dev      — developer team only
//   game:{sessionId}:hacker   — hacker team only
// ─────────────────────────────────────────────────────────────────────────────

import GameSession from '../models/GameSession.js';
import {
  deployTool,
  resolveAttack,
  checkWinCondition,
  resolveTimerExpiry,
  switchSides,
  buildPlayerStates,
  applyIncomeTick,
  tickStatusEffects,
  revealLetters,
  CREDIT_KILL_BONUS,
} from '../utils/gameEngine.js';
import { getTool } from '../config/tools.js';
import { timerManager } from '../utils/timerManager.js';
import { applyRankDelta, calculateRankPoints } from '../utils/rank.js';
import User from '../models/User.js';
import Lobby from '../models/Lobby.js';

// ── Role-filtered state builder ───────────────────────────────────────────────
// What each team is allowed to see:
// Developer → sees their active tools, DB health, NOT breach progress detail
// Hacker    → sees breach progress, NOT secret word, NOT enemy tool details

const buildClientState = (session, forTeam) => {
  const round = session.rounds[session.currentRound];
  if (!round) return null;

  const base = {
    sessionId:    session._id.toString(),
    currentRound: session.currentRound,
    roundNumber:  round.roundNumber,
    status:       round.status,
    endsAt:       round.endsAt,
    score:        session.score,
    dbHealth:     round.dbHealth,
    breachProgress: forTeam === 'hacker' ? round.breachProgress : undefined,
    secretWordHint:  round.secretWordHint,
    secretWordLength: round.secretWord?.length ?? null, // hacker sees length
    // Secret word ONLY goes to developer so they can verify it was set
    secretWord: forTeam === 'developer' ? round.secretWord : undefined,
  };

  // Each team sees their own player states in full, opponents' only partially
  base.myTeam = round.playerStates
    .filter(p => p.team === forTeam)
    .map(p => ({
      userId:          p.userId.toString(),
      username:        p.username,
      credits:         p.credits,
      activeTools:     p.activeTools.filter(t => !t.isDestroyed).map(t => ({
        toolId:      t.toolId,
        deployedAt:  t.deployedAt,
        hitsToBreak: t.hitsToBreak,
        currentHits: t.currentHits,
      })),
      isLocked:        p.isLocked,
      isStealthed:     p.isStealthed,
      stealthCharges:  p.stealthCharges,
      damageDealt:     p.damageDealt,
      toolsDeployed:   p.toolsDeployed,
      attacksLaunched: p.attacksLaunched,
    }));

  base.enemyTeam = round.playerStates
    .filter(p => p.team !== forTeam)
    .map(p => ({
      userId:          p.userId.toString(),
      username:        p.username,
      // Credits hidden from enemy
      activeToolCount: p.activeTools.filter(t => !t.isDestroyed).length,
      isLocked:        forTeam === 'hacker' ? p.isLocked : undefined, // hackers can see if dev is locked
    }));

  return base;
};

// ── Round expiry handler ──────────────────────────────────────────────────────
// Called by timerManager when the round clock hits 0

export const handleRoundExpiry = async (sessionId, io) => {
  try {
    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return;

    const round = session.rounds[session.currentRound];
    if (!round || round.status !== 'active') return;

    const { winner, condition } = resolveTimerExpiry();

    round.status      = 'finished';
    round.finishedAt  = new Date();
    round.winner      = winner;
    round.winCondition = condition;

    if (winner === 'developer') session.score.developer++;
    else if (winner === 'hacker') session.score.hacker++;

    const nextRoundIndex = session.currentRound + 1;
    const isLastRound    = nextRoundIndex >= session.settings.totalRounds;

    if (!isLastRound) {
      session.currentRound = nextRoundIndex;
      if (nextRoundIndex === 5 && session.mode !== 'training') {
        session.status  = 'switching_sides';
      }
    } else {
      await _finishGame(session, io);
    }

    await session.save();

    timerManager.clearCreditTick(sessionId);

    io.to(`game:${sessionId}`).emit('game:round_finished', {
      roundNumber:  round.roundNumber,
      winner,
      condition,
      score:        session.score,
      secretWord:   round.secretWord,    // reveal after round ends
      nextRound:    !isLastRound ? nextRoundIndex + 1 : null,
      isSwitching:  session.status === 'switching_sides',
    });

    console.log(`[GameSocket] Round ${round.roundNumber} expired → ${winner} wins (${sessionId})`);
  } catch (err) {
    console.error('[handleRoundExpiry]', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export const registerGameHandlers = (io, socket) => {
  const { user } = socket;

  // ── game:join ───────────────────────────────────────────────────────────────
  // Client joins all relevant rooms for this game
  socket.on('game:join', async ({ sessionId }, ack) => {
    try {
      if (!sessionId) return ack?.({ ok: false, error: 'sessionId required' });

      const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
      if (!session) return ack?.({ ok: false, error: 'Session not found' });

      const playerEntry = session.players.find(p => p.userId.toString() === user.id);
      if (!playerEntry) return ack?.({ ok: false, error: 'You are not in this game' });

      const team = playerEntry.currentTeam;

      // Join global room + team room
      await socket.join(`game:${sessionId}`);
      await socket.join(`game:${sessionId}:${team}`);
      socket.data.sessionId = sessionId;
      socket.data.team      = team;

      console.log(`[GameSocket] ${user.username} (${team}) joined game ${sessionId}`);

      // Send initial role-filtered state
      const clientState = buildClientState(session, team);
      ack?.({ ok: true, state: clientState, team });
    } catch (err) {
      console.error('[game:join]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── game:start_round ────────────────────────────────────────────────────────
  // Host triggers round start (after lobby:game_starting event)
  socket.on('game:start_round', async ({ sessionId }, ack) => {
    try {
      const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
      if (!session) return ack?.({ ok: false, error: 'Session not found' });

      // Only host or any player from the session can trigger this
      const isInGame = session.players.some(p => p.userId.toString() === user.id);
      if (!isInGame) return ack?.({ ok: false, error: 'Not in this game' });

      const round = session.rounds[session.currentRound];
      if (!round || round.status !== 'pending') {
        return ack?.({ ok: false, error: `Round is ${round?.status ?? 'unavailable'}` });
      }

      // Handle side-switch before starting round 6
      if (session.currentRound === 5 && session.mode !== 'training') {
        session.players = switchSides(
          session.players.map(p => (p.toObject ? p.toObject() : p))
        );
        // Rebuild player states with new teams
        session.rounds[5].playerStates = buildPlayerStates(
          session.players,
          session.settings.startCredits
        );
        session.status = 'in_progress';
      }

      const now    = new Date();
      const endsAt = new Date(now.getTime() + session.settings.roundDuration * 1_000);

      round.status    = 'active';
      round.startedAt = now;
      round.endsAt    = endsAt;
      session.status  = 'in_progress';

      await session.save();

      // Start server-side timer
      timerManager.startRoundTimer(
        sessionId,
        session.settings.roundDuration,
        io,
        handleRoundExpiry
      );

      // Start credit income ticks
      timerManager.startCreditTick(sessionId, io);

      // Send role-filtered state to each team room
      const devState    = buildClientState(session, 'developer');
      const hackerState = buildClientState(session, 'hacker');

      io.to(`game:${sessionId}:developer`).emit('game:round_started', {
        ...devState,
        endsAt:       endsAt.toISOString(),
        roundDuration: session.settings.roundDuration,
      });

      io.to(`game:${sessionId}:hacker`).emit('game:round_started', {
        ...hackerState,
        endsAt:       endsAt.toISOString(),
        roundDuration: session.settings.roundDuration,
      });

      console.log(`[GameSocket] Round ${round.roundNumber} started (${sessionId})`);
      ack?.({ ok: true, endsAt: endsAt.toISOString() });
    } catch (err) {
      console.error('[game:start_round]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── game:deploy ─────────────────────────────────────────────────────────────
  // Developer deploys a defense tool — fully resolved server-side
  socket.on('game:deploy', async ({ sessionId, toolId }, ack) => {
    try {
      const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
      if (!session) return ack?.({ ok: false, error: 'Session not found' });

      const team = session.getTeamForPlayer(user.id);
      if (team !== 'developer') return ack?.({ ok: false, error: 'Only developers can deploy' });

      const round = session.rounds[session.currentRound];
      if (!round || round.status !== 'active') return ack?.({ ok: false, error: 'Round not active' });

      const playerState = session.getPlayerState(user.id);
      const result      = deployTool(playerState, toolId);

      if (!result.success) return ack?.({ ok: false, error: result.reason });

      playerState.activeTools.push(result.newTool);
      playerState.credits    -= result.creditCost;
      playerState.toolsDeployed++;

      await session.save();

      // Notify developer team of their new tool
      io.to(`game:${sessionId}:developer`).emit('game:tool_deployed', {
        deployedBy: user.id,
        toolId,
        toolName:   result.tool.name,
        layer:      result.tool.target,
        creditCost: result.creditCost,
      });

      // Notify hacker team only that a new defense appeared (not what it is)
      io.to(`game:${sessionId}:hacker`).emit('game:defense_added', {
        layer: result.tool.target,
        // Hacker doesn't know which specific tool was deployed
      });

      ack?.({ ok: true, creditsRemaining: playerState.credits });
    } catch (err) {
      console.error('[game:deploy]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── game:attack ─────────────────────────────────────────────────────────────
  // Hacker launches an attack — fully resolved server-side
  socket.on('game:attack', async ({ sessionId, toolId }, ack) => {
    try {
      const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
      if (!session) return ack?.({ ok: false, error: 'Session not found' });

      const team = session.getTeamForPlayer(user.id);
      if (team !== 'hacker') return ack?.({ ok: false, error: 'Only hackers can attack' });

      const round = session.rounds[session.currentRound];
      if (!round || round.status !== 'active') return ack?.({ ok: false, error: 'Round not active' });

      const hackerState    = session.getPlayerState(user.id);
      const devStates      = round.playerStates.filter(p => p.team === 'developer');
      const targetDefenses = devStates.flatMap(p =>
        (p.activeTools ?? []).filter(t => !t.isDestroyed)
      );

      const roundState = {
        dbHealth:          round.dbHealth,
        breachProgress:    round.breachProgress,
        secretWordExposed: round.secretWordExposed,
      };

      const result = resolveAttack(hackerState, roundState, toolId, targetDefenses);
      if (!result.success) return ack?.({ ok: false, error: result.reason });

      // ── Apply state ────────────────────────────────────────────────────────
      hackerState.credits         -= result.creditCost;
      hackerState.attacksLaunched += 1;
      hackerState.damageDealt     += result.damageDealt;

      if (!result.wasBlocked) {
        round.dbHealth       = Math.max(0, round.dbHealth - result.damageDealt);
        round.breachProgress = Math.min(100, round.breachProgress + result.breachProgress);
      }

      // Destroyed defense
      if (result.destroyedToolId) {
        const destroyed = targetDefenses.find(t => t.toolId === result.destroyedToolId);
        if (destroyed) {
          destroyed.isDestroyed = true;
          destroyed.destroyedAt = new Date();
          hackerState.credits  += CREDIT_KILL_BONUS;
        }
      }

      // Letter reveal (Data Exfil)
      if (result.revealLetters && round.secretWord) {
        const alreadyRevealed = round._revealedIndices ?? [];
        const { masked, revealedIndices } = revealLetters(
          round.secretWord,
          result.revealLetters,
          alreadyRevealed
        );
        round._revealedIndices = revealedIndices;

        io.to(`game:${sessionId}:hacker`).emit('game:letters_revealed', {
          masked,
          revealedIndices,
        });
      }

      // Stealth charge use
      if (result.stealthUsed) {
        hackerState.stealthCharges = Math.max(0, hackerState.stealthCharges - 1);
        if (hackerState.stealthCharges === 0) hackerState.isStealthed = false;
      }

      // Dev block bonus
      if (result.wasBlocked && result.devCreditBonus > 0) {
        devStates.forEach(p => { p.credits += result.devCreditBonus; });
      }

      // Attack log
      round.attackLog.push({
        attackerId:     user._id,
        toolId,
        targetLayer:    getTool(toolId)?.target ?? 'unknown',
        timestamp:      new Date(),
        wasBlocked:     result.wasBlocked,
        wasDetected:    result.wasDetected,
        damageDealt:    result.damageDealt,
        breachProgress: result.breachProgress,
        blockedBy:      result.blockedBy,
      });

      // ── Win condition ──────────────────────────────────────────────────────
      const { winner, condition } = checkWinCondition({
        dbHealth:          round.dbHealth,
        breachProgress:    round.breachProgress,
        secretWordExposed: round.secretWordExposed,
      });

      if (winner) {
        await _resolveRoundWin(session, round, winner, condition, io);
      }

      await session.save();

      // ── Broadcast results (role-filtered) ─────────────────────────────────

      // Hacker gets their full result
      io.to(`game:${sessionId}:hacker`).emit('game:attack_result', {
        attackerId:     user.id,
        toolId,
        wasBlocked:     result.wasBlocked,
        damageDealt:    result.damageDealt,
        breachProgress: round.breachProgress,
        dbHealth:       round.dbHealth,
        effects:        result.effects,
        creditsRemaining: hackerState.credits,
      });

      // Developer gets a redacted notification
      io.to(`game:${sessionId}:developer`).emit('game:attack_incoming', {
        wasBlocked:  result.wasBlocked,
        blockedBy:   result.blockedBy,
        wasDetected: result.wasDetected,
        dbHealth:    round.dbHealth,
        effects:     result.effects.filter(e =>
          e.startsWith('BLOCKED_BY') || e.startsWith('DETECTED') || e.startsWith('BROKE')
        ),
      });

      if (winner) {
        io.to(`game:${sessionId}`).emit('game:round_finished', {
          roundNumber: round.roundNumber,
          winner,
          condition,
          score:       session.score,
          secretWord:  round.secretWord,
        });
      }

      ack?.({ ok: true, wasBlocked: result.wasBlocked, effects: result.effects });
    } catch (err) {
      console.error('[game:attack]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── game:set_secret_word ────────────────────────────────────────────────────
  socket.on('game:set_secret_word', async ({ sessionId, word, hint }, ack) => {
    try {
      if (!word || word.trim().length < 2 || word.trim().length > 20) {
        return ack?.({ ok: false, error: 'Word must be 2-20 alphanumeric characters' });
      }

      const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
      if (!session) return ack?.({ ok: false, error: 'Session not found' });

      const team = session.getTeamForPlayer(user.id);
      if (team !== 'developer') return ack?.({ ok: false, error: 'Only developers set the secret word' });

      const round = session.rounds[session.currentRound];
      if (!round || round.status !== 'active') return ack?.({ ok: false, error: 'Round not active' });
      if (round.secretWord) return ack?.({ ok: false, error: 'Secret word already set' });

      round.secretWord     = word.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      round.secretWordHint = hint?.trim().slice(0, 40) ?? null;

      await session.save();

      // Only tell hackers that a word was set — NOT the word itself
      io.to(`game:${sessionId}:hacker`).emit('game:secret_word_set', {
        hint:   round.secretWordHint,
        length: round.secretWord.length,
      });

      // Confirm to developer only
      io.to(`game:${sessionId}:developer`).emit('game:secret_word_confirmed', {
        word: round.secretWord,
        hint: round.secretWordHint,
      });

      ack?.({ ok: true });
    } catch (err) {
      console.error('[game:set_secret_word]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── game:guess ──────────────────────────────────────────────────────────────
  socket.on('game:guess', async ({ sessionId, guess }, ack) => {
    try {
      if (!guess || !guess.trim()) return ack?.({ ok: false, error: 'Guess required' });

      const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
      if (!session) return ack?.({ ok: false, error: 'Session not found' });

      const team = session.getTeamForPlayer(user.id);
      if (team !== 'hacker') return ack?.({ ok: false, error: 'Only hackers guess the word' });

      const round = session.rounds[session.currentRound];
      if (!round?.secretWord) return ack?.({ ok: false, error: 'No secret word set yet' });

      const correct = guess.trim().toUpperCase() === round.secretWord;

      if (correct) {
        round.secretWordExposed = true;
        round.exposedWord       = guess.trim().toUpperCase();

        await _resolveRoundWin(session, round, 'hacker', 'word_exposed', io);
        await session.save();

        io.to(`game:${sessionId}`).emit('game:round_finished', {
          roundNumber: round.roundNumber,
          winner:      'hacker',
          condition:   'word_exposed',
          score:       session.score,
          secretWord:  round.secretWord,
        });

        ack?.({ ok: true, correct: true, word: round.secretWord });
      } else {
        await session.save();
        // Only tell the guesser they were wrong — not the whole room
        ack?.({ ok: true, correct: false });
      }
    } catch (err) {
      console.error('[game:guess]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── game:chat ───────────────────────────────────────────────────────────────
  // In-game team-only chat (hackers can't see developer chat, and vice versa)
  socket.on('game:chat', ({ sessionId, message }, ack) => {
    const team = socket.data.team;
    if (!team || !sessionId) return ack?.({ ok: false });

    const text = String(message ?? '').trim().slice(0, 200);
    if (!text) return ack?.({ ok: false, error: 'Empty message' });

    io.to(`game:${sessionId}:${team}`).emit('game:chat', {
      userId:      user.id,
      username:    user.username,
      team,
      message:     text,
      timestamp:   new Date().toISOString(),
    });

    ack?.({ ok: true });
  });

  // ── game:request_state ──────────────────────────────────────────────────────
  // Client re-syncs (e.g. after reconnect)
  socket.on('game:request_state', async ({ sessionId }, ack) => {
    try {
      const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
      if (!session) return ack?.({ ok: false, error: 'Session not found' });

      const team  = session.getTeamForPlayer(user.id);
      if (!team)  return ack?.({ ok: false, error: 'Not in this game' });

      const state = buildClientState(session, team);
      ack?.({ ok: true, state, team });
    } catch (err) {
      console.error('[game:request_state]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── Disconnect cleanup ──────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const { sessionId, team } = socket.data;
    if (!sessionId) return;

    io.to(`game:${sessionId}`).emit('game:player_disconnected', {
      userId:   user.id,
      username: user.username,
      team,
    });
  });
};

// ── Internal: resolve a round win ─────────────────────────────────────────────

const _resolveRoundWin = async (session, round, winner, condition, io) => {
  timerManager.clearAll(session._id.toString());

  round.status      = 'finished';
  round.finishedAt  = new Date();
  round.winner      = winner;
  round.winCondition = condition;

  if (winner === 'developer') session.score.developer++;
  else if (winner === 'hacker') session.score.hacker++;

  const nextRoundIndex = session.currentRound + 1;
  const isLastRound    = nextRoundIndex >= session.settings.totalRounds;

  if (!isLastRound) {
    session.currentRound = nextRoundIndex;
    if (nextRoundIndex === 5 && session.mode !== 'training') {
      session.status = 'switching_sides';
      io.to(`game:${session._id}`).emit('game:switching_sides', {
        score:   session.score,
        message: 'Switching sides! Hackers become Defenders, Defenders become Hackers.',
      });
    }
  } else {
    await _finishGame(session, io);
  }
};

// ── Internal: finish the whole game ──────────────────────────────────────────

const _finishGame = async (session, io) => {
  const { developer, hacker } = session.score;
  let winner = 'draw';
  if (developer > hacker) winner = 'developer';
  if (hacker > developer) winner = 'hacker';

  session.status     = 'finished';
  session.winner     = winner;
  session.finishedAt = new Date();

  timerManager.clearAll(session._id.toString());

  // Update player stats and rank (training skipped)
  if (session.mode !== 'training') {
    for (const p of session.players) {
      const userDoc = await User.findById(p.userId).select('+refreshTokenVersion');
      if (!userDoc) continue;

      const playerWon = winner !== 'draw' && p.currentTeam === winner;
      const isDraw    = winner === 'draw';

      userDoc.stats.wins        += (playerWon && !isDraw) ? 1 : 0;
      userDoc.stats.losses      += (!playerWon && !isDraw) ? 1 : 0;
      userDoc.stats.draws       += isDraw ? 1 : 0;
      userDoc.stats.totalRounds += session.settings.totalRounds;

      const delta = calculateRankPoints({
        won:               playerWon,
        draw:              isDraw,
        mode:              session.mode,
        playerRole:        p.currentTeam,
        secretWordExposed: session.rounds.some(r => r.secretWordExposed),
        roundsPlayed:      session.settings.totalRounds,
      });

      userDoc.rank = applyRankDelta(
        userDoc.rank.toObject ? userDoc.rank.toObject() : userDoc.rank,
        delta
      );
      await userDoc.save();
    }
  }

  await Lobby.findOneAndUpdate({ code: session.lobbyCode }, { status: 'finished' });

  io.to(`game:${session._id}`).emit('game:finished', {
    winner,
    score:     session.score,
    players:   session.players.map(p => ({ userId: p.userId.toString(), team: p.currentTeam })),
  });
};
