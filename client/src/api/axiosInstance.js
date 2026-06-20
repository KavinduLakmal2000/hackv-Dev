import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance — base config + token injection + auto-refresh
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,  // send httpOnly refresh cookie
  timeout:         10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token injector ────────────────────────────────────────────────────────────
// Gets the current access token from the auth store (memory only — no localStorage)
let _getToken  = () => null;
let _setToken  = (_t) => {};
let _clearAuth = () => {};

export const configureInterceptors = ({ getToken, setToken, clearAuth }) => {
  _getToken  = getToken;
  _setToken  = setToken;
  _clearAuth = clearAuth;
};

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = _getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let _isRefreshing   = false;
let _refreshQueue   = [];

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    // Don't try to refresh the refresh endpoint itself
    if (original.url?.includes('/auth/refresh')) {
      _clearAuth();
      return Promise.reject(err);
    }

    if (_isRefreshing) {
      // Queue this request until refresh resolves
      return new Promise((resolve, reject) => {
        _refreshQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry  = true;
    _isRefreshing    = true;

    try {
      // Use a clean axios call (not our instance) to avoid interceptor loops
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = data.data.accessToken;
      _setToken(newToken);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      _clearAuth();
      window.location.href = '/login?expired=1';
      return Promise.reject(refreshErr);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default api;
