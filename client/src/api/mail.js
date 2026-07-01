import api from './axiosInstance.js';

export const mailApi = {
  getInbox: ({ page = 1, limit = 20, unread, type } = {}) =>
    api.get('/mail', { params: { page, limit, unread, type } }).then((r) => r.data),

  readMail: (mailId) =>
    api.get(`/mail/${mailId}`).then((r) => r.data),

  claimReward: (mailId) =>
    api.post(`/mail/${mailId}/claim`).then((r) => r.data),

  deleteMail: (mailId) =>
    api.delete(`/mail/${mailId}`).then((r) => r.data),

  getPublicConfig: () =>
    api.get('/config').then((r) => r.data),
};
