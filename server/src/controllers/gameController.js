import GameSession from '../models/GameSession.js';
import Lobby from '../models/Lobby.js';
import User from '../models/User.js';
import { getTool } from '../config/tools.js';
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
import { applyRankDelta, calculateRankPoints } from '../utils/rank.js';
import {
  ok, created, badRequest, forbidden,
  notFound, conflict, serverError,
} from '../utils/apiResponse.js';

// ── Emit helper (Slice 5 wires Socket.io) ────────────────────────────────────

const emit = (req, room, event, data) => {
  const io = req.app.get('io');
  if (io) io.to(room).emit(event, data);
};

// ── Role-filtered game state ──────────────────────────────────────────────────
// We NEVER send the secret word to hackers.
// We NEVER send the full breach progress breakdown to developers.

const filteredStateForPlayer = (session, userId) => {
  const team      = session.getTeamForPlayer(userId);
  const state     = session.toJSON();
  const round     = state.rounds[session.currentRound];

  if (!round) return state;

  // Hacker sees breach progress and db health, NOT secret word (already stripped by toJSON)
  // Developer sees deployed defenses, NOT hacker's activeTools in detail
  if (team === 'developer') {
    // Strip hacker tool details (show only counts, not which specific tools)
    round.hackerToolCount = round.playerStates
      .filter(p => p.team === 'hacker')
      .reduce((sum, p) => sum + (p.activeTools?.length ?? 0), 0);

    round.playerStates = round.playerStates.map(p => {
      if (p.team === 'hacker') {
        return { ...p, activeTools: undefined }; // hide hacker tools from dev
      }
      return p;
    });
  }

  return state;
};

// ── initializeGame ────────────────────────────────────────────────────────────
// Called by lobbyController.startGame → creates the GameSession document

export const initializeGame = async (req, res) => {
  try {
    const { code } = req.params;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');
    if (lobby.status !== 'in_progress') return badRequest(res, 'Lobby has not started');

    // Idempotency — prevent double-initialization
    const existing = await GameSession.findOne({ lobbyCode: code.toUpperCase(), status: { $ne: 'abandoned' } });
    if (existing) return ok(res, { session: existing.toJSON() }, 'Game already initialized');

    // Build player roster from lobby
    const players = lobby.players.map(p => ({
      userId:       p.userId,
      username:     p.username,
      displayName:  p.displayName,
      avatarUrl:    p.avatarUrl,
      originalTeam: p.team,
      currentTeam:  p.team,
    }));

    // Total rounds = 5 per side = 10 rounds; training = 5 only
    const totalRounds = lobby.mode === 'training' ? 5 : 10;

    const session = new GameSession({
      lobbyCode: code.toUpperCase(),
      mode:      lobby.mode,
      players,
      settings: {
        totalRounds,
        roundDuration: lobby.settings.roundDuration,
        startCredits:  lobby.settings.startCredits,
      },
      rounds:       [],
      currentRound: 0,
      status:       'initializing',
    });

    // Pre-create all round scaffolds
    for (let i = 0; i < totalRounds; i++) {
      session.rounds.push({
        roundNumber:  i + 1,
        status:       'pending',
        playerStates: buildPlayerStates(players, lobby.settings.startCredits),
        attackLog:    [],
        dbHealth:     100,
        breachProgress: 0,
      });
    }

    await session.save();

    // Link session back to lobby
    lobby.gameSessionId = session._id;
    await lobby.save();

    emit(req, `lobby:${code}`, 'game:initialized', { sessionId: session._id });

    return created(res, { session: session.toJSON() }, 'Game session initialized');
  } catch (err) {
    console.error('[initializeGame]', err);
    return serverError(res);
  }
};

// ── startRound ────────────────────────────────────────────────────────────────

export const startRound = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return notFound(res, 'Game session not found');

    const round = session.rounds[session.currentRound];
    if (!round) return badRequest(res, 'No more rounds');
    if (round.status !== 'pending') return conflict(res, `Round is already ${round.status}`);

    // Switch sides at round 5 (index 4→5)
    if (session.currentRound === 5 && session.mode !== 'training') {
      session.players = switchSides(session.players.toObject
        ? session.players.toObject()
        : session.players);
      session.status  = 'in_progress';

      // Rebuild player states with new teams
      session.rounds[5].playerStates = buildPlayerStates(session.players, session.settings.startCredits);
    }

    const now    = new Date();
    const endsAt = new Date(now.getTime() + session.settings.roundDuration * 1000);

    round.status    = 'active';
    round.startedAt = now;
    round.endsAt    = endsAt;
    session.status  = 'in_progress';

    await session.save();

    // Emit role-filtered state to each player (Slice 5 handles the per-socket filtering)
    emit(req, `game:${sessionId}`, 'game:round_started', {
      roundNumber:   round.roundNumber,
      endsAt:        endsAt.toISOString(),
      roundDuration: session.settings.roundDuration,
    });

    return ok(res, {
      roundNumber:   round.roundNumber,
      endsAt:        endsAt.toISOString(),
    }, `Round ${round.roundNumber} started`);
  } catch (err) {
    console.error('[startRound]', err);
    return serverError(res);
  }
};

// ── setSecretWord ─────────────────────────────────────────────────────────────
// Developer sets the secret word at the beginning of their defense round

export const setSecretWord = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { word, hint } = req.body;
    const userId = req.user._id;

    if (!word || word.trim().length < 2 || word.trim().length > 20) {
      return badRequest(res, 'Secret word must be 2–20 characters');
    }
    if (hint && hint.length > 40) {
      return badRequest(res, 'Hint must be 40 characters or less');
    }

    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return notFound(res, 'Session not found');

    const team = session.getTeamForPlayer(userId);
    if (team !== 'developer') return forbidden(res, 'Only developers set the secret word');

    const round = session.rounds[session.currentRound];
    if (round.status !== 'active') return badRequest(res, 'Round is not active');
    if (round.secretWord) return conflict(res, 'Secret word already set for this round');

    round.secretWord     = word.trim().toUpperCase();
    round.secretWordHint = hint?.trim() ?? null;

    await session.save();

    // Tell ALL players a secret word was set (but NOT what it is)
    emit(req, `game:${sessionId}`, 'game:secret_word_set', {
      roundNumber: round.roundNumber,
      hint:        round.secretWordHint,
      length:      round.secretWord.length,
    });

    return ok(res, { hint: round.secretWordHint, length: round.secretWord.length }, 'Secret word set');
  } catch (err) {
    console.error('[setSecretWord]', err);
    return serverError(res);
  }
};

// ── deployDefense ─────────────────────────────────────────────────────────────

export const deployDefense = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { toolId }    = req.body;
    const userId        = req.user._id;

    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return notFound(res, 'Session not found');

    const team = session.getTeamForPlayer(userId);
    if (team !== 'developer') return forbidden(res, 'Only developers can deploy defenses');

    const round       = session.rounds[session.currentRound];
    if (round.status !== 'active') return badRequest(res, 'Round is not active');

    const playerState = session.getPlayerState(userId);
    if (!playerState) return badRequest(res, 'Player state not found');
    if (playerState.isLocked) return forbidden(res, 'Your tools are locked by Ransomware');

    const result = deployTool(playerState, toolId);
    if (!result.success) return badRequest(res, result.reason);

    // Apply to state
    playerState.activeTools.push(result.newTool);
    playerState.credits     -= result.creditCost;
    playerState.toolsDeployed++;

    await session.save();

    emit(req, `game:${sessionId}`, 'game:defense_deployed', {
      userId:   userId.toString(),
      toolId,
      toolName: result.tool.name,
      layer:    result.tool.target,
    });

    return ok(res, {
      toolId,
      creditsRemaining: playerState.credits,
    }, `${result.tool.name} deployed`);
  } catch (err) {
    console.error('[deployDefense]', err);
    return serverError(res);
  }
};

// ── launchAttack ──────────────────────────────────────────────────────────────

export const launchAttack = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { toolId }    = req.body;
    const userId        = req.user._id;

    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return notFound(res, 'Session not found');

    const team = session.getTeamForPlayer(userId);
    if (team !== 'hacker') return forbidden(res, 'Only hackers can launch attacks');

    const round = session.rounds[session.currentRound];
    if (round.status !== 'active') return badRequest(res, 'Round is not active');

    const hackerState = session.getPlayerState(userId);
    if (!hackerState) return badRequest(res, 'Player state not found');

    // Collect all active defense tools from all developer players this round
    const devStates      = round.playerStates.filter(p => p.team === 'developer');
    const targetDefenses = devStates.flatMap(p =>
      (p.activeTools ?? []).filter(t => !t.isDestroyed)
    );

    const roundState = {
      dbHealth:       round.dbHealth,
      breachProgress: round.breachProgress,
      secretWordExposed: round.secretWordExposed,
    };

    const result = resolveAttack(hackerState, roundState, toolId, targetDefenses);
    if (!result.success) return badRequest(res, result.reason);

    // ── Apply state changes ───────────────────────────────────────────────

    hackerState.credits          -= result.creditCost;
    hackerState.attacksLaunched  += 1;
    hackerState.damageDealt      += result.damageDealt;

    if (!result.wasBlocked) {
      round.dbHealth        = Math.max(0, round.dbHealth - result.damageDealt);
      round.breachProgress  = Math.min(100, round.breachProgress + result.breachProgress);
    }

    // Destroyed defense tool
    if (result.destroyedToolId) {
      const destroyed = targetDefenses.find(t => t.toolId === result.destroyedToolId);
      if (destroyed) {
        destroyed.isDestroyed = true;
        destroyed.destroyedAt = new Date();
        hackerState.credits  += CREDIT_KILL_BONUS; // bonus for killing a defense
      }
      // Developer loses a tool — update their playerState
      const ownerState = devStates.find(p =>
        p.activeTools.some(t => t.toolId === result.destroyedToolId && !t.isDestroyed)
      );
      if (ownerState) ownerState.damageBlocked++; // track for stats
    }

    // Secret word letter reveal (Data Exfil)
    if (result.revealLetters) {
      const currentRevealed = round._revealedIndices ?? [];
      const { masked, revealedIndices } = revealLetters(
        round.secretWord ?? '?????',
        result.revealLetters,
        currentRevealed
      );
      round._revealedIndices = revealedIndices;

      emit(req, `game:${sessionId}`, 'game:letters_revealed', {
        masked,
        revealedIndices,
        roundNumber: round.roundNumber,
      });
    }

    // Stealth charge consumption
    if (result.stealthUsed) {
      hackerState.stealthCharges = Math.max(0, hackerState.stealthCharges - 1);
      if (hackerState.stealthCharges === 0) hackerState.isStealthed = false;
    }

    // Developer credit bonus for block
    if (result.wasBlocked && result.devCreditBonus > 0) {
      devStates.forEach(p => { p.credits += result.devCreditBonus; });
    }

    // Log the event
    round.attackLog.push({
      attackerId:     userId,
      toolId,
      targetLayer:    getTool(toolId)?.target ?? 'unknown',
      timestamp:      new Date(),
      wasBlocked:     result.wasBlocked,
      wasDetected:    result.wasDetected,
      damageDealt:    result.damageDealt,
      breachProgress: result.breachProgress,
      blockedBy:      result.blockedBy,
    });

    // ── Win condition check ───────────────────────────────────────────────
    const { winner, condition } = checkWinCondition({
      dbHealth:          round.dbHealth,
      breachProgress:    round.breachProgress,
      secretWordExposed: round.secretWordExposed,
    });

    if (winner) {
      await _finishRound(session, round, winner, condition);
    }

    await session.save();

    // Emit role-filtered result
    emit(req, `game:${sessionId}`, 'game:attack_resolved', {
      attackerId:     userId.toString(),
      toolId,
      wasBlocked:     result.wasBlocked,
      wasDetected:    result.wasDetected,
      effects:        result.effects,
      dbHealth:       round.dbHealth,
      breachProgress: round.breachProgress,
      roundWinner:    winner,
    });

    return ok(res, {
      wasBlocked:       result.wasBlocked,
      wasDetected:      result.wasDetected,
      damageDealt:      result.damageDealt,
      breachProgress:   round.breachProgress,
      dbHealth:         round.dbHealth,
      creditsRemaining: hackerState.credits,
      effects:          result.effects,
      roundWinner:      winner,
    });
  } catch (err) {
    console.error('[launchAttack]', err);
    return serverError(res);
  }
};

// ── submitSecretWord ──────────────────────────────────────────────────────────
// Hacker submits their guess at the secret word

export const submitSecretWord = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { guess }     = req.body;
    const userId        = req.user._id;

    if (!guess) return badRequest(res, 'Guess is required');

    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return notFound(res, 'Session not found');

    const team = session.getTeamForPlayer(userId);
    if (team !== 'hacker') return forbidden(res, 'Only hackers can submit secret word guesses');

    const round = session.rounds[session.currentRound];
    if (round.status !== 'active') return badRequest(res, 'Round is not active');
    if (!round.secretWord) return badRequest(res, 'Developer has not set a secret word yet');

    const correct = guess.trim().toUpperCase() === round.secretWord.toUpperCase();

    if (correct) {
      round.secretWordExposed = true;
      round.exposedWord       = guess.trim().toUpperCase();

      await _finishRound(session, round, 'hacker', 'word_exposed');
      await session.save();

      emit(req, `game:${sessionId}`, 'game:secret_word_exposed', {
        word:        round.secretWord,
        exposedBy:   userId.toString(),
        roundNumber: round.roundNumber,
      });

      return ok(res, { correct: true, word: round.secretWord }, 'Secret word exposed! Hacker wins this round!');
    }

    await session.save();

    return ok(res, { correct: false }, 'Wrong guess');
  } catch (err) {
    console.error('[submitSecretWord]', err);
    return serverError(res);
  }
};

// ── expireRound ───────────────────────────────────────────────────────────────
// Called by timer (Socket.io in Slice 5) when round time runs out

export const expireRound = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return notFound(res, 'Session not found');

    const round = session.rounds[session.currentRound];
    if (!round || round.status !== 'active') {
      return badRequest(res, 'No active round to expire');
    }

    const { winner, condition } = resolveTimerExpiry();
    await _finishRound(session, round, winner, condition);
    await session.save();

    emit(req, `game:${sessionId}`, 'game:round_expired', {
      roundNumber: round.roundNumber,
      winner,
      condition,
    });

    return ok(res, { winner, condition }, 'Round expired — developer wins');
  } catch (err) {
    console.error('[expireRound]', err);
    return serverError(res);
  }
};

// ── getSessionState ───────────────────────────────────────────────────────────

export const getSessionState = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId        = req.user._id;

    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session) return notFound(res, 'Session not found');

    // Only players in this game can see the state
    const isInGame = session.players.some(p => p.userId.toString() === userId.toString());
    if (!isInGame) return forbidden(res, 'You are not in this game');

    return ok(res, { session: filteredStateForPlayer(session, userId) });
  } catch (err) {
    console.error('[getSessionState]', err);
    return serverError(res);
  }
};

// ── creditIncomeTick ──────────────────────────────────────────────────────────
// Triggered every 10s by game tick (Slice 5 Socket.io interval)

export const creditIncomeTick = async (sessionId, io) => {
  try {
    const session = await GameSession.findById(sessionId).select('+rounds.secretWord');
    if (!session || session.status !== 'in_progress') return;

    const round = session.rounds[session.currentRound];
    if (!round || round.status !== 'active') return;

    const now = new Date();

    // Apply income + expire status effects
    round.playerStates = round.playerStates.map(p => {
      const ticked  = tickStatusEffects(p.toObject ? p.toObject() : p, now);
      ticked.credits += 15; // passive income
      return ticked;
    });

    await session.save();

    if (io) {
      io.to(`game:${sessionId}`).emit('game:credit_tick', {
        playerCredits: round.playerStates.map(p => ({
          userId:  p.userId.toString(),
          credits: p.credits,
        })),
      });
    }
  } catch (err) {
    console.error('[creditIncomeTick]', err);
  }
};

// ── _finishRound ──────────────────────────────────────────────────────────────
// Internal — finalize a round, update score, check for game end

const _finishRound = async (session, round, winner, condition) => {
  round.status     = 'finished';
  round.finishedAt = new Date();
  round.winner     = winner;
  round.winCondition = condition;

  // Update overall score
  if (winner === 'developer') session.score.developer++;
  else if (winner === 'hacker') session.score.hacker++;

  // Move to next round or end game
  const nextRound = session.currentRound + 1;

  if (nextRound >= session.settings.totalRounds) {
    // Game over
    await _finishGame(session);
  } else {
    session.currentRound = nextRound;
    // Switch sides at round index 5
    if (nextRound === 5 && session.mode !== 'training') {
      session.status = 'switching_sides';
    }
  }
};

// ── _finishGame ───────────────────────────────────────────────────────────────

const _finishGame = async (session) => {
  const { developer, hacker } = session.score;
  let winner = 'draw';
  if (developer > hacker) winner = 'developer';
  if (hacker > developer) winner = 'hacker';

  session.status     = 'finished';
  session.winner     = winner;
  session.finishedAt = new Date();

  // Update player stats and rank (skip training)
  if (session.mode !== 'training') {
    for (const p of session.players) {
      const user = await User.findById(p.userId).select('+refreshTokenVersion');
      if (!user) continue;

      const playerWon  = winner === 'draw' ? false : p.currentTeam === winner;
      const isDraw     = winner === 'draw';

      user.stats.wins   += playerWon && !isDraw ? 1 : 0;
      user.stats.losses += !playerWon && !isDraw ? 1 : 0;
      user.stats.draws  += isDraw ? 1 : 0;
      user.stats.totalRounds += session.settings.totalRounds;

      // Role-specific stats
      const asHacker = session.rounds
        .filter(r => r.status === 'finished')
        .some(r => {
          const ps = r.playerStates.find(ps => ps.userId.toString() === p.userId.toString());
          return ps?.team === 'hacker';
        });

      if (asHacker) {
        const breached = session.rounds.some(r => r.winner === 'hacker' && r.winCondition === 'breach');
        if (breached) user.stats.successfulBreaches++;
        user.stats.dataStolen += session.rounds.filter(r => r.winner === 'hacker').length;
      } else {
        const defended = session.rounds.some(r => r.winner === 'developer');
        if (defended) user.stats.successfulDefenses++;
      }

      // Rank points
      const delta = calculateRankPoints({
        won:               playerWon,
        draw:              isDraw,
        mode:              session.mode,
        playerRole:        p.currentTeam,
        secretWordExposed: session.rounds.some(r => r.secretWordExposed),
        roundsPlayed:      session.settings.totalRounds,
      });

      user.rank = applyRankDelta(user.rank.toObject ? user.rank.toObject() : user.rank, delta);
      await user.save();
    }
  }

  // Mark lobby as finished
  await Lobby.findOneAndUpdate(
    { code: session.lobbyCode },
    { status: 'finished' }
  );
};
