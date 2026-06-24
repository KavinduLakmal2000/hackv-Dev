import { create } from 'zustand';
import { userApi } from '../api/user.js';
import useAuthStore from './authStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// User Store
// Handles profile editing, stats, and leaderboard browsing.
// The authoritative "who am I" lives in authStore — this store handles
// the richer profile data (stats, bio) that doesn't need to be in every
// auth check.
// ─────────────────────────────────────────────────────────────────────────────

const useUserStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  stats:            null,
  publicProfile:    null,
  leaderboard:       [],
  leaderboardMeta:   { total: 0, page: 1, limit: 20, totalPages: 1 },
  isLoading:         false,
  error:             null,

  // ── Actions ────────────────────────────────────────────────────────────────

  fetchMyStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.getMyStats();
      set({ stats: res.data, isLoading: false });
      return { ok: true };
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message || 'Failed to load stats' });
      return { ok: false };
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.updateMyProfile(updates);
      // Sync into authStore's user object too — single source of truth for "me"
      useAuthStore.getState().updateUser(res.data.user);
      set({ isLoading: false });
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed';
      const errors   = err.response?.data?.errors  || null;
      set({ isLoading: false, error: message });
      return { ok: false, message, errors };
    }
  },

  updateAvatar: async (avatarUrl) => {
    try {
      const res = await userApi.updateAvatar(avatarUrl);
      useAuthStore.getState().updateUser({ avatarUrl: res.data.avatarUrl });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Avatar update failed' };
    }
  },

  fetchPublicProfile: async (username) => {
    set({ isLoading: true, error: null, publicProfile: null });
    try {
      const res = await userApi.getPublicProfile(username);
      set({ publicProfile: res.data.profile, isLoading: false });
      return { ok: true };
    } catch (err) {
      const message = err.response?.status === 404
        ? 'Player not found'
        : 'Failed to load profile';
      set({ isLoading: false, error: message });
      return { ok: false, message };
    }
  },

  fetchLeaderboard: async ({ page = 1, tier } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.getLeaderboard({ page, tier });
      set({
        leaderboard:     res.data.leaderboard,
        leaderboardMeta: res.data.meta,
        isLoading:       false,
      });
      return { ok: true };
    } catch (err) {
      set({ isLoading: false, error: 'Failed to load leaderboard' });
      return { ok: false };
    }
  },

  clearError: () => set({ error: null }),
  clearPublicProfile: () => set({ publicProfile: null }),
}));

export default useUserStore;
