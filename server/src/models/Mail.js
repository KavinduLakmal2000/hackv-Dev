import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Mail — in-game mailbox
// Admin sends messages (updates, announcements, rewards) to players.
// Players read them in the client's mail panel.
// ─────────────────────────────────────────────────────────────────────────────

const mailSchema = new mongoose.Schema(
  {
    // null = broadcast to all players
    recipientId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      index:   true,
    },

    // Who sent it (admin userId, or 'system' for automated mail)
    senderId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    senderName: {
      type:    String,
      default: 'BREACH Admin',
    },

    // Content
    subject: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: [120, 'Subject too long'],
    },
    body: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: [4000, 'Body too long'],
    },

    // Optional reward attached to the mail
    reward: {
      credits:         { type: Number, default: 0 },
      premiumCurrency: { type: Number, default: 0 },
      itemId:          { type: String, default: null },
    },

    // Delivery type
    type: {
      type:    String,
      enum:    ['broadcast', 'personal', 'system'],
      default: 'broadcast',
    },

    // Priority affects UI display
    priority: {
      type:    String,
      enum:    ['normal', 'important', 'critical'],
      default: 'normal',
    },

    // Per-recipient read tracking (for broadcasts stored as single doc)
    // For personal mail: simple isRead on the doc
    isRead:   { type: Boolean, default: false },
    readAt:   { type: Date,    default: null   },

    // Reward claimed
    rewardClaimed:   { type: Boolean, default: false },
    rewardClaimedAt: { type: Date,    default: null  },

    // Scheduled delivery (null = immediate)
    sendAt:    { type: Date, default: null, index: true },
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index:   { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

mailSchema.index({ recipientId: 1, createdAt: -1 });
mailSchema.index({ type: 1, sendAt: 1 });

const Mail = mongoose.model('Mail', mailSchema);
export default Mail;
