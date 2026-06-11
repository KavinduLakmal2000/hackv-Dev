import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Purchase — immutable transaction log
// Every purchase (credit, premium, cosmetic) writes a record here.
// Used for: audit trail, dispute resolution, refund handling, analytics.
// ─────────────────────────────────────────────────────────────────────────────

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
      index: true,
    },

    // What was bought
    itemId:    { type: String, required: true },
    itemType:  { type: String, required: true },
    itemName:  { type: String, required: true },

    // How it was paid
    paymentMethod: {
      type: String,
      enum: ['stripe', 'premium_currency', 'credits', 'rank_reward', 'admin_grant'],
      required: true,
    },

    // Amounts
    premiumSpent:  { type: Number, default: 0 },   // tokens deducted
    creditsSpent:  { type: Number, default: 0 },
    creditsGained: { type: Number, default: 0 },   // for credit pack purchases
    premiumGained: { type: Number, default: 0 },   // for real-money token purchases

    // Stripe-specific (only for real-money purchases)
    stripePaymentIntentId: { type: String, default: null, index: true, sparse: true },
    stripeSessionId:       { type: String, default: null, index: true, sparse: true },
    amountUsdCents:        { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    refundedAt:  { type: Date, default: null },
    refundReason:{ type: String, default: null },

    // Snapshot of user balance after transaction (for audit)
    balanceSnapshot: {
      credits:         { type: Number },
      premiumCurrency: { type: Number },
    },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    // Immutable — no updates after creation (use refund status field instead)
  }
);

purchaseSchema.index({ userId: 1, createdAt: -1 });
purchaseSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;
