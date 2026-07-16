import api from './axiosInstance.js';

export const lobbyApi = {
  listPublic: ({ mode, page = 1, limit = 20 } = {}) =>
    api.get('/lobbies', { params: { mode, page, limit } }).then((r) => r.data),

  getByCode: (code) =>
    api.get(`/lobbies/${code}`).then((r) => r.data),

  getMyCurrent: () =>
    api.get('/lobbies/me/current').then((r) => r.data),

  create: ({ mode, isPrivate, password, settings }) => {
    const payload = { mode, isPrivate, settings };
    if (isPrivate && password?.trim()) payload.password = password.trim();
    return api.post('/lobbies', payload).then((r) => r.data);
  },

  join: (code, password) => {
    const payload = password?.trim() ? { password: password.trim() } : {};
    return api.post(`/lobbies/${code}/join`, payload).then((r) => r.data);
  },

  leave: (code) =>
    api.post(`/lobbies/${code}/leave`).then((r) => r.data),

  chooseTeam: (code, team) =>
    api.patch(`/lobbies/${code}/team`, { team }).then((r) => r.data),

  setReady: (code, ready) =>
    api.patch(`/lobbies/${code}/ready`, { ready }).then((r) => r.data),

  updateSettings: (code, updates) =>
    api.patch(`/lobbies/${code}/settings`, updates).then((r) => r.data),

  kickPlayer: (code, targetId) =>
    api.post(`/lobbies/${code}/kick/${targetId}`).then((r) => r.data),

  startGame: (code) =>
    api.post(`/lobbies/${code}/start`).then((r) => r.data),
};
