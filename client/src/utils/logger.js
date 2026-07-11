// ─────────────────────────────────────────────────────────────────────────────
// Logger — dev-only logging wrapper.
// In production (VITE_MODE=production), all these become no-ops AND terser's
// drop_console + pure_funcs strips them from the bundle entirely.
// Never use bare console.log/warn/error in the client — always use this.
// ─────────────────────────────────────────────────────────────────────────────

const isDev = import.meta.env.DEV;

export const log = {
  info:  (...args) => isDev && console.log('[BREACH]', ...args),
  warn:  (...args) => isDev && console.warn('[BREACH]', ...args),
  error: (...args) => isDev && console.error('[BREACH]', ...args),
  socket:(...args) => isDev && console.log('[Socket]', ...args),
  store: (...args) => isDev && console.log('[Store]', ...args),
};
