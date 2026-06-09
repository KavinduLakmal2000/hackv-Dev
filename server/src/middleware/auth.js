import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { unauthorized, forbidden, serverError } from '../utils/apiResponse.js';

// ── verifyJWT ─────────────────────────────────────────────────────────────────
// Extracts and validates the Bearer token from the Authorization header.
// Attaches the full user document to req.user.

export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, 'Token expired');
      }
      return unauthorized(res, 'Invalid token');
    }

    // Fetch user; exclude sensitive selects but include version for validation
    const user = await User.findById(decoded.sub).select('+refreshTokenVersion');

    if (!user) {
      return unauthorized(res, 'User not found');
    }

    if (!user.isActive || user.isBanned) {
      return forbidden(res, user.isBanned ? `Account banned: ${user.banReason || 'Policy violation'}` : 'Account inactive');
    }

    // Token version check — invalidates all tokens issued before a logout/ban
    if (decoded.ver !== user.refreshTokenVersion) {
      return unauthorized(res, 'Session invalidated. Please log in again.');
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[verifyJWT] Unexpected error:', err);
    return serverError(res, 'Authentication error');
  }
};

// ── optionalJWT ───────────────────────────────────────────────────────────────
// Same as verifyJWT but doesn't reject — used for public routes that can
// optionally benefit from knowing who the user is.

export const optionalJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return next(); // invalid token → just treat as guest
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenVersion');
    if (user?.isActive && !user.isBanned && decoded.ver === user.refreshTokenVersion) {
      req.user = user;
    }
  } catch {
    // Silent fail for optional auth
  }
  next();
};

// ── requireRole ───────────────────────────────────────────────────────────────
// Must be used AFTER verifyJWT.
// Usage: router.get('/admin', verifyJWT, requireRole('admin'), handler)

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }
  if (!roles.includes(req.user.role)) {
    return forbidden(res, 'Insufficient permissions');
  }
  next();
};

// ── Shortcuts ─────────────────────────────────────────────────────────────────
export const requireAdmin     = requireRole('admin');
export const requireModerator = requireRole('admin', 'moderator');
