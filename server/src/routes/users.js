import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { verifyJWT, optionalJWT } from '../middleware/auth.js';
import {
  validate,
  validateQuery,
  updateProfileSchema,
  leaderboardQuerySchema,
} from '../validators/user.js';
import { z } from 'zod';

const router = Router();

// ── My profile ────────────────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Full private profile for the logged-in user
 */
router.get('/me',
  verifyJWT,
  userController.getMyProfile
);

/**
 * PATCH /api/users/me
 * Update displayName, bio, preferredRole
 */
router.patch('/me',
  verifyJWT,
  validate(updateProfileSchema),
  userController.updateMyProfile
);

/**
 * PATCH /api/users/me/avatar
 * Body: { avatarUrl }
 */
router.patch('/me/avatar',
  verifyJWT,
  validate(z.object({ avatarUrl: z.string().url('Must be a valid URL') })),
  userController.updateAvatar
);

/**
 * GET /api/users/me/stats
 * Detailed stats + win rate for the logged-in player
 */
router.get('/me/stats',
  verifyJWT,
  userController.getMyStats
);

// ── Leaderboard ───────────────────────────────────────────────────────────────

/**
 * GET /api/users/leaderboard?page=1&limit=20&tier=BLACK_HAT
 * Public — no auth required
 */
router.get('/leaderboard',
  optionalJWT,
  validateQuery(leaderboardQuerySchema),
  userController.getLeaderboard
);

// ── Public profiles ───────────────────────────────────────────────────────────

/**
 * GET /api/users/:username
 * Public profile — by username
 */
router.get('/:username',
  optionalJWT,
  userController.getPublicProfile
);

export default router;
