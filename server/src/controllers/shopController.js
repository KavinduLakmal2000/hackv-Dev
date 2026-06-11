import Stripe from 'stripe';
import User from '../models/User.js';
import Purchase from '../models/Purchase.js';
import {
  ALL_SHOP_ITEMS,
  ITEM_TYPES,
  getShopItem,
  getItemsByType,
  validatePurchase,
  PREMIUM_PACKS,
} from '../config/shopCatalog.js';
import {
  ok, created, badRequest, forbidden,
  notFound, conflict, serverError,
} from '../utils/apiResponse.js';

// Stripe is initialized lazily so missing key doesn't crash the server in dev
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }
  return _stripe;
};

// ── getCatalog ────────────────────────────────────────────────────────────────
// Returns the full shop catalog, with ownership flags for the logged-in user

export const getCatalog = async (req, res) => {
  try {
    const user = req.user;
    const ownedIds = new Set((user.ownedItems ?? []).map(o => o.itemId));

    const catalog = Object.values(ALL_SHOP_ITEMS).map(item => ({
      ...item,
      // Strip Stripe price IDs from client response
      stripePriceId: undefined,
      owned: ownedIds.has(item.id),
      // Equipped slot value if applicable
      equipped: item.slot ? (user.equippedItems?.get?.(item.slot) === item.id) : false,
    }));

    // Group by type
    const grouped = catalog.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});

    return ok(res, {
      catalog: grouped,
      wallet: {
        credits:         user.credits,
        premiumCurrency: user.premiumCurrency,
      },
    });
  } catch (err) {
    console.error('[getCatalog]', err);
    return serverError(res);
  }
};

// ── buyItem ───────────────────────────────────────────────────────────────────
// Purchase any non-Stripe item (cosmetics, credit packs) with premium currency
// THIS IS THE ANTI-BYPASS CORE — price always from server, never from client

export const buyItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const userId     = req.user._id;

    // Always re-fetch fresh user state — never trust req.user for balance checks
    const user = await User.findById(userId);
    if (!user) return notFound(res, 'User not found');

    // Server-side validation — item exists, user can afford it, rank check
    const { valid, reason, item } = validatePurchase(itemId, user);
    if (!valid) return badRequest(res, reason);

    // Real-money items must go through Stripe checkout, not this endpoint
    if (item.stripePriceId) {
      return badRequest(res, 'This item requires checkout. Use /shop/checkout instead.');
    }

    // ── Atomic balance update ─────────────────────────────────────────────────
    // Use findOneAndUpdate with $inc to prevent race conditions
    // (two simultaneous requests can't both pass the balance check and both deduct)

    const filter = {
      _id:             userId,
      premiumCurrency: { $gte: item.premiumCost ?? 0 },
    };

    const creditPack = item.type === ITEM_TYPES.CREDIT_PACK;

    const update = {
      $inc: {
        premiumCurrency: -(item.premiumCost ?? 0),
        ...(creditPack ? { credits: item.creditsGiven } : {}),
      },
      ...(
        !item.consumable && !creditPack
          ? {
              $push: {
                ownedItems: {
                  itemId,
                  purchasedAt: new Date(),
                  quantity: 1,
                },
              },
            }
          : {}
      ),
    };

    const updated = await User.findOneAndUpdate(filter, update, { new: true });

    if (!updated) {
      // Race condition lost or insufficient balance
      return badRequest(res, 'Insufficient tokens or purchase conflict. Please try again.');
    }

    // ── Write purchase record ─────────────────────────────────────────────────
    await Purchase.create({
      userId,
      itemId,
      itemType:      item.type,
      itemName:      item.name,
      paymentMethod: 'premium_currency',
      premiumSpent:  item.premiumCost ?? 0,
      creditsGained: creditPack ? item.creditsGiven : 0,
      status:        'completed',
      balanceSnapshot: {
        credits:         updated.credits,
        premiumCurrency: updated.premiumCurrency,
      },
    });

    return ok(res, {
      item:    { id: itemId, name: item.name, type: item.type },
      wallet: {
        credits:         updated.credits,
        premiumCurrency: updated.premiumCurrency,
      },
    }, `${item.name} purchased successfully`);
  } catch (err) {
    console.error('[buyItem]', err);
    return serverError(res);
  }
};

// ── createCheckoutSession ─────────────────────────────────────────────────────
// Creates a Stripe Checkout session for real-money premium currency packs

export const createCheckoutSession = async (req, res) => {
  try {
    const { packId } = req.body;
    const user       = req.user;

    const item = getShopItem(packId);
    if (!item || !item.stripePriceId) {
      return badRequest(res, 'Invalid premium pack');
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode:        'payment',
      line_items: [
        {
          price:    item.stripePriceId,
          quantity: 1,
        },
      ],
      // Attach user ID so webhook can credit their account
      metadata: {
        userId:       user._id.toString(),
        packId,
        premiumGiven: item.premiumGiven.toString(),
      },
      customer_email: user.email,
      success_url: `${process.env.CLIENT_URL}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/shop?cancelled=1`,
      // Expire session after 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // Write pending purchase (completed by webhook)
    await Purchase.create({
      userId:          user._id,
      itemId:          packId,
      itemType:        item.type,
      itemName:        item.name,
      paymentMethod:   'stripe',
      premiumGained:   item.premiumGiven,
      amountUsdCents:  item.priceUsdCents,
      stripeSessionId: session.id,
      status:          'pending',
      balanceSnapshot: {
        credits:         user.credits,
        premiumCurrency: user.premiumCurrency,
      },
    });

    return ok(res, { checkoutUrl: session.url, sessionId: session.id }, 'Checkout session created');
  } catch (err) {
    console.error('[createCheckoutSession]', err);
    if (err.message === 'STRIPE_SECRET_KEY not set') {
      return serverError(res, 'Payment system not configured');
    }
    return serverError(res, 'Failed to create checkout session');
  }
};

// ── handleStripeWebhook ───────────────────────────────────────────────────────
// Stripe calls this after payment — credits the user's account
// CRITICAL: verify Stripe signature before processing anything

export const handleStripeWebhook = async (req, res) => {
  const sig       = req.headers['stripe-signature'];
  const secret    = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;
  try {
    const stripe = getStripe();
    // req.body must be raw buffer — see server.js raw body setup
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Handle relevant events ────────────────────────────────────────────────

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Idempotency: check if we already processed this session
    const existing = await Purchase.findOne({
      stripeSessionId: session.id,
      status: 'completed',
    });
    if (existing) {
      console.log(`[Stripe Webhook] Already processed session ${session.id}`);
      return res.status(200).json({ received: true });
    }

    const { userId, packId, premiumGiven } = session.metadata ?? {};
    if (!userId || !packId || !premiumGiven) {
      console.error('[Stripe Webhook] Missing metadata on session', session.id);
      return res.status(400).send('Missing metadata');
    }

    const premiumAmount = parseInt(premiumGiven, 10);
    if (isNaN(premiumAmount) || premiumAmount <= 0) {
      return res.status(400).send('Invalid premiumGiven value');
    }

    // Atomically credit the user
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { premiumCurrency: premiumAmount } },
      { new: true }
    );

    if (!user) {
      console.error(`[Stripe Webhook] User ${userId} not found for session ${session.id}`);
      return res.status(404).send('User not found');
    }

    // Update purchase record to completed
    await Purchase.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        status:  'completed',
        premiumGained: premiumAmount,
        'balanceSnapshot.premiumCurrency': user.premiumCurrency,
      }
    );

    console.log(`[Stripe Webhook] Credited ${premiumAmount} tokens to ${user.username}`);
  }

  if (event.type === 'charge.refunded') {
    const charge    = event.data.object;
    const sessionId = charge.metadata?.sessionId;

    if (sessionId) {
      const purchase = await Purchase.findOne({ stripeSessionId: sessionId });
      if (purchase && purchase.status === 'completed') {
        // Reverse the token credit
        await User.findByIdAndUpdate(purchase.userId, {
          $inc: { premiumCurrency: -purchase.premiumGained },
        });
        await Purchase.findByIdAndUpdate(purchase._id, {
          status:       'refunded',
          refundedAt:   new Date(),
          refundReason: 'Stripe refund',
        });
        console.log(`[Stripe Webhook] Refund processed for session ${sessionId}`);
      }
    }
  }

  res.status(200).json({ received: true });
};

// ── verifyCheckoutSuccess ─────────────────────────────────────────────────────
// Client calls this after returning from Stripe success_url
// Confirms payment went through and returns updated wallet

export const verifyCheckoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return badRequest(res, 'sessionId required');

    const purchase = await Purchase.findOne({
      stripeSessionId: sessionId,
      userId:          req.user._id,
    });

    if (!purchase) return notFound(res, 'Purchase record not found');
    if (purchase.status === 'pending') {
      // Webhook may not have fired yet — give it a moment
      return ok(res, { status: 'pending', message: 'Payment processing. Refresh in a moment.' });
    }
    if (purchase.status === 'completed') {
      const user = await User.findById(req.user._id);
      return ok(res, {
        status: 'completed',
        wallet: { credits: user.credits, premiumCurrency: user.premiumCurrency },
        purchase: {
          itemName:     purchase.itemName,
          premiumGained: purchase.premiumGained,
        },
      });
    }

    return badRequest(res, `Payment status: ${purchase.status}`);
  } catch (err) {
    console.error('[verifyCheckoutSuccess]', err);
    return serverError(res);
  }
};

// ── getInventory ──────────────────────────────────────────────────────────────
// Player's owned items with full item metadata

export const getInventory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const inventory = (user.ownedItems ?? []).map(owned => {
      const item = getShopItem(owned.itemId);
      return {
        itemId:      owned.itemId,
        purchasedAt: owned.purchasedAt,
        quantity:    owned.quantity,
        // Full item metadata
        name:        item?.name ?? owned.itemId,
        type:        item?.type ?? 'unknown',
        icon:        item?.icon ?? null,
        slot:        item?.slot ?? null,
        equipped:    item?.slot
          ? (user.equippedItems?.get?.(item.slot) === owned.itemId)
          : false,
      };
    });

    return ok(res, {
      inventory,
      equipped: Object.fromEntries(user.equippedItems ?? new Map()),
      wallet: { credits: user.credits, premiumCurrency: user.premiumCurrency },
    });
  } catch (err) {
    console.error('[getInventory]', err);
    return serverError(res);
  }
};

// ── equipItem ─────────────────────────────────────────────────────────────────

export const equipItem = async (req, res) => {
  try {
    const { itemId, slot } = req.body;
    const user = await User.findById(req.user._id);

    // Must own the item
    const owned = user.ownedItems?.some(o => o.itemId === itemId);
    if (!owned) return forbidden(res, 'You do not own this item');

    const item = getShopItem(itemId);
    if (!item?.slot) return badRequest(res, 'This item cannot be equipped');
    if (item.slot !== slot) return badRequest(res, `This item goes in the '${item.slot}' slot`);

    // Update equipped map
    if (!user.equippedItems) user.equippedItems = new Map();
    user.equippedItems.set(slot, itemId);
    user.markModified('equippedItems');

    await user.save();

    return ok(res, {
      slot,
      itemId,
      equipped: Object.fromEntries(user.equippedItems),
    }, `${item.name} equipped`);
  } catch (err) {
    console.error('[equipItem]', err);
    return serverError(res);
  }
};

// ── unequipItem ───────────────────────────────────────────────────────────────

export const unequipItem = async (req, res) => {
  try {
    const { slot } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.equippedItems?.has?.(slot)) {
      return badRequest(res, 'Nothing equipped in that slot');
    }

    user.equippedItems.delete(slot);
    user.markModified('equippedItems');
    await user.save();

    return ok(res, { slot, equipped: Object.fromEntries(user.equippedItems) }, 'Item unequipped');
  } catch (err) {
    console.error('[unequipItem]', err);
    return serverError(res);
  }
};

// ── getPurchaseHistory ────────────────────────────────────────────────────────

export const getPurchaseHistory = async (req, res) => {
  try {
    const { page, limit, itemType } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (itemType) filter.itemType = itemType;

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .select('-stripePaymentIntentId -stripeSessionId -metadata')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(filter),
    ]);

    return ok(res, {
      purchases,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[getPurchaseHistory]', err);
    return serverError(res);
  }
};

// ── adminGrantItem ────────────────────────────────────────────────────────────
// Admin manually grants an item (compensation, events, bug fix)

export const adminGrantItem = async (req, res) => {
  try {
    const { userId, itemId, reason } = req.body;

    const item = getShopItem(itemId);
    if (!item) return notFound(res, 'Item not found');

    const user = await User.findById(userId);
    if (!user) return notFound(res, 'User not found');

    // Check not already owned
    const alreadyOwned = user.ownedItems?.some(o => o.itemId === itemId);
    if (alreadyOwned && !item.consumable) {
      return conflict(res, 'User already owns this item');
    }

    user.ownedItems.push({ itemId, purchasedAt: new Date(), quantity: 1 });
    await user.save();

    await Purchase.create({
      userId:        user._id,
      itemId,
      itemType:      item.type,
      itemName:      item.name,
      paymentMethod: 'admin_grant',
      status:        'completed',
      metadata:      { grantedBy: req.user._id.toString(), reason: reason ?? 'Admin grant' },
      balanceSnapshot: { credits: user.credits, premiumCurrency: user.premiumCurrency },
    });

    return ok(res, null, `${item.name} granted to ${user.username}`);
  } catch (err) {
    console.error('[adminGrantItem]', err);
    return serverError(res);
  }
};
