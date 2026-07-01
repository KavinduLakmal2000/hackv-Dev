import { create } from 'zustand';
import { mailApi } from '../api/mail.js';

// ─────────────────────────────────────────────────────────────────────────────
// Mail Store — player-facing inbox. Separate from adminStore, which handles
// composing/sending. Claiming a reward always re-syncs from the server's
// response; this store never assumes a claimed reward amount itself.
// ─────────────────────────────────────────────────────────────────────────────

const useMailStore = create((set, get) => ({
  inbox:        [],
  inboxMeta:    { total: 0, page: 1, limit: 20, totalPages: 1 },
  unreadCount:  0,
  selectedMail: null,
  isLoading:    false,
  error:        null,
  publicConfig: null, // maintenance/announcement banner data

  fetchInbox: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mailApi.getInbox(params);
      set({ inbox: res.data.mails, inboxMeta: res.data.meta, unreadCount: res.data.unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to load inbox' });
    }
  },

  readMail: async (mailId) => {
    try {
      const res = await mailApi.readMail(mailId);
      set((s) => ({
        selectedMail: res.data.mail,
        inbox: s.inbox.map((m) => (m._id === mailId ? { ...m, isRead: true } : m)),
        unreadCount: Math.max(0, s.unreadCount - (s.inbox.find((m) => m._id === mailId)?.isRead ? 0 : 1)),
      }));
      return { ok: true, mail: res.data.mail };
    } catch {
      return { ok: false };
    }
  },

  claimReward: async (mailId) => {
    try {
      const res = await mailApi.claimReward(mailId);
      set((s) => ({
        inbox: s.inbox.map((m) => (m._id === mailId ? { ...m, rewardClaimed: true } : m)),
      }));
      return { ok: true, claimed: res.data.claimed, wallet: res.data.wallet };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Failed to claim reward' };
    }
  },

  deleteMail: async (mailId) => {
    try {
      await mailApi.deleteMail(mailId);
      set((s) => ({ inbox: s.inbox.filter((m) => m._id !== mailId) }));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message };
    }
  },

  fetchPublicConfig: async () => {
    try {
      const res = await mailApi.getPublicConfig();
      set({ publicConfig: res.data });
    } catch {
      // fail silently — non-critical UI banner data
    }
  },

  clearError: () => set({ error: null }),
}));

export default useMailStore;
