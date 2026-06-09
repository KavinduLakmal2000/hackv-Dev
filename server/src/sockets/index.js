// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Socket.io Server Bootstrap
// Called once from server.js with the HTTP server.
// Attaches Socket.io, wires auth middleware, registers all event handlers.
// ─────────────────────────────────────────────────────────────────────────────

import { Server } from 'socket.io';
import { socketAuth, socketRateLimit } from '../middleware/socketAuth.js';
import { registerLobbyHandlers } from './lobbySocket.js';
import { registerGameHandlers } from './gameSocket.js';

export const initSocketServer = (httpServer, app) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL, 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Prefer WebSocket, fall back to polling
    transports: ['websocket', 'polling'],
    // Connection management
    pingTimeout:  20_000,
    pingInterval: 10_000,
    // Limit max payload size
    maxHttpBufferSize: 1e5, // 100KB max per message
    // Allow reconnection
    allowEIO3: true,
  });

  // ── Auth middleware ─────────────────────────────────────────────────────────
  // Every connection must present a valid JWT before any events fire
  io.use(socketAuth);

  // ── Connection handler ──────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { user } = socket;
    console.log(`[Socket.io] ${user.username} connected (${socket.id})`);

    // ── Rate limiting ─────────────────────────────────────────────────────────
    // Wrap socket.on to intercept all events and check rate limits
    const originalOn = socket.on.bind(socket);
    const limiter    = socketRateLimit(socket, (event, ...args) => {
      originalOn(event, ...args);
    });
    socket.on = (event, handler) => {
      originalOn(event, (...args) => limiter(event, handler, ...args));
    };

    // ── Register domain handlers ──────────────────────────────────────────────
    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);

    // ── Global events ─────────────────────────────────────────────────────────

    socket.on('ping', (_, ack) => {
      ack?.({ ts: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] ${user.username} disconnected: ${reason} (${socket.id})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket.io] Error for ${user.username}:`, err.message);
    });

    // Welcome packet
    socket.emit('connected', {
      userId:   user.id,
      username: user.username,
      role:     user.role,
      ts:       Date.now(),
    });
  });

  // ── Attach io to Express app (for REST controllers to emit) ─────────────────
  // This is what makes all the `req.app.get('io').to(room).emit(...)` calls work
  app.set('io', io);

  // ── Admin namespace (optional — for monitoring) ───────────────────────────
  const adminNs = io.of('/admin');
  adminNs.use(socketAuth);
  adminNs.use((socket, next) => {
    if (socket.user?.role !== 'admin') {
      return next(new Error('FORBIDDEN: Admin only'));
    }
    next();
  });

  adminNs.on('connection', (socket) => {
    console.log(`[Socket.io/admin] ${socket.user.username} connected`);

    // Admin can monitor global game stats
    socket.on('admin:stats', () => {
      socket.emit('admin:stats', {
        activeSessions: 0, // TODO: wire from timerManager in Slice 7
        connectedUsers: io.engine.clientsCount,
      });
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
};
