import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { createServer } from 'http';

import { connectDB } from './config/database.js';
import passport from './config/passport.js';
import { initSocketServer } from './sockets/index.js';
import { maintenanceGuard, registrationGuard, matchmakingGuard, shopGuard } from './middleware/maintenance.js';
import authRoutes        from './routes/auth.js';
import userRoutes        from './routes/users.js';
import adminRoutes       from './routes/admin.js';
import lobbyRoutes       from './routes/lobbies.js';
import gameRoutes        from './routes/game.js';
import shopRoutes        from './routes/shop.js';
import adminConfigRoutes from './routes/adminConfig.js';
import { serverError } from './utils/apiResponse.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (needed behind nginx / Railway / Render) ──────────────────────
app.set('trust proxy', 1);

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // allow game assets
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],   // no inline scripts
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
        connectSrc: ["'self'", process.env.CLIENT_URL],
        frameSrc:   ["'none'"],
        objectSrc:  ["'none'"],
      },
    },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [process.env.CLIENT_URL, 'http://localhost:5173'];
      // Allow requests with no origin (mobile apps, curl in dev)
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,             // allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  })
);

// ── CRITICAL: Shop webhook route (raw body) must come BEFORE express.json() ──
// Stripe signature verification requires the raw, unparsed Buffer.
// The route itself handles raw parsing for /webhook/stripe only.
app.use('/api/shop',    shopGuard);               // blocks shop when closed (except webhook)
app.use('/api/shop', shopRoutes);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));         // reject huge payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── NoSQL injection sanitization ──────────────────────────────────────────────
app.use(mongoSanitize());

// ── HTTP parameter pollution prevention ──────────────────────────────────────
app.use(hpp());

// ── Global rate limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, slow down.' },
});
app.use('/api', globalLimiter);

// ── Strict rate limiter for auth endpoints ────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,   // 20 login/register attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Try again later.' },
  skipSuccessfulRequests: true, // only count failures
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ── Passport (OAuth only — no sessions) ──────────────────────────────────────
app.use(passport.initialize());

// ── Maintenance guard (runs on every /api request after body parsing) ─────────
app.use('/api', maintenanceGuard);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/auth/register', registrationGuard);
app.use('/api/users',   userRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/lobbies', matchmakingGuard, lobbyRoutes);
app.use('/api/game',    gameRoutes);
// /api/shop already registered above (before JSON parser for Stripe webhook)
app.use('/api',         adminConfigRoutes);       // /api/config, /api/mail, /api/admin/...

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'online', ts: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[GlobalError]', err);

  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  return serverError(res, process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const httpServer = createServer(app);

const start = async () => {
  await connectDB();

  // ── Socket.io ───────────────────────────────────────────────────────────────
  // Must be initialized after HTTP server is created but before listen()
  initSocketServer(httpServer, app);

  httpServer.listen(PORT, () => {
    console.log(`[Server] BREACH API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};

start();

// Export for Socket.io (Slice 5) and tests
export { app, httpServer };