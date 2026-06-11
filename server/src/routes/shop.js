import { Router } from 'express';
import express from 'express';
import * as shopController from '../controllers/shopController.js';
import { verifyJWT, requireAdmin } from '../middleware/auth.js';
import {
  validate,
  validateQuery,
  buyItemSchema,
  equipItemSchema,
  createCheckoutSchema,
  purchaseHistoryQuerySchema,
} from '../validators/shop.js';
import { z } from 'zod';

const router = Router();

// ── CRITICAL: Stripe webhook needs raw body ───────────────────────────────────
// This MUST be registered before express.json() parses the body.
// Stripe signature verification requires the raw, unparsed buffer.
// This route is intentionally public (no verifyJWT) — Stripe calls it directly.

router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  shopController.handleStripeWebhook
);

// ── All other shop routes parse JSON normally ─────────────────────────────────

// ── Public catalog (no auth — show prices before login) ──────────────────────

/**
 * GET /api/shop/catalog
 * Full shop catalog grouped by type.
 * If authenticated, includes ownership and equipped status.
 */
router.get('/catalog',
  // Optional auth — logged-in users get ownership flags
  (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return verifyJWT(req, res, next);
    }
    next();
  },
  shopController.getCatalog
);

// ── Authenticated routes ──────────────────────────────────────────────────────

router.use(verifyJWT);

// ── Purchasing ────────────────────────────────────────────────────────────────

/**
 * POST /api/shop/buy
 * Purchase a cosmetic/credit-pack with premium currency.
 * Price is ALWAYS resolved server-side from the catalog.
 * Body: { itemId }
 */
router.post('/buy',
  validate(buyItemSchema),
  shopController.buyItem
);

/**
 * POST /api/shop/checkout
 * Create a Stripe Checkout session for a real-money premium pack.
 * Body: { packId }
 */
router.post('/checkout',
  validate(createCheckoutSchema),
  shopController.createCheckoutSession
);

/**
 * GET /api/shop/checkout/verify?sessionId=...
 * Client calls after returning from Stripe success_url.
 * Confirms payment and returns updated wallet.
 */
router.get('/checkout/verify',
  shopController.verifyCheckoutSuccess
);

// ── Inventory & equipping ─────────────────────────────────────────────────────

/**
 * GET /api/shop/inventory
 * Player's owned items with metadata + equipped status.
 */
router.get('/inventory',
  shopController.getInventory
);

/**
 * POST /api/shop/equip
 * Equip an owned item to a slot.
 * Body: { itemId, slot }
 */
router.post('/equip',
  validate(equipItemSchema),
  shopController.equipItem
);

/**
 * POST /api/shop/unequip
 * Remove item from a slot.
 * Body: { slot }
 */
router.post('/unequip',
  validate(z.object({ slot: z.string().min(1) })),
  shopController.unequipItem
);

/**
 * GET /api/shop/purchases?page=1&limit=20&itemType=cosmetic
 * Player's full purchase history.
 */
router.get('/purchases',
  validateQuery(purchaseHistoryQuerySchema),
  shopController.getPurchaseHistory
);

// ── Admin ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/shop/admin/grant
 * Admin grants an item to a player (compensation, events).
 * Body: { userId, itemId, reason? }
 */
router.post('/admin/grant',
  requireAdmin,
  validate(z.object({
    userId: z.string().min(1),
    itemId: z.string().min(1),
    reason: z.string().max(255).optional(),
  })),
  shopController.adminGrantItem
);

export default router;
