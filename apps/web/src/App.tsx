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

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

const POS_NAV = [
  { id:'pos-sale',    l:'New Sale',    icon:'ti-shopping-cart' },
  { id:'pos-return',  l:'Returns',     icon:'ti-arrow-back' },
  { id:'pos-held',    l:'Held Orders', icon:'ti-player-pause' },
  { id:'pos-zreport', l:'Z-Report',    icon:'ti-report' },
];

const ADMIN_NAV = [
  { id:'ad-dash',   l:'Dashboard',        icon:'ti-layout-dashboard', group:'Main' },
  { id:'ad-orders', l:'Orders',           icon:'ti-shopping-cart',    group:'Main' },
  { id:'ad-prod',   l:'Products',         icon:'ti-tag',              group:'Inventory' },
  { id:'ad-inv',    l:'Inventory',        icon:'ti-package',          group:'Inventory' },
  { id:'ad-wh',     l:'Warehouses',       icon:'ti-building-warehouse',group:'Inventory' },
  { id:'ad-purch',  l:'Purchasing',       icon:'ti-truck',            group:'Inventory' },
  { id:'ad-acct',   l:'Accounting',       icon:'ti-report-money',     group:'Finance' },
  { id:'ad-zatca',  l:'ZATCA Invoices',   icon:'ti-file-check',       group:'Finance' },
  { id:'ad-crm',    l:'Customers',        icon:'ti-users',            group:'People' },
  { id:'ad-loyal',  l:'Loyalty & Promos', icon:'ti-star',             group:'People' },
  { id:'ad-hr',     l:'HR & Payroll',     icon:'ti-id',               group:'People' },
  { id:'ad-rep',    l:'Reports',          icon:'ti-chart-bar',        group:'System' },
  { id:'ad-set',    l:'Settings',         icon:'ti-settings',         group:'System' },
];

const SCREENS: Record<string, React.ComponentType> = {
  'pos-sale': POSSale, 'pos-return': POSReturn, 'pos-held': POSHeld, 'pos-zreport': ZReport,
  'ad-dash': Dashboard, 'ad-orders': Orders, 'ad-wh': Warehouses, 'ad-inv': Inventory,
  'ad-prod': Products, 'ad-purch': Purchasing, 'ad-acct': Accounting, 'ad-zatca': ZATCA,
  'ad-crm': Customers, 'ad-loyal': Loyalty, 'ad-hr': HR, 'ad-rep': Reports, 'ad-set': Settings,
};

const GROUPS = ['Main','Inventory','Finance','People','System'];

function AdminSidebar({ screen, setScreen, user, logout, sideOpen, setSideOpen }: any) {
  const [expanded, setExpanded] = useState<Record<string,boolean>>({ Main:true, Inventory:true, Finance:true, People:true, System:true });
  const toggleGroup = (g: string) => setExpanded(p => ({ ...p, [g]: !p[g] }));
  const initials = (user?.name || user?.email || 'A').slice(0,2).toUpperCase();
  const today = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  return (
    <>
      {sideOpen && <div className="nux-overlay" onClick={() => setSideOpen(false)}/>}
      <aside className={`nux-sidebar${sideOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="nux-sb-logo">
          <div className="nux-sb-logo-icon"><i className="ti ti-hanger"/></div>
          <div>
            <div className="nux-sb-logo-name">NuxFashion</div>
            <div className="nux-sb-logo-sub">POS & ERP</div>
          </div>
          <button className="nux-sb-close d-lg-none" onClick={() => setSideOpen(false)}><i className="ti ti-x"/></button>
        </div>

        {/* User card */}
        <div className="nux-sb-user">
          <div className="nux-sb-avatar">{initials}</div>
          <div className="nux-sb-user-info">
            <div className="nux-sb-user-name">{user?.name || 'Admin'}</div>
            <div className="nux-sb-user-role"><span className="nux-dot-green"/>System Admin</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="nux-sb-quick">
          {[
            { icon:'ti-layout-dashboard', tip:'Dashboard', action:()=>setScreen('ad-dash') },
            { icon:'ti-bell',             tip:'Notifications', action:()=>{} },
            { icon:'ti-chart-bar',        tip:'Reports', action:()=>setScreen('ad-rep') },
            { icon:'ti-settings',         tip:'Settings', action:()=>setScreen('ad-set') },
            { icon:'ti-logout',           tip:'Logout', action:logout },
          ].map((a,i) => (
            <button key={i} title={a.tip} onClick={a.action} className="nux-quick-btn"><i className={`ti ${a.icon}`}/></button>
          ))}
        </div>

        {/* Nav */}
        <nav className="nux-sb-nav">
          {GROUPS.map(g => {
            const items = ADMIN_NAV.filter(n => n.group === g);
            return (
              <div key={g} className="nux-sb-group">
                <button className="nux-sb-group-hd" onClick={() => toggleGroup(g)}>
                  <span>{g}</span>
                  <i className={`ti ${expanded[g] ? 'ti-chevron-down' : 'ti-chevron-right'}`}/>
                </button>
                {expanded[g] && items.map(n => (
                  <button key={n.id} onClick={() => { setScreen(n.id); setSideOpen(false); }}
                    className={`nux-sb-item${screen === n.id ? ' active' : ''}`}>
                    <span className="nux-sb-dot"/>
                    <i className={`ti ${n.icon}`}/>
                    <span>{n.l}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="nux-sb-footer"><i className="ti ti-calendar-event" style={{fontSize:12,marginRight:6}}/>{today}</div>
      </aside>
    </>
  );
}

function App() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'pos'|'admin'>('pos');
  const [screen, setScreen] = useState('pos-sale');
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    const h1 = () => { setMode('pos'); setScreen('pos-sale'); };
    const h2 = (e: any) => { setMode('admin'); setScreen(e.detail); };
    window.addEventListener('resume-held', h1);
    window.addEventListener('nav', h2);
    return () => { window.removeEventListener('resume-held', h1); window.removeEventListener('nav', h2); };
  }, []);

  if (!user) return <Login onLogin={() => setScreen('pos-sale')} />;
  const Screen = SCREENS[screen] || Dashboard;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  if (mode === 'pos') {
    return (
      <div className="nux-pos-root">
        <div className="nux-pos-bar">
          <div className="d-flex align-items-center gap-3">
            <div className="nux-sb-logo-icon" style={{width:32,height:32,fontSize:16}}><i className="ti ti-hanger"/></div>
            <span style={{fontWeight:800,fontSize:14,color:'#fff'}}>NuxFashion <span style={{color:'#fb923c',fontSize:11,fontWeight:600}}>POS</span></span>
            <div className="nux-pos-nav">
              {POS_NAV.map(n => (
                <button key={n.id} onClick={() => setScreen(n.id)} className={`nux-pos-btn${screen===n.id?' active':''}`}>
                  <i className={`ti ${n.icon}`}/> {n.l}
                </button>
              ))}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="nux-badge-green"><i className="ti ti-wifi" style={{fontSize:10}}/> Online</span>
            <span className="nux-badge-orange"><i className="ti ti-file-check" style={{fontSize:10}}/> ZATCA</span>
            <button className="nux-pos-switch-btn" onClick={() => { setMode('admin'); setScreen('ad-dash'); }}>
              <i className="ti ti-layout-dashboard"/> Admin Portal
            </button>
            <button className="nux-icon-btn" onClick={logout}><i className="ti ti-logout"/></button>
          </div>
        </div>
        <div style={{flex:1,overflow:'hidden'}}><Screen /></div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <div className="nux-admin-root">
      <AdminSidebar screen={screen} setScreen={setScreen} user={user} logout={logout} sideOpen={sideOpen} setSideOpen={setSideOpen}/>

      <div className="nux-main-wrap">
        {/* Topbar */}
        <header className="nux-topbar">
          <div className="d-flex align-items-center gap-3">
            <button className="nux-hamburger d-lg-none" onClick={() => setSideOpen(true)}><i className="ti ti-menu-2"/></button>
            <div>
              <div className="nux-welcome">Welcome, <span className="nux-welcome-name">{firstName}</span></div>
              <div className="nux-welcome-sub">
                <span className="nux-badge-orange" style={{fontSize:10,padding:'1px 8px'}}>ZATCA Active</span>
                <span className="nux-badge-green" style={{fontSize:10,padding:'1px 8px'}}><i className="ti ti-wifi" style={{fontSize:9}}/> Live</span>
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="nux-date-pill"><i className="ti ti-calendar-event"/>{dateStr}</div>
            <button className="nux-pos-switch" onClick={() => { setMode('pos'); setScreen('pos-sale'); }}>
              <i className="ti ti-device-desktop"/> POS Terminal
            </button>
            <button className="nux-icon-btn-outline" title="Notifications"><i className="ti ti-bell"/></button>
            <button className="nux-icon-btn-outline" onClick={logout} title="Logout"><i className="ti ti-logout"/></button>
          </div>
        </header>

        <main className="nux-content"><Screen /></main>
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
