
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';

interface Toast { id: number; msg: string; type: 'success'|'error'|'info'; }
interface ToastCtx { toast: (msg: string, type?: 'success'|'error'|'info') => void; }
const Ctx = createContext<ToastCtx>({ toast: () => {} });

let _id = 0;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((msg: string, type: 'success'|'error'|'info' = 'success') => {
    const id = ++_id;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const colors: Record<string,string> = {
    success: '#15803d', error: '#b91c1c', info: '#1d4ed8'
  };
  const bg: Record<string,string> = {
    success: '#f0fdf4', error: '#fef2f2', info: '#eff6ff'
  };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:'10px 16px', background:bg[t.type], color:colors[t.type], border:`1px solid ${colors[t.type]}30`, borderRadius:8, fontSize:13, fontWeight:500, boxShadow:'0 4px 12px rgba(0,0,0,0.12)', minWidth:240, display:'flex', alignItems:'center', gap:8, animation:'slideIn .2s ease' }}>
            <i className={`ti ${t.type==='success'?'ti-circle-check':t.type==='error'?'ti-circle-x':'ti-info-circle'}`} style={{ fontSize:16 }} />
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
