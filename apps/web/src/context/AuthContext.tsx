import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';

interface User { id: string; name: string; email: string; role: string; companyId: string; }
interface AuthCtx { user: User | null; login: (email: string, password: string) => Promise<void>; logout: () => void; }

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const saved = localStorage.getItem('user');
    if (token && saved) { try { setUser(JSON.parse(saved)); } catch {} }
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    const { accessToken, user: u } = r.data;
    localStorage.setItem('accessToken', accessToken);
    const userObj = { id: u.id, email: u.email, role: u.role, companyId: u.companyId, name: u.email.split('@')[0] };
    localStorage.setItem('user', JSON.stringify(userObj));
    setUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
