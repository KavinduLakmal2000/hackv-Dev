import api from './axiosInstance.js';

export const authApi = {
  register: (data) =>
    api.post('/auth/register', data).then((r) => r.data),

  login: (data) =>
    api.post('/auth/login', data).then((r) => r.data),

  logout: () =>
    api.post('/auth/logout').then((r) => r.data),

  refresh: () =>
    api.post('/auth/refresh').then((r) => r.data),

  me: () =>
    api.get('/auth/me').then((r) => r.data),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),

  // Google OAuth — redirect, not an API call
  googleLoginUrl: () => `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`,
};
