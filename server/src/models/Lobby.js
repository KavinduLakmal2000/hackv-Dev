import mongoose from 'mongoose';

// ── Constants (shared with game engine in Slice 4/5) ─────────────────────────
export const GAME_MODES   = ['1v1', '5v5', 'training'];
export const LOBBY_STATUS = ['waiting', 'ready', 'in_progress', 'finished', 'abandoned'];
export const TEAMS        = ['developer', 'hacker'];

export const MODE_CONFIG = {
  '1v1':      { playersPerTeam: 1, maxPlayers: 2,  ranked: true  },
  '5v5':      { playersPerTeam: 5, maxPlayers: 10, ranked: true  },
  'training': { playersPerTeam: 1, maxPlayers: 2,  ranked: false },
};

// ── Player slot sub-schema ────────────────────────────────────────────────────
const lobbyPlayerSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username:    { type: String, required: true },
    displayName: { type: String },
    avatarUrl:   { type: String, default: null },
    team:        { type: String, enum: TEAMS, default: null },        // assigned team
    isReady:     { type: Boolean, default: false },
    isHost:      { type: Boolean, default: false },
    joinedAt:    { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Main Lobby schema ─────────────────────────────────────────────────────────
const lobbySchema = new mongoose.Schema(
  {
    // Identification
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      index: true,
    },

    // Who created it
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Game config
    mode: {
      type: String,
      enum: GAME_MODES,
      required: true,
      default: '1v1',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,          // plain text — short, game-context, no hashing needed
      default: null,
      select: false,         // never sent to clients
    },

    // Players
    players: [lobbyPlayerSchema],

    // Lifecycle
    status: {
      type: String,
      enum: LOBBY_STATUS,
      default: 'waiting',
      index: true,
    },

    // Link to game session once started (Slice 4)
    gameSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameSession',
      default: null,
    },

    // Settings (host can tweak before game starts)
    settings: {
      roundCount:    { type: Number, default: 5, min: 1, max: 10 },
      roundDuration: { type: Number, default: 120, min: 60, max: 300 }, // seconds
      startCredits:  { type: Number, default: 500, min: 100, max: 2000 },
    },

    // Auto-cleanup
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 min TTL
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────────────

lobbySchema.virtual('playerCount').get(function () {
  return this.players.length;
});

lobbySchema.virtual('maxPlayers').get(function () {
  return MODE_CONFIG[this.mode]?.maxPlayers ?? 2;
});

lobbySchema.virtual('isFull').get(function () {
  return this.players.length >= (MODE_CONFIG[this.mode]?.maxPlayers ?? 2);
});

lobbySchema.virtual('developers').get(function () {
  return this.players.filter(p => p.team === 'developer');
});

lobbySchema.virtual('hackers').get(function () {
  return this.players.filter(p => p.team === 'hacker');
});

lobbySchema.virtual('allReady').get(function () {
  if (this.players.length < 2) return false;
  const cfg = MODE_CONFIG[this.mode];
  const devs   = this.players.filter(p => p.team === 'developer');
  const hacks  = this.players.filter(p => p.team === 'hacker');
  // Both teams must be full and everyone ready
  return (
    devs.length  === cfg.playersPerTeam &&
    hacks.length === cfg.playersPerTeam &&
    this.players.every(p => p.isReady)
  );
});

// ── Instance helpers ──────────────────────────────────────────────────────────

lobbySchema.methods.getPlayer = function (userId) {
  return this.players.find(p => p.userId.toString() === userId.toString());
};

lobbySchema.methods.isPlayerInLobby = function (userId) {
  return !!this.getPlayer(userId);
};

const Lobby = mongoose.model('Lobby', lobbySchema);
export default Lobby;
