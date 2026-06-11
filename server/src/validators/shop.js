import { z } from 'zod';
import { ALL_SHOP_ITEMS } from '../config/shopCatalog.js';
import { validate, validateQuery } from './user.js';

const ALL_ITEM_IDS = Object.keys(ALL_SHOP_ITEMS);

// ── Buy with premium currency ─────────────────────────────────────────────────

export const buyItemSchema = z.object({
  itemId: z.enum(ALL_ITEM_IDS, {
    errorMap: () => ({ message: 'Invalid item ID' }),
  }),
});

// ── Equip item ────────────────────────────────────────────────────────────────

export const equipItemSchema = z.object({
  itemId: z.string().min(1, 'itemId required'),
  slot:   z.string().min(1, 'slot required'),
});

// ── Checkout session (Stripe — for real-money premium packs) ──────────────────

export const createCheckoutSchema = z.object({
  packId: z.enum(Object.keys(
    Object.fromEntries(
      Object.entries(ALL_SHOP_ITEMS).filter(([, v]) => v.stripePriceId)
    )
  ), {
    errorMap: () => ({ message: 'Invalid premium pack ID' }),
  }),
});

// ── Purchase history query ────────────────────────────────────────────────────

export const purchaseHistoryQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
  itemType: z.string().optional(),
});

export { validate, validateQuery };
