import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
export default function Login({ onLogin }:{ onLogin:()=>void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('mian.salik@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e:FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); onLogin(); }
    catch { setError('Invalid email or password'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="card" style={{ width:340, padding:28 }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:700 }}>NuxFashion ERP</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:3 }}>Fashion Retail · Saudi Arabia</div>
        </div>
        {error && <div style={{ background:'var(--bg-danger)', color:'var(--text-danger)', border:'0.5px solid var(--border-danger)', borderRadius:'var(--radius)', padding:'7px 10px', marginBottom:10, fontSize:12 }}>{error}</div>}
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', marginBottom:4 }}>Email</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', marginBottom:4 }}>Password</div>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="bt bt-p" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'9px', fontSize:13, marginTop:4 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop:14, padding:9, background:'var(--surface-1)', borderRadius:'var(--radius)', fontSize:10, color:'var(--text-muted)' }}>
          ZATCA Phase 2 · Multi-branch · KSA Fashion Retail
        </div>
      </div>
    </div>
  );
}
