import axios from 'axios';
const API_URL = import.meta.env.PROD
  ? 'https://api-production-a2d2.up.railway.app/api/v1'
  : '';
export const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use(cfg => {
  if (!import.meta.env.PROD && cfg.url && !cfg.url.startsWith('/api/v1')) {
    cfg.url = '/api/v1' + cfg.url;
  }
  const t = localStorage.getItem('accessToken');
  if (t) cfg.headers['Authorization'] = 'Bearer ' + t;
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
  return Promise.reject(err);
});
export default api;
