import { z } from 'zod';
import { validate, validateQuery } from './user.js';

// ── Send broadcast mail ───────────────────────────────────────────────────────

export const broadcastMailSchema = z.object({
  subject: z
    .string().trim().min(1, 'Subject required').max(120, 'Subject too long'),
  body: z
    .string().trim().min(1, 'Body required').max(4000, 'Body too long'),
  priority: z
    .enum(['normal', 'important', 'critical']).default('normal'),
  reward: z.object({
    credits:         z.number().int().min(0).max(100_000).default(0),
    premiumCurrency: z.number().int().min(0).max(10_000).default(0),
    itemId:          z.string().optional(),
  }).default({}),
  // Optional: only send to players at or above a certain tier
  targetTier: z
    .enum(['SCRIPT_KIDDIE', 'GREY_HAT', 'BLACK_HAT', 'ZERO_DAY', 'APT'])
    .optional(),
  // Optional: schedule delivery
  sendAt: z.coerce.date().optional(),
}).strict();

// ── Send personal mail ────────────────────────────────────────────────────────

export const personalMailSchema = z.object({
  recipientId: z.string().min(1, 'recipientId required'),
  subject:     z.string().trim().min(1).max(120),
  body:        z.string().trim().min(1).max(4000),
  priority:    z.enum(['normal', 'important', 'critical']).default('normal'),
  reward: z.object({
    credits:         z.number().int().min(0).max(100_000).default(0),
    premiumCurrency: z.number().int().min(0).max(10_000).default(0),
    itemId:          z.string().optional(),
  }).default({}),
}).strict();

// ── Mail query ────────────────────────────────────────────────────────────────

export const mailQuerySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(50).default(20),
  unread:  z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  type:    z.enum(['broadcast', 'personal', 'system']).optional(),
});

// ── Admin mail list query ─────────────────────────────────────────────────────

export const adminMailQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type:  z.enum(['broadcast', 'personal', 'system']).optional(),
});

// ── Maintenance config ────────────────────────────────────────────────────────

export const maintenanceUpdateSchema = z.object({
  maintenanceMode: z.object({
    enabled: z.boolean(),
    message: z.string().trim().max(300).optional(),
  }).optional(),
  registrationOpen: z.boolean().optional(),
  matchmakingOpen:  z.boolean().optional(),
  shopOpen:         z.boolean().optional(),
  announcement: z.object({
    enabled: z.boolean(),
    message: z.string().trim().max(500).optional(),
    type:    z.enum(['info', 'warning', 'critical']).optional(),
  }).optional(),
  season: z.object({
    number: z.number().int().min(1).optional(),
    name:   z.string().trim().max(50).optional(),
    endsAt: z.coerce.date().nullable().optional(),
  }).optional(),
}).strict();

export { validate, validateQuery };
