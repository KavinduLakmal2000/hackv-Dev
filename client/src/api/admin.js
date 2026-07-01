import api from './axiosInstance.js';

export const adminApi = {
  // ── Dashboard ────────────────────────────────────────────────────────────────
  getDashboard: () =>
    api.get('/admin/dashboard').then((r) => r.data),

  getStats: () =>
    api.get('/admin/stats').then((r) => r.data),

  // ── User management ───────────────────────────────────────────────────────────
  listUsers: ({ page = 1, limit = 20, search, role, banned, sortBy, order } = {}) =>
    api.get('/admin/users', { params: { page, limit, search, role, banned, sortBy, order } }).then((r) => r.data),

  getUser: (id) =>
    api.get(`/admin/users/${id}`).then((r) => r.data),

  updateUser: (id, updates) =>
    api.patch(`/admin/users/${id}`, updates).then((r) => r.data),

  deleteUser: (id) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data),

  banUser: (id, reason) =>
    api.post(`/admin/users/${id}/ban`, { reason }).then((r) => r.data),

  unbanUser: (id) =>
    api.post(`/admin/users/${id}/unban`).then((r) => r.data),

  adjustRank: (id, points, reason) =>
    api.post(`/admin/users/${id}/rank`, { points, reason }).then((r) => r.data),

  // ── Mail (admin send) ─────────────────────────────────────────────────────────
  sendBroadcast: (data) =>
    api.post('/admin/mail/broadcast', data).then((r) => r.data),

  sendPersonalMail: (data) =>
    api.post('/admin/mail/personal', data).then((r) => r.data),

  listSentMail: ({ page = 1, limit = 20, type } = {}) =>
    api.get('/admin/mail', { params: { page, limit, type } }).then((r) => r.data),

  deleteMail: (mailId) =>
    api.delete(`/admin/mail/${mailId}`).then((r) => r.data),

  // ── Server config ─────────────────────────────────────────────────────────────
  getConfig: () =>
    api.get('/admin/config').then((r) => r.data),

  updateConfig: (updates) =>
    api.patch('/admin/config', updates).then((r) => r.data),
};
