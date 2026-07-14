import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1/admin' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const url = err?.config?.url || '';
    const isLoginRequest = url.includes('/login');
    const isRefreshRequest = url.includes('/refresh');
    const isResetRequest = url.includes('/reset-password') || url.includes('/forgot-password');

    if (err.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !isResetRequest) {
      const refreshToken = localStorage.getItem('admin_refresh_token');
      if (refreshToken && !err.config._retry) {
        err.config._retry = true;
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
          const newToken = res.data?.accessToken;
          if (newToken) {
            localStorage.setItem('admin_token', newToken);
            err.config.headers.Authorization = `Bearer ${newToken}`;
            return api(err.config);
          }
        } catch {
          // Refresh failed - fall through to logout
        }
      }
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_name');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
