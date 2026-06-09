import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io Authentication Middleware
// Runs once per connection before any events are processed.
// Attaches req.user equivalent as socket.user
// ─────────────────────────────────────────────────────────────────────────────

export const socketAuth = async (socket, next) => {
  try {
    // Client sends token in handshake auth: { token: 'Bearer ...' }
    const raw = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization ?? '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

    if (!token) {
      return next(new Error('AUTH_MISSING: No token provided'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'AUTH_EXPIRED' : 'AUTH_INVALID';
      return next(new Error(`${msg}: ${err.message}`));
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenVersion');

    if (!user) return next(new Error('AUTH_NOTFOUND: User not found'));
    if (!user.isActive || user.isBanned) {
      return next(new Error('AUTH_BANNED: Account suspended'));
    }
    if (decoded.ver !== user.refreshTokenVersion) {
      return next(new Error('AUTH_STALE: Session invalidated'));
    }

    // Attach to socket for all handlers
    socket.user = {
      _id:         user._id,
      id:          user._id.toString(),
      username:    user.username,
      displayName: user.displayName,
      role:        user.role,
    };

    next();
  } catch (err) {
    console.error('[socketAuth] Unexpected error:', err);
    next(new Error('AUTH_ERROR: Authentication failed'));
  }
};

// ── Rate limiter for socket events ────────────────────────────────────────────
// Tracks per-socket event counts within a sliding window

const EVENT_LIMITS = {
  'game:deploy':  { max: 10,  windowMs: 10_000 },   // 10 deploys per 10s
  'game:attack':  { max: 5,   windowMs: 5_000  },   // 5 attacks per 5s
  'game:guess':   { max: 3,   windowMs: 10_000 },   // 3 guesses per 10s
  'lobby:ready':  { max: 10,  windowMs: 10_000 },
  'lobby:chat':   { max: 5,   windowMs: 3_000  },   // anti-spam in lobby chat
  DEFAULT:        { max: 20,  windowMs: 1_000  },
};

export const socketRateLimit = (socket, next) => {
  // Attach tracker to socket on first event
  if (!socket._rateCounts) socket._rateCounts = {};

  return (eventName, ...args) => {
    const limit  = EVENT_LIMITS[eventName] ?? EVENT_LIMITS.DEFAULT;
    const now    = Date.now();
    const key    = eventName;

    if (!socket._rateCounts[key]) {
      socket._rateCounts[key] = { count: 0, windowStart: now };
    }

    const tracker = socket._rateCounts[key];

    // Reset window if expired
    if (now - tracker.windowStart > limit.windowMs) {
      tracker.count       = 0;
      tracker.windowStart = now;
    }

    tracker.count++;

    if (tracker.count > limit.max) {
      socket.emit('error', { code: 'RATE_LIMITED', event: eventName });
      return; // drop the event silently (don't disconnect)
    }

    next(eventName, ...args);
  };
};
