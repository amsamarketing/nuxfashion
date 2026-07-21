import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import POSSale from './pages/pos/Sale';
import POSReturn from './pages/pos/Return';
import POSHeld from './pages/pos/Held';
import ZReport from './pages/pos/ZReport';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Inventory from './pages/admin/Inventory';
import Products from './pages/admin/Products';
import Purchasing from './pages/admin/Purchasing';
import Accounting from './pages/admin/Accounting';
import ZATCA from './pages/admin/ZATCA';
import Customers from './pages/admin/Customers';
import Loyalty from './pages/admin/Loyalty';
import HR from './pages/admin/HR';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

const qc = new QueryClient({ defaultOptions:{ queries:{ retry:1, staleTime:30000 } } });

const POS_NAV=[{id:'pos-sale',l:'New sale',i:'ti-shopping-cart'},{id:'pos-return',l:'Returns',i:'ti-arrow-back'},{id:'pos-held',l:'Held orders',i:'ti-player-pause'},{id:'pos-zreport',l:'Z-report',i:'ti-report'}];
const ADMIN_NAV=[{id:'ad-dash',l:'Dashboard',i:'ti-layout-dashboard'},{id:'ad-orders',l:'Orders',i:'ti-shopping-cart'},{id:'ad-inv',l:'Inventory',i:'ti-package'},{id:'ad-prod',l:'Products',i:'ti-tag'},{id:'ad-purch',l:'Purchasing',i:'ti-truck'},{id:'ad-acct',l:'Accounting',i:'ti-report-money'},{id:'ad-zatca',l:'ZATCA invoices',i:'ti-file-check'},{id:'ad-crm',l:'Customers',i:'ti-users'},{id:'ad-loyal',l:'Loyalty & promos',i:'ti-star'},{id:'ad-hr',l:'HR & payroll',i:'ti-id'},{id:'ad-rep',l:'Reports',i:'ti-chart-bar'},{id:'ad-set',l:'Settings',i:'ti-settings'}];
const SCREENS: Record<string, React.ComponentType> = {'pos-sale':POSSale,'pos-return':POSReturn,'pos-held':POSHeld,'pos-zreport':ZReport,'ad-dash':Dashboard,'ad-orders':Orders,'ad-inv':Inventory,'ad-prod':Products,'ad-purch':Purchasing,'ad-acct':Accounting,'ad-zatca':ZATCA,'ad-crm':Customers,'ad-loyal':Loyalty,'ad-hr':HR,'ad-rep':Reports,'ad-set':Settings};

function App() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'pos'|'admin'>('pos');
  const [screen, setScreen] = useState('pos-sale');
  const switchMode = (m:'pos'|'admin') => { setMode(m); setScreen(m==='pos'?'pos-sale':'ad-dash'); };
  if (!user) return <Login onLogin={()=>setScreen('pos-sale')} />;
  const nav = mode==='pos'?POS_NAV:ADMIN_NAV;
  const Screen = SCREENS[screen]||Dashboard;
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', padding:16 }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 16px',background:'var(--surface-2)',borderBottom:'0.5px solid var(--border)',borderRadius:'14px 14px 0 0' }}>
          {mode==='pos'
            ? <div style={{ display:'flex',alignItems:'center',gap:10 }}><span style={{ fontSize:14,fontWeight:600 }}>NuxFashion</span><span style={{ color:'var(--text-secondary)' }}>Riyadh Mall · Terminal 1</span><span className="bx n"><i className="ti ti-clock" style={{ fontSize:11 }} /> Morning shift</span></div>
            : <div style={{ display:'flex',alignItems:'center',gap:10 }}><span style={{ fontSize:14,fontWeight:600 }}>NuxFashion ERP</span><span className="bx n">Multi-branch · KSA</span></div>
          }
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ fontSize:11,color:'var(--text-secondary)' }}>{user.email}</span>
            <span className="bx g"><i className="ti ti-wifi" style={{ fontSize:11 }} /> Online</span>
            <span className="bx g">ZATCA Active</span>
            <button className="bt" onClick={logout} style={{ fontSize:11 }}><i className="ti ti-logout" /> Logout</button>
          </div>
        </div>
        <div style={{ display:'flex',background:'var(--surface-1)',borderBottom:'0.5px solid var(--border)' }}>
          {([['pos','ti-device-desktop','POS terminal'],['admin','ti-layout-dashboard','Admin portal']] as [string,string,string][]).map(([m,ic,label])=>(
            <button key={m} onClick={()=>switchMode(m as 'pos'|'admin')}
              style={{ flex:1,padding:'9px',fontSize:13,fontWeight:500,cursor:'pointer',border:'none',background:'transparent',color:mode===m?'var(--text-accent)':'var(--text-secondary)',borderBottom:mode===m?'2px solid var(--fill-accent)':'2px solid transparent',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
              <i className={'ti '+ic} style={{ fontSize:14 }} />{label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex',gap:5,padding:'8px 12px',background:'var(--surface-2)',borderBottom:'0.5px solid var(--border)',overflowX:'auto',flexWrap:'nowrap' }}>
          {nav.map(n=>(
            <button key={n.id} className={'snb'+(screen===n.id?' on':'')} onClick={()=>setScreen(n.id)}>
              <i className={'ti '+n.i} style={{ fontSize:11,marginRight:3 }} />{n.l}
            </button>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:mode==='admin'?'150px 1fr':'1fr' }}>
          {mode==='admin' && (
            <div style={{ padding:'8px 6px',borderRight:'0.5px solid var(--border)',background:'var(--surface-2)',minHeight:520 }}>
              <div className="sep">MAIN</div>
              {ADMIN_NAV.slice(0,5).map(n=><div key={n.id} className={'ni'+(screen===n.id?' on':'')} onClick={()=>setScreen(n.id)}><i className={'ti '+n.i} style={{ fontSize:14 }} />{n.l}</div>)}
              <div className="sep">FINANCE</div>
              {ADMIN_NAV.slice(5,8).map(n=><div key={n.id} className={'ni'+(screen===n.id?' on':'')} onClick={()=>setScreen(n.id)}><i className={'ti '+n.i} style={{ fontSize:14 }} />{n.l}</div>)}
              <div className="sep">PEOPLE</div>
              {ADMIN_NAV.slice(8,10).map(n=><div key={n.id} className={'ni'+(screen===n.id?' on':'')} onClick={()=>setScreen(n.id)}><i className={'ti '+n.i} style={{ fontSize:14 }} />{n.l}</div>)}
              <div className="sep">SYSTEM</div>
              {ADMIN_NAV.slice(10).map(n=><div key={n.id} className={'ni'+(screen===n.id?' on':'')} onClick={()=>setScreen(n.id)}><i className={'ti '+n.i} style={{ fontSize:14 }} />{n.l}</div>)}
            </div>
          )}
          <div style={{ padding:'12px 14px',background:'var(--surface-0)',minHeight:520,overflow:'auto' }}>
            <Screen />
          </div>
        </div>
        <div style={{ borderTop:'0.5px solid var(--border)',background:'var(--surface-2)',borderRadius:'0 0 14px 14px',padding:'6px 16px',fontSize:10,color:'var(--text-muted)',textAlign:'center' }}>
          NuxFashion ERP + POS · Saudi Fashion Retail · ZATCA Phase 2 · Tabby & Tamara · Multi-branch
        </div>
      </div>
    </div>
  );
}
export default function Root() {
  return <QueryClientProvider client={qc}><AuthProvider><App /></AuthProvider></QueryClientProvider>;
}
