import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES  = '15m',
  JWT_REFRESH_EXPIRES = '7d',
} = process.env;

// ── Token payloads ────────────────────────────────────────────────────────────

/**
 * Sign an access token.
 * Short-lived (15m). Contains just enough to authorize requests.
 */
export const signAccessToken = (user) => {
  const payload = {
    sub:  user._id.toString(),
    role: user.role,
    ver:  user.refreshTokenVersion, // invalidation version
  };
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES,
    issuer: 'breach-api',
    audience: 'breach-client',
  });
};

/**
 * Sign a refresh token.
 * Long-lived (7d). Contains version for rotation-based invalidation.
 */
export const signRefreshToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    ver: user.refreshTokenVersion,
  };
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES,
    issuer: 'breach-api',
    audience: 'breach-client',
  });
};

/**
 * Verify an access token. Returns decoded payload or throws.
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET, {
    issuer: 'breach-api',
    audience: 'breach-client',
  });
};

/**
 * Verify a refresh token. Returns decoded payload or throws.
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'breach-api',
    audience: 'breach-client',
  });
};

// ── Cookie helpers ────────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'breach_refresh';

export const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,           // JS cannot read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth',        // only sent to auth endpoints
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
};

export const getRefreshCookie = (req) => req.cookies?.[REFRESH_COOKIE] ?? null;

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Generate a cryptographically secure random token (for email verify / reset) */
export const generateSecureToken = () => crypto.randomBytes(32).toString('hex');
