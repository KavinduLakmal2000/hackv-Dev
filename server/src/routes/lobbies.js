import { Router } from 'express';
import * as lobbyController from '../controllers/lobbyController.js';
import { verifyJWT, optionalJWT } from '../middleware/auth.js';
import {
  validate,
  validateQuery,
  createLobbySchema,
  joinLobbySchema,
  chooseTeamSchema,
  updateSettingsSchema,
  lobbyListQuerySchema,
} from '../validators/lobby.js';
import { z } from 'zod';

const router = Router();

// ── Public (no auth required) ─────────────────────────────────────────────────

/**
 * GET /api/lobbies?mode=1v1&page=1&limit=20
 * Browse open public lobbies
 */
router.get('/',
  optionalJWT,
  validateQuery(lobbyListQuerySchema),
  lobbyController.listPublicLobbies
);

/**
 * GET /api/lobbies/:code
 * Get lobby details by code (for joining via link)
 */
router.get('/:code',
  optionalJWT,
  lobbyController.getLobby
);

// ── Authenticated ─────────────────────────────────────────────────────────────

/**
 * GET /api/lobbies/me/current
 * Which lobby am I currently in?
 */
router.get('/me/current',
  verifyJWT,
  lobbyController.getMyLobby
);

/**
 * POST /api/lobbies
 * Create a new lobby
 * Body: { mode, isPrivate?, password?, settings? }
 */
router.post('/',
  verifyJWT,
  validate(createLobbySchema),
  lobbyController.createLobby
);

/**
 * POST /api/lobbies/:code/join
 * Join an existing lobby
 * Body: { password? }
 */
router.post('/:code/join',
  verifyJWT,
  validate(joinLobbySchema),
  lobbyController.joinLobby
);

/**
 * POST /api/lobbies/:code/leave
 * Leave a lobby (transfers host if needed)
 */
router.post('/:code/leave',
  verifyJWT,
  lobbyController.leaveLobby
);

/**
 * PATCH /api/lobbies/:code/team
 * Choose or switch team
 * Body: { team: 'developer' | 'hacker' }
 */
router.patch('/:code/team',
  verifyJWT,
  validate(chooseTeamSchema),
  lobbyController.chooseTeam
);

/**
 * PATCH /api/lobbies/:code/ready
 * Toggle ready state
 * Body: { ready: boolean }
 */
router.patch('/:code/ready',
  verifyJWT,
  validate(z.object({ ready: z.boolean() })),
  lobbyController.setReady
);

/**
 * PATCH /api/lobbies/:code/settings
 * Host updates lobby settings
 * Body: { settings?, isPrivate?, password? }
 */
router.patch('/:code/settings',
  verifyJWT,
  validate(updateSettingsSchema),
  lobbyController.updateSettings
);

/**
 * POST /api/lobbies/:code/kick/:targetId
 * Host kicks a player
 */
router.post('/:code/kick/:targetId',
  verifyJWT,
  lobbyController.kickPlayer
);

/**
 * POST /api/lobbies/:code/start
 * Host starts the game (all players must be ready)
 */
router.post('/:code/start',
  verifyJWT,
  lobbyController.startGame
);

export default router;
