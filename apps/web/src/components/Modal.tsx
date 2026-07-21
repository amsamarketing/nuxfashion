
import type { ReactNode } from 'react';
export default function Modal({ title, onClose, children, width=520 }:
  { title:string; onClose:()=>void; children:ReactNode; width?:number }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface-2)', borderRadius:10, width:'100%', maxWidth:width, maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--border-color)', position:'sticky', top:0, background:'var(--surface-2)', zIndex:1 }}>
          <span style={{ fontSize:14, fontWeight:700 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'var(--text-secondary)', lineHeight:1, padding:'0 4px' }}>×</button>
        </div>
        <div style={{ padding:'20px' }}>{children}</div>
      </div>
    </div>
  );
}
export function Field({ label, required, children }: { label:string; required?:boolean; children:ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:5 }}>
        {label}{required && <span style={{ color:'var(--text-danger-custom)', marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
export function Row2({ children }: { children:ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>{children}</div>;
}
export function Sel({ value, onChange, children }: { value:string; onChange:(v:string)=>void; children:ReactNode }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:'var(--surface-2)', color:'var(--text-primary)', fontSize:12 }}>
      {children}
    </select>
  );
}
export function Inp({ value, onChange, placeholder, type='text', disabled, dir }:
  { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string; disabled?:boolean; dir?:string }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:disabled?'var(--surface-1)':'var(--surface-2)', color:'var(--text-primary)', fontSize:12, direction:dir as any }} />
  );
}
export function SaveBtn({ loading, disabled, label='Save', onClick }: { loading?:boolean; disabled?:boolean; label?:string; onClick?:()=>void }) {
  return (
    <button className="bt bt-p" disabled={disabled||loading} onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:6 }}>
      {loading ? <><div className="spinner-border spinner-border-sm" style={{ width:14, height:14 }} /> Saving…</> : <><i className="ti ti-check" /> {label}</>}
    </button>
  );
}
