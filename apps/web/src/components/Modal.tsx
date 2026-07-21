
import type { ReactNode } from 'react';

export default function Modal({ title, onClose, children, width=520 }:
  { title:string; onClose:()=>void; children:ReactNode; width?:number }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface-2)', borderRadius:10, width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border-color)' }}>
          <span style={{ fontSize:14, fontWeight:700 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-secondary)', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:'18px' }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label:string; children:ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

export function Row({ children }: { children:ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>{children}</div>;
}
