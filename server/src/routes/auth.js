import { Router } from 'express';
import passport from '../config/passport.js';
import * as authController from '../controllers/authController.js';
import { verifyJWT } from '../middleware/auth.js';
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.js';

const router = Router();

// ── Local auth ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { username, email, password, displayName? }
 */
router.post('/register',
  validate(registerSchema),
  authController.register
);

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login',
  validate(loginSchema),
  authController.login
);

/**
 * POST /api/auth/logout
 * Requires: Bearer token (clears refresh cookie, increments token version)
 */
router.post('/logout',
  verifyJWT,
  authController.logout
);

/**
 * POST /api/auth/refresh
 * Reads httpOnly refresh cookie — issues new access token
 */
router.post('/refresh',
  authController.refresh
);

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile
 */
router.get('/me',
  verifyJWT,
  authController.me
);

// ── Google OAuth ──────────────────────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    prompt: 'select_account', // always show account picker
  })
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after auth — issues tokens and redirects to client
 */
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/auth/error?reason=google_failed`,
  }),
  authController.googleCallback
);

// ── Password management ───────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always responds with 200 to prevent email enumeration
 */
router.post('/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
router.post('/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * POST /api/auth/change-password
 * Requires: Bearer token
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password',
  verifyJWT,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
