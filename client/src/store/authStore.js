import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth.js';
import { configureInterceptors } from '../api/axiosInstance.js';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Store
// Access token lives in memory ONLY — never localStorage, never a cookie.
// Refresh token is httpOnly cookie (handled by browser automatically).
// We persist only the user profile (not the token) so the UI can show
// the username on hard reload before the refresh completes.
// ─────────────────────────────────────────────────────────────────────────────

// In-memory token — not part of Zustand state so it never serialises
let _accessToken = null;

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────────
      user:        null,
      isLoading:   false,
      isReady:     false,   // true after initial refresh attempt
      error:       null,

      // ── Internal helpers ───────────────────────────────────────────────────
      _setToken: (token) => { _accessToken = token; },
      _getToken: ()      => _accessToken,
      _clearToken:()     => { _accessToken = null; },

      // ── Auth actions ───────────────────────────────────────────────────────

      register: async ({ username, email, password, displayName }) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.register({ username, email, password, displayName });
          _accessToken = res.data.accessToken;
          set({ user: res.data.user, isLoading: false, isReady: true });
          return { ok: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed';
          const errors  = err.response?.data?.errors  || null;
          set({ isLoading: false, error: message });
          return { ok: false, message, errors };
        }
      },

      login: async ({ email, password }) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.login({ email, password });
          _accessToken = res.data.accessToken;
          set({ user: res.data.user, isLoading: false, isReady: true });
          return { ok: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed';
          set({ isLoading: false, error: message });
          return { ok: false, message };
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch { /* silent */ }
        _accessToken = null;
        set({ user: null, error: null, isReady: true });
      },

      // Called on app boot — tries silent re-auth via httpOnly cookie
      initialize: async () => {
        set({ isLoading: true });
        try {
          const res = await authApi.refresh();
          _accessToken = res.data.accessToken;
          // Fetch fresh profile
          const meRes = await authApi.me();
          set({ user: meRes.data.user, isLoading: false, isReady: true });
        } catch {
          // No valid session — that's fine, user goes to login
          _accessToken = null;
          set({ user: null, isLoading: false, isReady: true });
        }
      },

      // Called by Google OAuth callback page after token extracted from URL
      setFromOAuth: (accessToken, user) => {
        _accessToken = accessToken;
        set({ user, isReady: true });
        // Clear the token from URL immediately
        window.history.replaceState({}, document.title, window.location.pathname);
      },

      // Update user in store after profile edits
      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : s.user })),

      clearError: () => set({ error: null }),

      // Selectors
      isLoggedIn: () => !!_accessToken && !!get().user,
      isAdmin:    () => get().user?.role === 'admin',
      isMod:      () => ['admin', 'moderator'].includes(get().user?.role),
    }),
    {
      name:    'breach-auth',
      // Only persist the user profile (not the token)
      partialize: (s) => ({ user: s.user }),
    }
  )
);

// Wire interceptors once the store is created
const store = useAuthStore.getState();
configureInterceptors({
  getToken:  () => _accessToken,
  setToken:  (t) => { _accessToken = t; },
  clearAuth: () => {
    _accessToken = null;
    useAuthStore.setState({ user: null });
  },
});

export default useAuthStore;
