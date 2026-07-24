import { ToastProvider } from './components/Toast';
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import POSSale from './pages/pos/Sale';
import POSReturn from './pages/pos/Return';
import POSHeld from './pages/pos/Held';
import ZReport from './pages/pos/ZReport';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Warehouses from './pages/admin/Warehouses';
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
import Ecommerce from './pages/admin/Ecommerce';
import Storefront from './pages/store/Storefront';
import Branches from './pages/admin/Branches';

const qc = new QueryClient({ defaultOptions:{ queries:{ retry:1, staleTime:30000 }}});

const NAV = [
  { id:'ad-dash',   label:'Dashboard',     icon:'ti-layout-dashboard',  sec:'Main' },
  { id:'ad-orders', label:'Orders',        icon:'ti-shopping-cart',      sec:'Main' },
  { id:'ad-prod',   label:'Products',      icon:'ti-tag',                sec:'Catalog' },
  { id:'ad-inv',    label:'Inventory',     icon:'ti-package',            sec:'Catalog' },
  { id:'ad-wh',     label:'Warehouses',    icon:'ti-building-warehouse', sec:'Catalog' },
  { id:'ad-branches',label:'Branches',      icon:'ti-building-store',     sec:'Main' },
  { id:'ad-purch',  label:'Purchasing',    icon:'ti-truck',              sec:'Catalog' },
  { id:'ad-ecom',   label:'E-commerce',    icon:'ti-world',              sec:'Channels' },
  { id:'ad-crm',    label:'Customers',     icon:'ti-users',              sec:'Channels' },
  { id:'ad-loyal',  label:'Loyalty',       icon:'ti-star',               sec:'Channels' },
  { id:'ad-hr',     label:'HR & Payroll',  icon:'ti-id',                 sec:'People' },
  { id:'ad-acct',   label:'Accounting',    icon:'ti-report-money',       sec:'Finance' },
  { id:'ad-zatca',  label:'ZATCA',         icon:'ti-file-check',         sec:'Finance' },
  { id:'ad-rep',    label:'Reports',       icon:'ti-chart-bar',          sec:'Finance' },
  { id:'ad-set',    label:'Settings',      icon:'ti-settings',           sec:'System' },
];

const POS_TABS = [
  { id:'pos-sale',    label:'New Sale',    icon:'ti-shopping-cart' },
  { id:'pos-return',  label:'Returns',     icon:'ti-arrow-back' },
  { id:'pos-held',    label:'Held Orders', icon:'ti-player-pause' },
  { id:'pos-zreport', label:'Z-Report',    icon:'ti-report' },
];

const SCREENS: Record<string,React.ComponentType> = {
  'pos-sale':POSSale,'pos-return':POSReturn,'pos-held':POSHeld,'pos-zreport':ZReport,
  'ad-dash':Dashboard,'ad-orders':Orders,'ad-wh':Warehouses,'ad-inv':Inventory,
  'ad-prod':Products,'ad-purch':Purchasing,'ad-acct':Accounting,'ad-zatca':ZATCA,
  'ad-crm':Customers,'ad-loyal':Loyalty,'ad-hr':HR,'ad-rep':Reports,'ad-set':Settings,
  'ad-ecom':Ecommerce,
  'ad-branches':Branches,
};

const SECS = ['Main','Catalog','Channels','People','Finance','System'];

function App() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'pos'|'admin'>('pos');
  const [screen, setScreen] = useState('pos-sale');
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(()=>{
    const h=(e:any)=>{ setMode('admin'); setScreen(e.detail); };
    const h2=()=>{ setMode('pos'); setScreen('pos-sale'); };
    window.addEventListener('nav',h);
    window.addEventListener('resume-held',h2);
    return ()=>{ window.removeEventListener('nav',h); window.removeEventListener('resume-held',h2); };
  },[]);

  const isStore=window.location.hash==='#store'||window.location.pathname.startsWith('/store');
  if(isStore) return <Storefront/>;
  if(!user) return <Login onLogin={()=>setScreen('pos-sale')}/>;

  const Screen = SCREENS[screen] || Dashboard;
  const initials=(user.name||user.email||'A').slice(0,2).toUpperCase();
  const firstName=user.name?.split(' ')[0]||'Admin';
  const today=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const curLabel=NAV.find(n=>n.id===screen)?.label||'Dashboard';

  if(mode==='pos') return (
    <div className="p-pos-shell">
      <div className="p-pos-bar">
        <div className="p-pos-brand">
          <div className="p-logo"><i className="ti ti-hanger"/></div>
          <span>NuxFashion <em>POS</em></span>
        </div>
        <div className="p-pos-nav">
          {POS_TABS.map(t=>(
            <button key={t.id} className={`p-pos-tab${screen===t.id?' on':''}`} onClick={()=>setScreen(t.id)}>
              <i className={`ti ${t.icon}`}/>{t.label}
            </button>
          ))}
        </div>
        <div className="p-pos-right">
          <span className="p-chip green"><i className="ti ti-wifi"/>Online</span>
          <span className="p-chip amber"><i className="ti ti-file-check"/>ZATCA</span>
          <button className="p-action-btn" onClick={()=>{ setMode('admin'); setScreen('ad-dash'); }}>
            <i className="ti ti-layout-dashboard"/> Admin
          </button>
          <button className="p-icon-btn" onClick={logout}><i className="ti ti-logout"/></button>
        </div>
      </div>
      <div style={{flex:1,overflow:'hidden'}}><Screen/></div>
    </div>
  );

  return (
    <div className="p-shell">
      {sideOpen && <div className="p-overlay" onClick={()=>setSideOpen(false)}/>}
      <aside className={`p-side${sideOpen?' open':''}`}>
        <div className="p-brand">
          <div className="p-logo"><i className="ti ti-hanger"/></div>
          <div>
            <div className="p-brand-name">NuxFashion</div>
            <div className="p-brand-sub">ERP · POS · E-commerce</div>
          </div>
        </div>
        <nav className="p-nav">
          {SECS.map(sec=>{
            const items=NAV.filter(n=>n.sec===sec);
            return (
              <div key={sec} className="p-nav-group">
                <div className="p-nav-label">{sec}</div>
                {items.map(n=>(
                  <button key={n.id} className={`p-nav-item${screen===n.id?' active':''}`}
                    onClick={()=>{ setScreen(n.id); setSideOpen(false); }}>
                    <i className={`ti ${n.icon} p-nav-ic`}/>
                    <span>{n.label}</span>
                    {n.id==='ad-ecom' && <span className="p-new-badge">New</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="p-side-foot">
          <div className="p-user-row">
            <div className="p-avatar">{initials}</div>
            <div className="p-user-meta">
              <div className="p-uname">{user.name||'Admin'}</div>
              <div className="p-uemail">{user.email}</div>
            </div>
            <button className="p-icon-btn" onClick={logout}><i className="ti ti-logout"/></button>
          </div>
        </div>
      </aside>
      <div className="p-main">
        <header className="p-top">
          <div className="p-top-l">
            <button className="p-burger" onClick={()=>setSideOpen(true)}><i className="ti ti-menu-2"/></button>
            <nav className="p-crumb">
              <i className="ti ti-home-2 p-crumb-home"/>
              <i className="ti ti-chevron-right p-crumb-sep"/>
              <span className="p-crumb-cur">{curLabel}</span>
            </nav>
          </div>
          <div className="p-top-r">
            <span className="p-top-date"><i className="ti ti-calendar"/>{today}</span>
            <div className="p-vline"/>
            <span className="p-dot green"/><span className="p-dot-lbl">Live</span>
            <span className="p-dot amber"/><span className="p-dot-lbl">ZATCA</span>
            <div className="p-vline"/>
            <button className="p-action-btn" onClick={()=>{ setMode('pos'); setScreen('pos-sale'); }}>
              <i className="ti ti-device-desktop"/> POS Terminal
            </button>
            <div className="p-top-user">
              <div className="p-avatar sm">{initials}</div>
              <span>{firstName}</span>
            </div>
          </div>
        </header>
        <main className="p-body"><Screen/></main>
      </div>
    </div>
  );
}

export default function Root(){
  return(
    <QueryClientProvider client={qc}>
      <ToastProvider><AuthProvider><App/></AuthProvider></ToastProvider>
    </QueryClientProvider>
  );
}
