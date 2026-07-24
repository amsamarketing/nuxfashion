import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onLogin }:{ onLogin:()=>void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const bannerUrl=import.meta.env.VITE_LOGIN_BANNER_URL||'/login-banner.jpg';
  const bannerStyle={'--login-banner':`url("${bannerUrl}")`} as CSSProperties;

  const submit = async (e:FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); onLogin(); }
    catch { setError('The email or password you entered is incorrect.'); }
    finally { setLoading(false); }
  };

  return (
    <main className="login-shell">
      <section className="login-banner" style={bannerStyle} aria-label="NuxFashion promotional banner">
        <div className="login-banner-top">
          <div className="login-mark"><i className="ti ti-hanger-2"/></div>
          <div><strong>NuxFashion</strong><span>Retail Management</span></div>
        </div>
        <div className="login-banner-copy">
          <div className="login-eyebrow">Fashion retail, simplified</div>
          <h1>Manage every sale.<br/>Grow every branch.</h1>
          <p>A complete ERP and POS workspace designed for modern Saudi fashion retailers.</p>
          <div className="login-features">
            <span><i className="ti ti-circle-check-filled"/> ZATCA Ready</span>
            <span><i className="ti ti-circle-check-filled"/> Multi-branch</span>
            <span><i className="ti ti-circle-check-filled"/> Live Inventory</span>
          </div>
        </div>
        <div className="login-banner-foot">NuxFashion ERP & POS <span>•</span> Saudi Arabia</div>
      </section>

      <section className="login-side">
        <div className="login-mobile-brand">
          <div className="login-mark"><i className="ti ti-hanger-2"/></div>
          <div><strong>NuxFashion</strong><span>ERP & POS</span></div>
        </div>
        <div className="login-card">
          <div className="login-heading">
            <div className="login-secure"><i className="ti ti-shield-check"/> Secure access</div>
            <h2>Welcome back</h2>
            <p>Sign in to continue to your retail workspace.</p>
          </div>

          {error && <div className="login-error"><i className="ti ti-alert-circle"/><span>{error}</span></div>}

          <form onSubmit={submit} className="login-form">
            <label>
              <span>Email address</span>
              <div className="login-input">
                <i className="ti ti-mail"/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com" autoComplete="email" required autoFocus/>
              </div>
            </label>
            <label>
              <span>Password</span>
              <div className="login-input">
                <i className="ti ti-lock"/>
                <input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/>
                <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>
                  <i className={`ti ${showPassword?'ti-eye-off':'ti-eye'}`}/>
                </button>
              </div>
            </label>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading?<><i className="ti ti-loader-2 login-spin"/> Signing in…</>:<>Sign in to workspace <i className="ti ti-arrow-right"/></>}
            </button>
          </form>

          <div className="login-help"><i className="ti ti-headset"/> Need help? Contact your system administrator.</div>
          <a className="login-store-link" href="/#store"><i className="ti ti-shopping-bag"/> Visit NuxFashion Online Store</a>
        </div>
        <div className="login-side-foot">© {new Date().getFullYear()} NuxFashion <span>Privacy</span><span>Support</span></div>
      </section>
    </main>
  );
}
