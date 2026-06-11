import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// MaintenanceConfig — global server state flags
// Single document (singleton pattern) — only one row ever exists.
// Admin toggles these from the dashboard; middleware reads them on every request.
// ─────────────────────────────────────────────────────────────────────────────

const maintenanceSchema = new mongoose.Schema(
  {
    // Singleton key — always 'global'
    key: { type: String, default: 'global', unique: true },

    // Maintenance mode — blocks all non-admin API access
    maintenanceMode: {
      enabled:   { type: Boolean, default: false },
      message:   { type: String,  default: 'BREACH is undergoing maintenance. Back soon.' },
      updatedAt: { type: Date,    default: null },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    // New registrations allowed
    registrationOpen: { type: Boolean, default: true },

    // Matchmaking allowed (lobby creation / joining)
    matchmakingOpen: { type: Boolean, default: true },

    // Shop open
    shopOpen: { type: Boolean, default: true },

    // Global announcement banner (shown in client UI)
    announcement: {
      enabled:  { type: Boolean, default: false },
      message:  { type: String,  default: '' },
      type:     { type: String,  enum: ['info', 'warning', 'critical'], default: 'info' },
    },

    // Current season info
    season: {
      number:  { type: Number, default: 1 },
      name:    { type: String, default: 'Season 1' },
      endsAt:  { type: Date,   default: null },
    },
  },
  { timestamps: true }
);

// ── Singleton getter/setter ───────────────────────────────────────────────────

maintenanceSchema.statics.get = async function () {
  let config = await this.findOne({ key: 'global' });
  if (!config) {
    config = await this.create({ key: 'global' });
  }
  return config;
};

maintenanceSchema.statics.patch = async function (updates) {
  return this.findOneAndUpdate(
    { key: 'global' },
    { $set: updates },
    { new: true, upsert: true }
  );
};

const MaintenanceConfig = mongoose.model('MaintenanceConfig', maintenanceSchema);
export default MaintenanceConfig;
