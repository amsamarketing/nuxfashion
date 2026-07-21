
import { useState, createContext, useContext, useCallback } from 'react';
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
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const bg: Record<string,string> = { success:'#f0fdf4', error:'#fef2f2', info:'#eff6ff' };
  const cl: Record<string,string> = { success:'#15803d', error:'#b91c1c', info:'#1d4ed8' };
  const ic: Record<string,string> = { success:'ti-circle-check', error:'ti-circle-x', info:'ti-info-circle' };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:340 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:'10px 16px', background:bg[t.type], color:cl[t.type], border:`1.5px solid ${cl[t.type]}40`, borderRadius:9, fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.14)', display:'flex', alignItems:'flex-start', gap:9 }}>
            <i className={`ti ${ic[t.type]}`} style={{ fontSize:16, flexShrink:0, marginTop:1 }} />
            <span style={{ flex:1 }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
