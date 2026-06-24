import api from './axiosInstance.js';

export const userApi = {
  getMyProfile: () =>
    api.get('/users/me').then((r) => r.data),

  updateMyProfile: (updates) =>
    api.patch('/users/me', updates).then((r) => r.data),

  updateAvatar: (avatarUrl) =>
    api.patch('/users/me/avatar', { avatarUrl }).then((r) => r.data),

  getMyStats: () =>
    api.get('/users/me/stats').then((r) => r.data),

  getLeaderboard: ({ page = 1, limit = 20, tier } = {}) =>
    api.get('/users/leaderboard', { params: { page, limit, tier } }).then((r) => r.data),

  getPublicProfile: (username) =>
    api.get(`/users/${username}`).then((r) => r.data),
};
