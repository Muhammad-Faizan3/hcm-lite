import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch((error) => {
        if (error.response?.status === 401) localStorage.removeItem('token');
        else console.error('Failed to restore session:', error.response?.data || error);
      })
      .finally(() => setLoading(false));
  }, []);
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token); setUser(data.user);
  };
  const register = async (details) => {
    const { data } = await api.post('/auth/register', details);
    localStorage.setItem('token', data.token); setUser(data.user);
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  const refresh = () => api.get('/auth/me').then((r) => setUser(r.data));
  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}
