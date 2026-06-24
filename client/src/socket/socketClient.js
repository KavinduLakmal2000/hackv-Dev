import { io } from 'socket.io-client';

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io Client Singleton
// One connection for the whole app lifetime. Auth token is read fresh from
// the auth store on EVERY connection attempt (including reconnects) so a
// token refresh that happened while disconnected is picked up automatically.
// ─────────────────────────────────────────────────────────────────────────────

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

let _socket        = null;
let _getTokenFn     = () => null;

export const configureSocketAuth = (getTokenFn) => {
  _getTokenFn = getTokenFn;
};

/**
 * Get the singleton socket instance, creating it on first call.
 * Does NOT auto-connect — call connectSocket() explicitly after login.
 */
export const getSocket = () => {
  if (_socket) return _socket;

  _socket = io(SOCKET_URL, {
    autoConnect: false,
    transports:  ['websocket', 'polling'],
    auth:        (cb) => cb({ token: `Bearer ${_getTokenFn() ?? ''}` }),
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // ── Global diagnostic listeners ─────────────────────────────────────────────
  _socket.on('connect', () => {
    console.log('[Socket] Connected:', _socket.id);
  });

  _socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  _socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
    // AUTH_EXPIRED / AUTH_INVALID — the token in memory is stale.
    // The caller (useSocket hook) is responsible for refreshing and
    // reconnecting; this layer just surfaces the error.
  });

  _socket.on('connected', (payload) => {
    console.log('[Socket] Welcome packet:', payload);
  });

  _socket.on('error', (err) => {
    console.warn('[Socket] Server error event:', err);
  });

  return _socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (_socket?.connected) _socket.disconnect();
};

/**
 * Promise-wrapped emit with ack callback — matches the {ok, ...} pattern
 * every server handler uses.
 */
export const emitAsync = (event, payload = {}, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const s = getSocket();
    if (!s.connected) return reject(new Error('Socket not connected'));

    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);

    s.emit(event, payload, (ack) => {
      clearTimeout(timer);
      if (ack?.ok) resolve(ack);
      else reject(new Error(ack?.error || `${event} failed`));
    });
  });
