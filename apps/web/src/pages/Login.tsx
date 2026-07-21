
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('mian.salik@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); onLogin(); }
    catch { setError('Invalid email or password'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="card" style={{ width:360, padding:32 }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)' }}>NuxFashion ERP</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4 }}>Fashion Retail · Saudi Arabia · Sign in to continue</div>
        </div>
        {error && <div style={{ background:'var(--bg-danger)', color:'var(--text-danger)', border:'0.5px solid var(--border-danger)', borderRadius:'var(--radius)', padding:'8px 12px', marginBottom:12, fontSize:12 }}>{error}</div>}
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', marginBottom:4 }}>Email address</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', marginBottom:4 }}>Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="bt bt-p" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'9px', fontSize:13, marginTop:4 }}>
            {loading ? 'Signing in…' : <><i className="ti ti-login" /> Sign in</>}
          </button>
        </form>
        <div style={{ marginTop:16, padding:10, background:'var(--surface-1)', borderRadius:'var(--radius)', fontSize:11, color:'var(--text-muted)' }}>
          <i className="ti ti-shield-check" style={{ marginRight:4 }} />ZATCA Phase 2 · Multi-branch · KSA Fashion Retail
        </div>
      </div>
    </div>
  );
}
