import MaintenanceConfig from '../models/MaintenanceConfig.js';

// ─────────────────────────────────────────────────────────────────────────────
// Maintenance Middleware
// Reads the singleton MaintenanceConfig from DB on each request.
// Uses a short in-memory cache (30s TTL) to avoid hitting MongoDB every request.
// ─────────────────────────────────────────────────────────────────────────────

let _cache    = null;
let _cacheTs  = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

const getConfig = async () => {
  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL_MS) return _cache;

  _cache   = await MaintenanceConfig.get();
  _cacheTs = now;
  return _cache;
};

// Exported so admin controller can bust cache after updates
export const bustMaintenanceCache = () => {
  _cache   = null;
  _cacheTs = 0;
};

// ── maintenanceGuard ──────────────────────────────────────────────────────────
// Blocks all non-admin requests during maintenance.
// Admins and moderators always get through.

export const maintenanceGuard = async (req, res, next) => {
  try {
    const config = await getConfig();

    if (!config.maintenanceMode?.enabled) return next();

    // Always allow health check through
    if (req.path === '/api/health') return next();

    // Auth endpoints allowed — users need to be able to log in as admin
    if (req.path.startsWith('/api/auth/login') ||
        req.path.startsWith('/api/auth/refresh') ||
        req.path.startsWith('/api/auth/google')) {
      return next();
    }

    // Check if the user is admin/moderator — they bypass maintenance
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyAccessToken } = await import('../utils/jwt.js');
        const decoded = verifyAccessToken(authHeader.slice(7));
        if (decoded?.role === 'admin' || decoded?.role === 'moderator') {
          return next();
        }
      } catch {
        // Invalid token — fall through to 503
      }
    }

    return res.status(503).json({
      success:     false,
      maintenance: true,
      message:     config.maintenanceMode.message ?? 'BREACH is under maintenance. Back soon.',
    });
  } catch (err) {
    console.error('[maintenanceGuard]', err);
    next(); // fail open — don't block if DB unreachable
  }
};

// ── registrationGuard ─────────────────────────────────────────────────────────
// Blocks new registrations if disabled

export const registrationGuard = async (req, res, next) => {
  try {
    const config = await getConfig();
    if (config.registrationOpen === false) {
      return res.status(403).json({
        success: false,
        message: 'New registrations are currently closed.',
      });
    }
    next();
  } catch {
    next();
  }
};

// ── matchmakingGuard ──────────────────────────────────────────────────────────
// Blocks lobby creation/joining if matchmaking is disabled

export const matchmakingGuard = async (req, res, next) => {
  try {
    const config = await getConfig();
    if (config.matchmakingOpen === false) {
      return res.status(403).json({
        success: false,
        message: 'Matchmaking is temporarily disabled.',
      });
    }
    next();
  } catch {
    next();
  }
};

// ── shopGuard ─────────────────────────────────────────────────────────────────

export const shopGuard = async (req, res, next) => {
  // Always allow Stripe webhooks through
  if (req.path === '/webhook/stripe') return next();

  try {
    const config = await getConfig();
    if (config.shopOpen === false) {
      return res.status(403).json({
        success: false,
        message: 'The shop is temporarily closed.',
      });
    }
    next();
  } catch {
    next();
  }
};
