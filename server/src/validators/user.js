import { z } from 'zod';
import { validate } from './auth.js';

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(40, 'Display name too long')
    .optional(),
  bio: z
    .string()
    .trim()
    .max(160, 'Bio must be 160 characters or less')
    .optional(),
  preferredRole: z
    .enum(['developer', 'hacker', 'any'], {
      errorMap: () => ({ message: 'preferredRole must be developer, hacker, or any' }),
    })
    .optional(),
}).strict(); // reject unknown fields

// ── Admin: update any user ────────────────────────────────────────────────────

export const adminUpdateUserSchema = z.object({
  role: z
    .enum(['player', 'moderator', 'admin'], {
      errorMap: () => ({ message: 'role must be player, moderator, or admin' }),
    })
    .optional(),
  isActive: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  banReason: z
    .string()
    .trim()
    .max(255, 'Ban reason too long')
    .optional(),
  credits: z
    .number()
    .int()
    .min(0, 'Credits cannot be negative')
    .max(1_000_000, 'Credits ceiling exceeded')
    .optional(),
  premiumCurrency: z
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .optional(),
}).strict();

// ── Admin: adjust rank ────────────────────────────────────────────────────────

export const adminAdjustRankSchema = z.object({
  points: z
    .number()
    .int('Points must be an integer')
    .min(-100_000)
    .max(100_000),
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required')
    .max(255),
});

// ── Query: user list (admin) ──────────────────────────────────────────────────

export const userListQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(50).optional(),
  role:   z.enum(['player', 'moderator', 'admin']).optional(),
  banned: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  sortBy: z.enum(['createdAt', 'rank.points', 'username', 'lastLoginAt']).default('createdAt'),
  order:  z.enum(['asc', 'desc']).default('desc'),
});

// ── Query: leaderboard ────────────────────────────────────────────────────────

export const leaderboardQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tier:  z
    .enum(['SCRIPT_KIDDIE', 'GREY_HAT', 'BLACK_HAT', 'ZERO_DAY', 'APT'])
    .optional(),
});

// ── Query validator middleware ────────────────────────────────────────────────
// Same as validate() but parses req.query instead of req.body

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: 'Invalid query parameters', errors });
  }
  req.query = result.data;
  next();
};

export { validate };
