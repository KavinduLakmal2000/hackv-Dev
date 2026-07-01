import { create } from 'zustand';
import { adminApi } from '../api/admin.js';

// ─────────────────────────────────────────────────────────────────────────────
// Admin Store
// Every action here hits an admin-only, role-gated endpoint. The UI also
// hides these routes from non-admins (Navbar + RouteGuard), but the real
// enforcement is server-side — requireAdmin / requireModerator middleware
// rejects anything this store sends if the JWT role doesn't qualify,
// regardless of what the client believes about itself.
// ─────────────────────────────────────────────────────────────────────────────

const useAdminStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  dashboard:      null,
  users:          [],
  usersMeta:      { total: 0, page: 1, limit: 20, totalPages: 1 },
  selectedUser:   null,
  sentMail:       [],
  sentMailMeta:   { total: 0, page: 1, limit: 20, totalPages: 1 },
  config:         null,
  isLoading:      false,
  error:          null,
  actionMessage:  null,

  // ── Dashboard ──────────────────────────────────────────────────────────────

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await adminApi.getDashboard();
      set({ dashboard: res.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message || 'Failed to load dashboard' });
    }
  },

  // ── User management ────────────────────────────────────────────────────────

  fetchUsers: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await adminApi.listUsers(params);
      set({ users: res.data.users, usersMeta: res.data.meta, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: 'Failed to load users' });
    }
  },

  fetchUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await adminApi.getUser(id);
      set({ selectedUser: res.data.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: 'Failed to load user' });
    }
  },

  updateUser: async (id, updates) => {
    try {
      const res = await adminApi.updateUser(id, updates);
      set((s) => ({
        users: s.users.map((u) => (u._id === id ? { ...u, ...res.data.user } : u)),
        selectedUser: s.selectedUser?._id === id ? res.data.user : s.selectedUser,
        actionMessage: 'User updated',
      }));
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed';
      set({ error: message });
      return { ok: false, message };
    }
  },

  banUser: async (id, reason) => {
    try {
      await adminApi.banUser(id, reason);
      set((s) => ({
        users: s.users.map((u) => (u._id === id ? { ...u, isBanned: true, banReason: reason } : u)),
        actionMessage: 'User banned',
      }));
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Ban failed';
      set({ error: message });
      return { ok: false, message };
    }
  },

  unbanUser: async (id) => {
    try {
      await adminApi.unbanUser(id);
      set((s) => ({
        users: s.users.map((u) => (u._id === id ? { ...u, isBanned: false, banReason: null } : u)),
        actionMessage: 'User unbanned',
      }));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Unban failed' };
    }
  },

  adjustRank: async (id, points, reason) => {
    try {
      const res = await adminApi.adjustRank(id, points, reason);
      set({ actionMessage: `Rank adjusted: ${res.data.before.points} → ${res.data.after.points}` });
      return { ok: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Rank adjustment failed';
      set({ error: message });
      return { ok: false, message };
    }
  },

  deleteUser: async (id) => {
    try {
      await adminApi.deleteUser(id);
      set((s) => ({ users: s.users.filter((u) => u._id !== id), actionMessage: 'User deleted' }));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Delete failed' };
    }
  },

  // ── Mail ───────────────────────────────────────────────────────────────────

  sendBroadcast: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await adminApi.sendBroadcast(data);
      set({ isLoading: false, actionMessage: 'Broadcast sent' });
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send broadcast';
      const errors  = err.response?.data?.errors  || null;
      set({ isLoading: false, error: message });
      return { ok: false, message, errors };
    }
  },

  sendPersonalMail: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await adminApi.sendPersonalMail(data);
      set({ isLoading: false, actionMessage: 'Mail sent' });
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send mail';
      const errors  = err.response?.data?.errors  || null;
      set({ isLoading: false, error: message });
      return { ok: false, message, errors };
    }
  },

  fetchSentMail: async (params = {}) => {
    set({ isLoading: true });
    try {
      const res = await adminApi.listSentMail(params);
      set({ sentMail: res.data.mails, sentMailMeta: res.data.meta, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to load sent mail' });
    }
  },

  deleteSentMail: async (mailId) => {
    try {
      await adminApi.deleteMail(mailId);
      set((s) => ({ sentMail: s.sentMail.filter((m) => m._id !== mailId) }));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message };
    }
  },

  // ── Server config ──────────────────────────────────────────────────────────

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await adminApi.getConfig();
      set({ config: res.data.config, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: 'Failed to load config' });
    }
  },

  updateConfig: async (updates) => {
    set({ error: null });
    try {
      const res = await adminApi.updateConfig(updates);
      set({ config: res.data.config, actionMessage: 'Config updated' });
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Config update failed';
      set({ error: message });
      return { ok: false, message };
    }
  },

  clearError: () => set({ error: null }),
  clearActionMessage: () => set({ actionMessage: null }),
}));

export default useAdminStore;
