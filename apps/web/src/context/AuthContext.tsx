import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';
interface User { id:string; name:string; email:string; role:string; companyId:string; }
interface AuthCtx { user:User|null; login:(e:string,p:string)=>Promise<void>; logout:()=>void; }
const Ctx = createContext<AuthCtx>({} as AuthCtx);
export function AuthProvider({ children }:{ children:ReactNode }) {
  const [user, setUser] = useState<User|null>(() => {
    try { const s=localStorage.getItem('user'); return s?JSON.parse(s):null; } catch { return null; }
  });
  const login = async (email:string, password:string) => {
    const r = await api.post('/auth/login', { email, password });
    const { accessToken, user:u } = r.data;
    localStorage.setItem('accessToken', accessToken);
    const obj = { id:u.id, email:u.email, role:u.role, companyId:u.companyId, name:u.email.split('@')[0] };
    localStorage.setItem('user', JSON.stringify(obj));
    setUser(obj);
  };
  const logout = () => { localStorage.clear(); setUser(null); };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
