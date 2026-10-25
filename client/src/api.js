import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !e.config.url.includes('/auth/login')) { localStorage.removeItem('token'); if (location.pathname !== '/login') location.href = '/login'; }
  return Promise.reject(e);
});
export const errMsg = (e) => e.response?.data?.message || e.message || 'Something went wrong';
export const money = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const dt = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const tm = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export default api;
