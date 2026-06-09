import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { verifyJWT, requireAdmin, requireModerator } from '../middleware/auth.js';
import {
  validate,
  validateQuery,
  adminUpdateUserSchema,
  adminAdjustRankSchema,
  userListQuerySchema,
} from '../validators/user.js';
import { z } from 'zod';

const router = Router();

// All admin routes require a valid JWT + admin role
// Using requireModerator where moderators should also have access
router.use(verifyJWT);

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * High-level numbers: total users, new signups, active today, tier breakdown
 */
router.get('/stats',
  requireAdmin,
  adminController.getDashboardStats
);

// ── User management ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/users?page=1&limit=20&search=...&role=player&banned=false
 */
router.get('/users',
  requireModerator,
  validateQuery(userListQuerySchema),
  adminController.listUsers
);

/**
 * GET /api/admin/users/:id
 */
router.get('/users/:id',
  requireModerator,
  adminController.getUserById
);

/**
 * PATCH /api/admin/users/:id
 * Change role, active status, credits, ban status in one call
 */
router.patch('/users/:id',
  requireAdmin,
  validate(adminUpdateUserSchema),
  adminController.updateUser
);

/**
 * DELETE /api/admin/users/:id
 * Hard delete — admin only, use ban instead where possible
 */
router.delete('/users/:id',
  requireAdmin,
  adminController.deleteUser
);

// ── Dedicated ban/unban ───────────────────────────────────────────────────────

/**
 * POST /api/admin/users/:id/ban
 * Body: { reason? }
 */
router.post('/users/:id/ban',
  requireModerator,
  validate(z.object({ reason: z.string().trim().max(255).optional() })),
  adminController.banUser
);

/**
 * POST /api/admin/users/:id/unban
 */
router.post('/users/:id/unban',
  requireModerator,
  adminController.unbanUser
);

// ── Rank management ───────────────────────────────────────────────────────────

/**
 * POST /api/admin/users/:id/rank
 * Body: { points: +/-number, reason: string }
 * Manually adjust rank (tournament rewards, corrections, etc.)
 */
router.post('/users/:id/rank',
  requireAdmin,
  validate(adminAdjustRankSchema),
  adminController.adjustRank
);

export default router;
