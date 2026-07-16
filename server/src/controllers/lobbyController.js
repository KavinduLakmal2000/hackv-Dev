import Lobby, { MODE_CONFIG, TEAMS } from '../models/Lobby.js';
import User from '../models/User.js';
import { generateLobbyCode } from '../utils/lobbyCode.js';
import {
  ok, created, badRequest, unauthorized,
  forbidden, notFound, conflict, serverError,
} from '../utils/apiResponse.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Check if a player is already in any active lobby.
 * A player can only be in one lobby at a time.
 */
const getActiveLobbyForUser = (userId) =>
  Lobby.findOne({
    'players.userId': userId,
    status: { $in: ['waiting', 'ready', 'in_progress'] },
  });

/**
 * Build a safe player snapshot from a User document.
 */
const playerSnapshot = (user) => ({
  userId:      user._id,
  username:    user.username,
  displayName: user.displayName || user.username,
  avatarUrl:   user.avatarUrl || null,
  team:        null,
  isReady:     false,
  isHost:      false,
  joinedAt:    new Date(),
});

/**
 * Emit a Socket.io event to the lobby room (Slice 5 wires this properly).
 * For now we attach a noop so the controller code doesn't need to change later.
 */
const emitToLobby = (req, code, event, data) => {
  const io = req.app.get('io');
  if (io) io.to(`lobby:${code}`).emit(event, data);
};

// ── createLobby ───────────────────────────────────────────────────────────────

export const createLobby = async (req, res) => {
  try {
    const { mode, isPrivate, password, settings } = req.body;
    const user = req.user;

    // One lobby at a time
    const existing = await getActiveLobbyForUser(user._id);
    if (existing) {
      return conflict(res, `You are already in lobby ${existing.code}. Leave first.`);
    }

    const code = await generateLobbyCode();

    // Host is automatically team-assigned based on preferredRole
    const preferredTeam = TEAMS.includes(user.preferredRole) ? user.preferredRole : 'developer';

    const hostSlot = {
      ...playerSnapshot(user),
      team:   preferredTeam,
      isHost: true,
      isReady: mode === 'training', // auto-ready in training
    };

    const lobby = new Lobby({
      code,
      hostId: user._id,
      mode,
      isPrivate,
      password: password || null,
      players: [hostSlot],
      settings,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    await lobby.save();

    // Strip password from response
    const safelobby = lobby.toJSON();

    return created(res, { lobby: safelobby }, `Lobby ${code} created`);
  } catch (err) {
    console.error('[createLobby]', err);
    return serverError(res);
  }
};

// ── joinLobby ─────────────────────────────────────────────────────────────────

export const joinLobby = async (req, res) => {
  try {
    const { code }     = req.params;
    const { password } = req.body;
    const user         = req.user;

    // Prevent duplicate lobby membership
    const existing = await getActiveLobbyForUser(user._id);
    if (existing) {
      if (existing.code === code.toUpperCase()) {
        return conflict(res, 'You are already in this lobby');
      }
      return conflict(res, `You are already in lobby ${existing.code}. Leave first.`);
    }

    const lobby = await Lobby.findOne({ code: code.toUpperCase() }).select('+password');
    if (!lobby) return notFound(res, 'Lobby not found');

    if (lobby.status !== 'waiting') {
      return badRequest(res, `Cannot join — lobby is ${lobby.status}`);
    }

    if (lobby.isFull) {
      return conflict(res, 'Lobby is full');
    }

    // Password check for private lobbies
    if (lobby.isPrivate && lobby.password) {
      if (!password || password !== lobby.password) {
        return forbidden(res, 'Incorrect lobby password');
      }
    }

    // Auto-assign to the team that needs more players
    const cfg       = MODE_CONFIG[lobby.mode];
    const devCount  = lobby.players.filter(p => p.team === 'developer').length;
    const hackCount = lobby.players.filter(p => p.team === 'hacker').length;

    let autoTeam = null;
    if (devCount < cfg.playersPerTeam && hackCount < cfg.playersPerTeam) {
      // Both need players — use preferred role
      autoTeam = TEAMS.includes(user.preferredRole) ? user.preferredRole : 'developer';
    } else if (devCount < cfg.playersPerTeam) {
      autoTeam = 'developer';
    } else if (hackCount < cfg.playersPerTeam) {
      autoTeam = 'hacker';
    }

    const newSlot = {
      ...playerSnapshot(user),
      team:    autoTeam,
      isReady: lobby.mode === 'training',
    };

    lobby.players.push(newSlot);

    // Refresh TTL on activity
    lobby.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await lobby.save();

    const safeLobby = lobby.toJSON();
    emitToLobby(req, lobby.code, 'lobby:player_joined', { player: newSlot, lobby: safeLobby });

    return ok(res, { lobby: safeLobby }, `Joined lobby ${lobby.code}`);
  } catch (err) {
    console.error('[joinLobby]', err);
    return serverError(res);
  }
};

// ── leaveLobby ────────────────────────────────────────────────────────────────

export const leaveLobby = async (req, res) => {
  try {
    const { code } = req.params;
    const userId   = req.user?._id ?? req.user?.id;
    const normalizedUserId = userId?.toString?.() ?? null;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');

    const playerIdx = lobby.players.findIndex((p) => {
      const playerUserId = p.userId?.toString?.();
      return playerUserId && playerUserId === normalizedUserId;
    });

    if (playerIdx === -1 && lobby.hostId?.toString?.() !== normalizedUserId) {
      return ok(res, null, 'Left lobby');
    }

    if (lobby.status === 'in_progress') {
      return badRequest(res, 'Cannot leave a game in progress. Use abandon instead.');
    }

    const leaving = playerIdx >= 0 ? lobby.players[playerIdx] : null;
    if (leaving) {
      lobby.players.splice(playerIdx, 1);
    }

    // If host leaves, promote the next player
    if (leaving?.isHost && lobby.players.length > 0) {
      lobby.players[0].isHost = true;
      lobby.hostId = lobby.players[0].userId;
    }

    // Abandon empty lobbies
    if (lobby.players.length === 0) {
      lobby.status = 'abandoned';
    } else {
      // Un-ready remaining players (settings may have changed)
      lobby.players.forEach((p) => { p.isReady = false; });
      lobby.status = 'waiting';
    }

    await lobby.save();

    emitToLobby(req, lobby.code, 'lobby:player_left', {
      userId: normalizedUserId,
      newHostId: leaving?.isHost && lobby.players.length > 0
        ? lobby.players[0].userId.toString()
        : null,
      lobby: lobby.toJSON(),
    });

    return ok(res, null, 'Left lobby');
  } catch (err) {
    console.error('[leaveLobby]', err);
    return serverError(res);
  }
};

// ── getLobby ──────────────────────────────────────────────────────────────────

export const getLobby = async (req, res) => {
  try {
    const lobby = await Lobby.findOne({ code: req.params.code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');

    return ok(res, { lobby: lobby.toJSON() });
  } catch (err) {
    console.error('[getLobby]', err);
    return serverError(res);
  }
};

// ── chooseTeam ────────────────────────────────────────────────────────────────

export const chooseTeam = async (req, res) => {
  try {
    const { code }  = req.params;
    const { team }  = req.body;
    const userId    = req.user._id;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');
    if (lobby.status !== 'waiting') return badRequest(res, 'Cannot switch teams now');

    const player = lobby.getPlayer(userId);
    if (!player) return forbidden(res, 'You are not in this lobby');

    // Check team capacity
    const cfg        = MODE_CONFIG[lobby.mode];
    const teamCount  = lobby.players.filter(p => p.team === team && p.userId.toString() !== userId.toString()).length;
    if (teamCount >= cfg.playersPerTeam) {
      return conflict(res, `Team ${team} is full`);
    }

    player.team    = team;
    player.isReady = false; // switching team resets ready

    await lobby.save();

    emitToLobby(req, lobby.code, 'lobby:team_changed', {
      userId: userId.toString(),
      team,
      lobby: lobby.toJSON(),
    });

    return ok(res, { lobby: lobby.toJSON() }, `Switched to ${team} team`);
  } catch (err) {
    console.error('[chooseTeam]', err);
    return serverError(res);
  }
};

// ── setReady ──────────────────────────────────────────────────────────────────

export const setReady = async (req, res) => {
  try {
    const { code }  = req.params;
    const { ready } = req.body; // boolean
    const userId    = req.user._id;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');
    if (lobby.status !== 'waiting') return badRequest(res, 'Lobby is not in waiting state');

    const player = lobby.getPlayer(userId);
    if (!player) return forbidden(res, 'You are not in this lobby');

    if (!player.team) return badRequest(res, 'Choose a team before readying up');

    player.isReady = !!ready;

    // Check if all players are ready after this change
    const nowAllReady = lobby.allReady;
    if (nowAllReady) lobby.status = 'ready';
    else             lobby.status = 'waiting';

    await lobby.save();

    emitToLobby(req, lobby.code, 'lobby:ready_changed', {
      userId:      userId.toString(),
      isReady:     player.isReady,
      allReady:    nowAllReady,
      lobby:       lobby.toJSON(),
    });

    return ok(res, { lobby: lobby.toJSON(), allReady: nowAllReady });
  } catch (err) {
    console.error('[setReady]', err);
    return serverError(res);
  }
};

// ── kickPlayer ────────────────────────────────────────────────────────────────

export const kickPlayer = async (req, res) => {
  try {
    const { code, targetId } = req.params;
    const hostId             = req.user._id;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');

    const host = lobby.getPlayer(hostId);
    if (!host?.isHost) return forbidden(res, 'Only the host can kick players');

    if (targetId === hostId.toString()) return badRequest(res, 'You cannot kick yourself');

    if (lobby.status !== 'waiting') return badRequest(res, 'Cannot kick during a game');

    const targetIdx = lobby.players.findIndex(p => p.userId.toString() === targetId);
    if (targetIdx === -1) return notFound(res, 'Player not in lobby');

    lobby.players.splice(targetIdx, 1);
    lobby.status = 'waiting';
    lobby.players.forEach(p => { p.isReady = false; });

    await lobby.save();

    emitToLobby(req, lobby.code, 'lobby:player_kicked', {
      kickedUserId: targetId,
      lobby: lobby.toJSON(),
    });

    return ok(res, { lobby: lobby.toJSON() }, 'Player kicked');
  } catch (err) {
    console.error('[kickPlayer]', err);
    return serverError(res);
  }
};

// ── updateSettings ────────────────────────────────────────────────────────────

export const updateSettings = async (req, res) => {
  try {
    const { code } = req.params;
    const hostId   = req.user._id;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');

    const host = lobby.getPlayer(hostId);
    if (!host?.isHost) return forbidden(res, 'Only the host can update settings');
    if (lobby.status !== 'waiting') return badRequest(res, 'Cannot change settings now');

    const { settings, isPrivate, password } = req.body;

    if (settings) {
      if (settings.roundCount    !== undefined) lobby.settings.roundCount    = settings.roundCount;
      if (settings.roundDuration !== undefined) lobby.settings.roundDuration = settings.roundDuration;
      if (settings.startCredits  !== undefined) lobby.settings.startCredits  = settings.startCredits;
    }
    if (isPrivate !== undefined) lobby.isPrivate = isPrivate;
    if (password  !== undefined) lobby.password  = password; // null = remove password

    // Reset ready states when settings change
    lobby.players.forEach(p => { p.isReady = false; });
    lobby.status = 'waiting';

    await lobby.save();

    emitToLobby(req, lobby.code, 'lobby:settings_updated', { lobby: lobby.toJSON() });

    return ok(res, { lobby: lobby.toJSON() }, 'Settings updated');
  } catch (err) {
    console.error('[updateSettings]', err);
    return serverError(res);
  }
};

// ── startGame ─────────────────────────────────────────────────────────────────
// Host initiates game start. Full game session creation happens in Slice 4.

export const startGame = async (req, res) => {
  try {
    const { code } = req.params;
    const hostId   = req.user._id;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });
    if (!lobby) return notFound(res, 'Lobby not found');

    const host = lobby.getPlayer(hostId);
    if (!host?.isHost) return forbidden(res, 'Only the host can start the game');

    if (lobby.status !== 'ready') {
      return badRequest(res, `Cannot start — lobby status is '${lobby.status}'. All players must be ready.`);
    }

    if (!lobby.allReady) {
      return badRequest(res, 'Not all players are ready');
    }

    // Mark as in_progress — Slice 4 GameSession controller takes over from here
    lobby.status = 'in_progress';
    await lobby.save();

    emitToLobby(req, lobby.code, 'lobby:game_starting', {
      lobbyCode: lobby.code,
      mode:      lobby.mode,
      players:   lobby.players,
      settings:  lobby.settings,
    });

    return ok(res, {
      lobbyCode: lobby.code,
      mode:      lobby.mode,
      players:   lobby.players,
      settings:  lobby.settings,
    }, 'Game starting!');
  } catch (err) {
    console.error('[startGame]', err);
    return serverError(res);
  }
};

// ── listPublicLobbies ─────────────────────────────────────────────────────────

export const listPublicLobbies = async (req, res) => {
  try {
    const { mode, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      status:    'waiting',
      isPrivate: false,
    };
    if (mode) filter.mode = mode;

    const [lobbies, total] = await Promise.all([
      Lobby.find(filter)
        .select('code mode status players settings createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      Lobby.countDocuments(filter),
    ]);

    // Attach computed fields and redact passwords
    const safeLobbies = lobbies.map(l => ({
      ...l,
      playerCount: l.players?.length ?? 0,
      maxPlayers:  MODE_CONFIG[l.mode]?.maxPlayers ?? 2,
    }));

    return ok(res, {
      lobbies: safeLobbies,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[listPublicLobbies]', err);
    return serverError(res);
  }
};

// ── getMyLobby ────────────────────────────────────────────────────────────────

export const getMyLobby = async (req, res) => {
  try {
    const lobby = await getActiveLobbyForUser(req.user._id);
    if (!lobby) return ok(res, { lobby: null }, 'Not in any lobby');
    return ok(res, { lobby: lobby.toJSON() });
  } catch (err) {
    console.error('[getMyLobby]', err);
    return serverError(res);
  }
};
