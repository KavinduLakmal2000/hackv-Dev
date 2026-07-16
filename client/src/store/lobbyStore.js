import { create } from 'zustand';
import { lobbyApi } from '../api/lobby.js';
import { getSocket, emitAsync } from '../socket/socketClient.js';

// ─────────────────────────────────────────────────────────────────────────────
// Lobby Store
// REST calls mutate the lobby; the server's socket broadcasts keep this
// store's `currentLobby` in sync for every player in the room in real time.
// ─────────────────────────────────────────────────────────────────────────────

const useLobbyStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  publicLobbies:     [],
  publicMeta:        { total: 0, page: 1, limit: 20, totalPages: 1 },
  currentLobby:      null,
  isLoading:         false,
  error:             null,
  socketJoined:      false,

  // ── Public browser ─────────────────────────────────────────────────────────

  fetchPublicLobbies: async ({ mode, page = 1 } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await lobbyApi.listPublic({ mode, page });
      set({ publicLobbies: res.data.lobbies, publicMeta: res.data.meta, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to load lobbies' });
    }
  },

  fetchMyCurrent: async () => {
    try {
      const res = await lobbyApi.getMyCurrent();
      if (res.data.lobby) set({ currentLobby: res.data.lobby });
      return res.data.lobby;
    } catch {
      return null;
    }
  },

  // ── Create / Join / Leave ─────────────────────────────────────────────────

  createLobby: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await lobbyApi.create(params);
      set({ currentLobby: res.data.lobby, isLoading: false });
      await get().joinSocketRoom(res.data.lobby.code);
      return { ok: true, lobby: res.data.lobby };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create lobby';
      set({ isLoading: false, error: message });
      return { ok: false, message };
    }
  },

  joinLobby: async (code, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await lobbyApi.join(code, password);
      set({ currentLobby: res.data.lobby, isLoading: false });
      await get().joinSocketRoom(res.data.lobby.code);
      return { ok: true, lobby: res.data.lobby };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to join lobby';
      set({ isLoading: false, error: message });
      return { ok: false, message };
    }
  },

  leaveLobby: async () => {
    const code = get().currentLobby?.code;
    if (!code) {
      set({ currentLobby: null, error: null });
      return { ok: true };
    }

    try {
      await lobbyApi.leave(code);
    } catch (err) {
      console.warn('[lobbyStore] leaveLobby API failed, clearing local state anyway:', err?.response?.data?.message || err?.message);
    }

    get().leaveSocketRoom(code);
    set({ currentLobby: null, error: null, socketJoined: false });
    return { ok: true };
  },

  // ── In-lobby actions ───────────────────────────────────────────────────────

  chooseTeam: async (team) => {
    const code = get().currentLobby?.code;
    if (!code) return;
    try {
      const res = await lobbyApi.chooseTeam(code, team);
      set({ currentLobby: res.data.lobby });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to switch team' });
    }
  },

  setReady: async (ready) => {
    const code = get().currentLobby?.code;
    if (!code) return;
    try {
      const res = await lobbyApi.setReady(code, ready);
      set({ currentLobby: res.data.lobby });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to update ready state' });
    }
  },

  updateSettings: async (updates) => {
    const code = get().currentLobby?.code;
    if (!code) return { ok: false };
    try {
      const res = await lobbyApi.updateSettings(code, updates);
      set({ currentLobby: res.data.lobby });
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update settings';
      set({ error: message });
      return { ok: false, message };
    }
  },

  kickPlayer: async (targetId) => {
    const code = get().currentLobby?.code;
    if (!code) return;
    try {
      const res = await lobbyApi.kickPlayer(code, targetId);
      set({ currentLobby: res.data.lobby });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to kick player' });
    }
  },

  startGame: async () => {
    const code = get().currentLobby?.code;
    if (!code) return { ok: false };
    try {
      const res = await lobbyApi.startGame(code);
      return { ok: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to start game';
      set({ error: message });
      return { ok: false, message };
    }
  },

  // ── Socket room management ────────────────────────────────────────────────

  joinSocketRoom: async (code) => {
    try {
      await emitAsync('lobby:join', { code });
      set({ socketJoined: true });
    } catch (err) {
      console.warn('[lobbyStore] socket join failed:', err.message);
    }
  },

  leaveSocketRoom: (code) => {
    const socket = getSocket();
    if (socket.connected) socket.emit('lobby:leave', { code });
    set({ socketJoined: false });
  },

  // Called once from a top-level effect to wire socket event → store sync
  attachSocketListeners: () => {
    const socket = getSocket();

    const syncLobby = (payload) => {
      if (payload?.lobby) set({ currentLobby: payload.lobby });
    };

    socket.on('lobby:player_joined',    syncLobby);
    socket.on('lobby:player_left',      syncLobby);
    socket.on('lobby:player_kicked',    syncLobby);
    socket.on('lobby:team_changed',     syncLobby);
    socket.on('lobby:ready_changed',    syncLobby);
    socket.on('lobby:settings_updated', syncLobby);

    // Returns a cleanup function
    return () => {
      socket.off('lobby:player_joined',    syncLobby);
      socket.off('lobby:player_left',      syncLobby);
      socket.off('lobby:player_kicked',    syncLobby);
      socket.off('lobby:team_changed',     syncLobby);
      socket.off('lobby:ready_changed',    syncLobby);
      socket.off('lobby:settings_updated', syncLobby);
    };
  },

  clearError: () => set({ error: null }),
  clearCurrentLobby: () => set({ currentLobby: null }),
}));

export default useLobbyStore;
