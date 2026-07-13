import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1/admin' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url || '';
    const isLoginRequest = url.includes('/login');

    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
