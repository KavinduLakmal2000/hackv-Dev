import { Router } from 'express';
import * as mailController       from '../controllers/mailController.js';
import * as adminConfigController from '../controllers/adminConfigController.js';
import { verifyJWT, requireAdmin, requireModerator } from '../middleware/auth.js';
import {
  validate,
  validateQuery,
  broadcastMailSchema,
  personalMailSchema,
  mailQuerySchema,
  adminMailQuerySchema,
  maintenanceUpdateSchema,
} from '../validators/admin.js';

const router = Router();

// ── Public config (client bootstrap) ─────────────────────────────────────────

/**
 * GET /api/config
 * Returns maintenance status, announcement, season info for the client.
 * Called on app load — no auth required.
 */
router.get('/config', adminConfigController.getPublicConfig);

// ── Player mail inbox ─────────────────────────────────────────────────────────

router.use('/mail', verifyJWT);

/**
 * GET /api/mail?page=1&limit=20&unread=true
 * Player's inbox — personal + broadcasts
 */
router.get('/mail',
  validateQuery(mailQuerySchema),
  mailController.getInbox
);

/**
 * GET /api/mail/:mailId
 * Read a specific mail (marks as read)
 */
router.get('/mail/:mailId',
  mailController.readMail
);

/**
 * POST /api/mail/:mailId/claim
 * Claim the reward attached to a mail
 */
router.post('/mail/:mailId/claim',
  mailController.claimReward
);

/**
 * DELETE /api/mail/:mailId
 * Delete a personal mail (not broadcasts)
 */
router.delete('/mail/:mailId',
  mailController.deleteMail
);

// ── Admin mail management ─────────────────────────────────────────────────────

router.use('/admin/mail',   verifyJWT, requireModerator);
router.use('/admin/config', verifyJWT, requireAdmin);
router.use('/admin/dashboard', verifyJWT, requireAdmin);

/**
 * POST /api/admin/mail/broadcast
 * Send a message to all players (with optional reward, tier filter)
 */
router.post('/admin/mail/broadcast',
  validate(broadcastMailSchema),
  mailController.sendBroadcast
);

/**
 * POST /api/admin/mail/personal
 * Send a message to one specific player
 */
router.post('/admin/mail/personal',
  validate(personalMailSchema),
  mailController.sendPersonalMail
);

/**
 * GET /api/admin/mail?page=1&limit=20&type=broadcast
 * List all sent mails
 */
router.get('/admin/mail',
  validateQuery(adminMailQuerySchema),
  mailController.adminListMail
);

/**
 * DELETE /api/admin/mail/:mailId
 * Admin deletes a mail
 */
router.delete('/admin/mail/:mailId',
  requireAdmin,
  mailController.adminDeleteMail
);

// ── Admin server config ───────────────────────────────────────────────────────

/**
 * GET /api/admin/config
 * Full server config (maintenance, shop, matchmaking, season)
 */
router.get('/admin/config',
  adminConfigController.getConfig
);

/**
 * PATCH /api/admin/config
 * Update any server config flag
 * Body: { maintenanceMode?, registrationOpen?, matchmakingOpen?, shopOpen?, announcement?, season? }
 */
router.patch('/admin/config',
  validate(maintenanceUpdateSchema),
  adminConfigController.updateConfig
);

/**
 * GET /api/admin/dashboard
 * Full admin dashboard — users, games, revenue, top players
 */
router.get('/admin/dashboard',
  adminConfigController.getFullDashboard
);

export default router;
