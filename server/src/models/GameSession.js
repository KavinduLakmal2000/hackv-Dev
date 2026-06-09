import mongoose from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const deployedToolSchema = new mongoose.Schema(
  {
    toolId:      { type: String, required: true },
    deployedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deployedAt:  { type: Date, default: Date.now },
    isDestroyed: { type: Boolean, default: false },
    destroyedAt: { type: Date, default: null },
    // Runtime state (written by game engine)
    hitsToBreak: { type: Number, default: null },
    currentHits: { type: Number, default: 0 },
  },
  { _id: true }
);

const attackEventSchema = new mongoose.Schema(
  {
    attackerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toolId:         { type: String, required: true },
    targetLayer:    { type: String, enum: ['database', 'network', 'application', 'system'] },
    timestamp:      { type: Date, default: Date.now },
    wasBlocked:     { type: Boolean, default: false },
    wasDetected:    { type: Boolean, default: false },
    damageDealt:    { type: Number, default: 0 },
    breachProgress: { type: Number, default: 0 },
    blockedBy:      { type: String, default: null }, // toolId of blocking defense
  },
  { _id: true }
);

const playerStateSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username:       { type: String, required: true },
    team:           { type: String, enum: ['developer', 'hacker'], required: true },
    credits:        { type: Number, default: 500 },
    // Tools currently deployed/active this round
    activeTools:    [deployedToolSchema],
    // Status effects
    isLocked:       { type: Boolean, default: false },   // ransomware locked
    lockExpiresAt:  { type: Date, default: null },
    isStealthed:    { type: Boolean, default: false },
    stealthCharges: { type: Number, default: 0 },
    // Round contribution
    damageDealt:    { type: Number, default: 0 },
    damageBlocked:  { type: Number, default: 0 },
    toolsDeployed:  { type: Number, default: 0 },
    attacksLaunched:{ type: Number, default: 0 },
  },
  { _id: false }
);

const roundSchema = new mongoose.Schema(
  {
    roundNumber:     { type: Number, required: true },
    status:          { type: String, enum: ['pending', 'active', 'finished'], default: 'pending' },
    startedAt:       { type: Date, default: null },
    finishedAt:      { type: Date, default: null },
    endsAt:          { type: Date, default: null },      // wall-clock deadline

    // Secret word — developer sets this before round, hacker tries to expose it
    secretWord:      { type: String, default: null, select: false }, // NEVER sent to hackers
    secretWordHint:  { type: String, default: null },  // category hint only
    secretWordExposed: { type: Boolean, default: false },
    exposedWord:     { type: String, default: null },  // what the hacker submitted

    // Defense state (server-side; client gets only what they're allowed to see)
    dbHealth:        { type: Number, default: 100, min: 0, max: 100 },
    breachProgress:  { type: Number, default: 0,   min: 0, max: 100 },

    // Who won this round
    winner:          { type: String, enum: ['developer', 'hacker', 'draw', null], default: null },
    winCondition:    { type: String, default: null }, // 'breach' | 'time_limit' | 'db_destroyed' | 'word_exposed'

    // Player states for this round (snapshot per player)
    playerStates:    [playerStateSchema],

    // Full attack log
    attackLog:       [attackEventSchema],
  },
  { _id: false }
);

// ── Main GameSession schema ───────────────────────────────────────────────────

const gameSessionSchema = new mongoose.Schema(
  {
    lobbyCode:  { type: String, required: true, index: true },
    mode:       { type: String, enum: ['1v1', '5v5', 'training'], required: true },

    status: {
      type: String,
      enum: ['initializing', 'in_progress', 'switching_sides', 'finished', 'abandoned'],
      default: 'initializing',
      index: true,
    },

    // All players in the game (permanent assignment for the session)
    players: [
      {
        userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        username:    { type: String, required: true },
        displayName: { type: String },
        avatarUrl:   { type: String, default: null },
        originalTeam: { type: String, enum: ['developer', 'hacker'] }, // team for rounds 1-5
        currentTeam:  { type: String, enum: ['developer', 'hacker'] }, // changes after switch
      },
    ],

    // Settings (copied from lobby at game start)
    settings: {
      totalRounds:   { type: Number, default: 10 }, // 5 each side
      roundDuration: { type: Number, default: 120 },
      startCredits:  { type: Number, default: 500 },
    },

    // Rounds (index 0 = round 1, etc.)
    rounds: [roundSchema],

    // Current round index
    currentRound: { type: Number, default: 0 },

    // Score tracking across all rounds
    score: {
      developer: { type: Number, default: 0 },
      hacker:    { type: Number, default: 0 },
    },

    // Overall winner (after all rounds)
    winner:      { type: String, enum: ['developer', 'hacker', 'draw', null], default: null },
    finishedAt:  { type: Date, default: null },

    // Timer reference (stored server-side; cleared on finish)
    _timerRef: { type: String, default: null, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Strip secret words from ALL rounds before sending to clients
        // Socket.io controller handles role-based filtering separately
        if (ret.rounds) {
          ret.rounds = ret.rounds.map(r => {
            const { secretWord, ...safe } = r;
            return safe;
          });
        }
        delete ret.__v;
        delete ret._timerRef;
        return ret;
      },
    },
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────────────

gameSessionSchema.virtual('activeRound').get(function () {
  return this.rounds[this.currentRound] ?? null;
});

gameSessionSchema.virtual('isSwitchPoint').get(function () {
  // After round 5 (index 4), teams switch sides
  return this.currentRound === 5 && this.rounds[4]?.status === 'finished';
});

// ── Helpers ───────────────────────────────────────────────────────────────────

gameSessionSchema.methods.getPlayerState = function (userId, roundIndex) {
  const round = this.rounds[roundIndex ?? this.currentRound];
  return round?.playerStates.find(p => p.userId.toString() === userId.toString()) ?? null;
};

gameSessionSchema.methods.getTeamForPlayer = function (userId) {
  const p = this.players.find(p => p.userId.toString() === userId.toString());
  return p?.currentTeam ?? null;
};

const GameSession = mongoose.model('GameSession', gameSessionSchema);
export default GameSession;
