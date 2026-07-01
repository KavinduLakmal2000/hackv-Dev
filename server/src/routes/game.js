import { Router } from 'express';
import * as gameController from '../controllers/gameController.js';
import { verifyJWT } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import { requireEmailVerified } from '../middleware/requireEmailVerified.js';
import {
  validate,
  deployToolSchema,
  launchAttackSchema,
  setSecretWordSchema,
  submitGuessSchema,
} from '../validators/game.js';

const router = Router();

// All game routes require authentication
router.use(verifyJWT);
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return requireEmailVerified(req, res, next);
});

// ── Session management ────────────────────────────────────────────────────────

/**
 * POST /api/game/init/:code
 * Initialize a game session from a lobby (called after lobby start)
 * Body: empty — uses lobby code from params
 */
router.post('/init/:code',
  gameController.initializeGame
);

/**
 * GET /api/game/:sessionId
 * Get role-filtered game state for the authenticated player
 */
router.get('/:sessionId',
  gameController.getSessionState
);

/**
 * POST /api/game/:sessionId/round/start
 * Start the current pending round (host action)
 */
router.post('/:sessionId/round/start',
  gameController.startRound
);

/**
 * POST /api/game/:sessionId/round/expire
 * Force-expire the current round (called by timer in Slice 5)
 * Admin only from HTTP — normally triggered by Socket.io
 */
router.post('/:sessionId/round/expire',
  requireAdmin,
  gameController.expireRound
);

// ── Developer actions ─────────────────────────────────────────────────────────

/**
 * POST /api/game/:sessionId/defend
 * Deploy a defense tool
 * Body: { toolId }
 */
router.post('/:sessionId/defend',
  validate(deployToolSchema),
  gameController.deployDefense
);

/**
 * POST /api/game/:sessionId/secret-word
 * Developer sets the round's secret word
 * Body: { word, hint? }
 */
router.post('/:sessionId/secret-word',
  validate(setSecretWordSchema),
  gameController.setSecretWord
);

// ── Hacker actions ────────────────────────────────────────────────────────────

/**
 * POST /api/game/:sessionId/attack
 * Launch an attack tool
 * Body: { toolId }
 */
router.post('/:sessionId/attack',
  validate(launchAttackSchema),
  gameController.launchAttack
);

/**
 * POST /api/game/:sessionId/guess
 * Hacker submits a secret word guess
 * Body: { guess }
 */
router.post('/:sessionId/guess',
  validate(submitGuessSchema),
  gameController.submitSecretWord
);

export default router;
