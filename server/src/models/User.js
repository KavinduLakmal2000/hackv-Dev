import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const statsSchema = new mongoose.Schema(
  {
    wins:         { type: Number, default: 0 },
    losses:       { type: Number, default: 0 },
    draws:        { type: Number, default: 0 },
    totalRounds:  { type: Number, default: 0 },
    // Role-specific
    successfulBreaches:  { type: Number, default: 0 }, // as hacker
    successfulDefenses:  { type: Number, default: 0 }, // as developer
    dataStolen:          { type: Number, default: 0 }, // bytes/units stolen
    toolsDeployed:       { type: Number, default: 0 },
  },
  { _id: false }
);

const shopItemSchema = new mongoose.Schema(
  {
    itemId:      { type: String, required: true },
    purchasedAt: { type: Date, default: Date.now },
    quantity:    { type: Number, default: 1 },
  },
  { _id: false }
);

const rankSchema = new mongoose.Schema(
  {
    tier:   { type: String, enum: ['SCRIPT_KIDDIE', 'GREY_HAT', 'BLACK_HAT', 'ZERO_DAY', 'APT'], default: 'SCRIPT_KIDDIE' },
    points: { type: Number, default: 0 },
    peak:   { type: String, enum: ['SCRIPT_KIDDIE', 'GREY_HAT', 'BLACK_HAT', 'ZERO_DAY', 'APT'], default: 'SCRIPT_KIDDIE' },
  },
  { _id: false }
);

// ── Main User schema ─────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // Identity
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [40, 'Display name too long'],
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [160, 'Bio must be 160 characters or less'],
      default: null,
    },
    preferredRole: {
      type: String,
      enum: ['developer', 'hacker', 'any'],
      default: 'any',
    },

    // Auth
    passwordHash: {
      type: String,
      select: false, // never returned by default
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    // Role & status
    role: {
      type: String,
      enum: ['player', 'admin', 'moderator'],
      default: 'player',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: {
      type: String,
      select: false,
    },
    emailVerifyExpires: {
      type: Date,
      select: false,
    },

    // Password reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Token management (for logout / token rotation)
    refreshTokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },

    // Game economy
    credits: {
      type: Number,
      default: 500,
      min: 0,
    },
    premiumCurrency: {
      type: Number,
      default: 0, // bought with real money (Stripe)
      min: 0,
    },

    // Inventory & progression
    ownedItems:  [shopItemSchema],
    equippedItems: {
      type: Map,
      of: String, // slot -> itemId
      default: {},
    },
    rank:  { type: rankSchema, default: () => ({}) },
    stats: { type: statsSchema, default: () => ({}) },

    // Meta
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null, select: false },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Scrub sensitive fields from any .toJSON() call
        delete ret.passwordHash;
        delete ret.googleId;
        delete ret.refreshTokenVersion;
        delete ret.emailVerifyToken;
        delete ret.emailVerifyExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.lastLoginIp;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ 'rank.points': -1 }); // leaderboard
userSchema.index({ createdAt: -1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual('winRate').get(function () {
  const total = this.stats.wins + this.stats.losses;
  return total === 0 ? 0 : Math.round((this.stats.wins / total) * 100);
});

// ── Hooks ────────────────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // Caller passes raw password into passwordHash field; we hash it here
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
  next();
});

// ── Instance methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toJSON();
  return obj;
};

// ── Static methods ────────────────────────────────────────────────────────────
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

const User = mongoose.model('User', userSchema);
export default User;
