import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';
export interface AuthUser { id:string;name:string;email:string;role:string;roles?:string[];permissions?:string[];companyId:string;portal:'admin'|'pos';branchId?:string;warehouseId?:string;branchName?:string;branchCode?:string; }
interface AuthCtx { user:AuthUser|null;login:(e:string,p:string,portal:'admin'|'pos')=>Promise<AuthUser>;logout:()=>void; }
const Ctx=createContext<AuthCtx>({} as AuthCtx);
export function AuthProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<AuthUser|null>(()=>{try{const s=localStorage.getItem('user');return s?JSON.parse(s):null}catch{return null}});
  const login=async(email:string,password:string,portal:'admin'|'pos')=>{
    const r=await api.post(portal==='pos'?'/auth/pos-login':'/auth/login',{email,password});
    const {accessToken,user:u}=r.data;
    const obj:AuthUser={id:u.id,email:u.email,role:u.role,roles:u.roles||[],permissions:u.permissions||[],companyId:u.companyId,name:u.name||u.email.split('@')[0],portal:u.portal||portal,branchId:u.branchId,warehouseId:u.warehouseId,branchName:u.branchName,branchCode:u.branchCode};
    localStorage.setItem('accessToken',accessToken);localStorage.setItem('user',JSON.stringify(obj));
    if(obj.branchId)localStorage.setItem('activeBranchId',obj.branchId);if(obj.warehouseId)localStorage.setItem('activeWarehouseId',obj.warehouseId);
    setUser(obj);return obj;
  };
  const logout=()=>{localStorage.removeItem('accessToken');localStorage.removeItem('user');localStorage.removeItem('activeBranchId');localStorage.removeItem('activeWarehouseId');setUser(null)};
  return <Ctx.Provider value={{user,login,logout}}>{children}</Ctx.Provider>;
}
export const useAuth=()=>useContext(Ctx);
