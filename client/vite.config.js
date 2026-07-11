import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // In dev, proxy API calls so CORS isn't an issue
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // ── Security ────────────────────────────────────────────────────────────
    // No source maps in production — never expose original source to the client.
    // This is what closes the "anyone can inspect the code" concern in the brief.
    // Dev source maps still work (controlled by NODE_ENV, not this flag).
    sourcemap: false,

    // Aggressive minification — makes the bundle unreadable in DevTools.
    // Not a replacement for server-side validation, but raises the cost of
    // someone trying to reverse-engineer shop logic or game state assumptions.
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console:  true,    // strip all console.log/warn/error
        drop_debugger: true,    // strip debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        toplevel: true,         // rename top-level functions and variables
      },
      format: {
        comments: false,        // strip all comments
      },
    },

    // ── Code splitting ───────────────────────────────────────────────────────
    // Split vendor chunks so returning users don't re-download React/Zustand
    // on every deploy — only the changed app chunks need re-fetching.
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — very stable, long cache TTL
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // State and networking — changes infrequently
          state: ['zustand', 'axios', 'socket.io-client'],
        },
      },
    },

    // Warn if any single chunk exceeds 500KB uncompressed
    chunkSizeWarningLimit: 500,
  },
});
