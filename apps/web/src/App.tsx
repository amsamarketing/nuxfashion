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
  { id:'ad-dash',   l:'Dashboard',        icon:'ti-layout-dashboard',    group:'Main' },
  { id:'ad-orders', l:'Orders',           icon:'ti-shopping-cart',       group:'Main' },
  { id:'ad-prod',   l:'Products',         icon:'ti-tag',                 group:'Main' },
  { id:'ad-inv',    l:'Inventory',        icon:'ti-package',             group:'Main' },
  { id:'ad-wh',     l:'Warehouses',       icon:'ti-building-warehouse',  group:'Main' },
  { id:'ad-purch',  l:'Purchasing',       icon:'ti-truck',               group:'Main' },
  { id:'ad-acct',   l:'Accounting',       icon:'ti-report-money',        group:'Finance' },
  { id:'ad-zatca',  l:'ZATCA Invoices',   icon:'ti-file-check',          group:'Finance' },
  { id:'ad-crm',    l:'Customers',        icon:'ti-users',               group:'People' },
  { id:'ad-loyal',  l:'Loyalty & Promos', icon:'ti-star',                group:'People' },
  { id:'ad-hr',     l:'HR & Payroll',     icon:'ti-id',                  group:'People' },
  { id:'ad-rep',    l:'Reports',          icon:'ti-chart-bar',           group:'System' },
  { id:'ad-set',    l:'Settings',         icon:'ti-settings',            group:'System' },
];

const SCREENS: Record<string, React.ComponentType> = {
  'pos-sale': POSSale, 'pos-return': POSReturn, 'pos-held': POSHeld, 'pos-zreport': ZReport,
  'ad-dash': Dashboard, 'ad-orders': Orders, 'ad-wh': Warehouses, 'ad-inv': Inventory,
  'ad-prod': Products, 'ad-purch': Purchasing, 'ad-acct': Accounting, 'ad-zatca': ZATCA,
  'ad-crm': Customers, 'ad-loyal': Loyalty, 'ad-hr': HR, 'ad-rep': Reports, 'ad-set': Settings,
};

const PAGE_TITLES: Record<string, string> = {
  'ad-dash':'Dashboard','ad-orders':'Orders','ad-wh':'Warehouses','ad-inv':'Inventory',
  'ad-prod':'Products','ad-purch':'Purchasing','ad-acct':'Accounting','ad-zatca':'ZATCA Invoices',
  'ad-crm':'Customers','ad-loyal':'Loyalty & Promos','ad-hr':'HR & Payroll','ad-rep':'Reports','ad-set':'Settings',
};

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

  if (mode === 'pos') {
    return (
      <div className="nux-pos-root">
        {/* POS Top bar */}
        <div className="nux-pos-bar">
          <div className="d-flex align-items-center gap-3">
            <div className="nux-brand-pill"><i className="ti ti-hanger"/> NuxFashion POS</div>
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
            <span className="nux-badge-blue"><i className="ti ti-file-check" style={{fontSize:10}}/> ZATCA</span>
            <button className="nux-icon-btn" onClick={() => { setMode('admin'); setScreen('ad-dash'); }} title="Admin Portal">
              <i className="ti ti-layout-dashboard"/>
            </button>
            <button className="nux-icon-btn" onClick={logout} title="Logout"><i className="ti ti-logout"/></button>
          </div>
        </div>
        <div style={{flex:1,overflow:'hidden'}}><Screen /></div>
      </div>
    );
  }

  // Admin layout
  const groups = ['Main','Finance','People','System'];
  return (
    <div className="nux-admin-root">
      {/* ── Sidebar overlay (mobile) ── */}
      {sideOpen && <div className="nux-overlay" onClick={() => setSideOpen(false)}/>}

      {/* ── Sidebar ── */}
      <aside className={`nux-sidebar${sideOpen?' open':''}`}>
        {/* Brand */}
        <div className="nux-sidebar-brand">
          <div className="nux-logo"><i className="ti ti-hanger"/></div>
          <div>
            <div className="nux-brand-name">NuxFashion</div>
            <div className="nux-brand-sub">ERP Platform</div>
          </div>
          <button className="nux-sidebar-close d-lg-none" onClick={() => setSideOpen(false)}><i className="ti ti-x"/></button>
        </div>

        {/* Nav */}
        <nav className="nux-nav">
          {groups.map(g => {
            const items = ADMIN_NAV.filter(n => n.group === g);
            return (
              <div key={g} className="nux-nav-group">
                <div className="nux-nav-label">{g}</div>
                {items.map(n => (
                  <button key={n.id} onClick={() => { setScreen(n.id); setSideOpen(false); }} className={`nux-nav-item${screen===n.id?' active':''}`}>
                    <i className={`ti ${n.icon}`}/>
                    <span>{n.l}</span>
                    {screen===n.id && <div className="nux-nav-indicator"/>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="nux-sidebar-footer">
          <div className="nux-user-avatar">{user.name?.slice(0,2).toUpperCase()||'A'}</div>
          <div className="nux-user-info">
            <div className="nux-user-name">{user.name||'Admin'}</div>
            <div className="nux-user-email">{user.email}</div>
          </div>
          <button className="nux-icon-btn-dark" onClick={logout} title="Logout"><i className="ti ti-logout"/></button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="nux-main-wrap">
        {/* Topbar */}
        <header className="nux-topbar">
          <div className="d-flex align-items-center gap-3">
            <button className="nux-hamburger d-lg-none" onClick={() => setSideOpen(true)}><i className="ti ti-menu-2"/></button>
            <div>
              <div className="nux-page-title">{PAGE_TITLES[screen]||screen}</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="nux-badge-green d-none d-sm-inline-flex"><i className="ti ti-wifi" style={{fontSize:10}}/> Online</span>
            <span className="nux-badge-blue d-none d-sm-inline-flex"><i className="ti ti-file-check" style={{fontSize:10}}/> ZATCA Active</span>
            <button className="nux-pos-switch" onClick={() => { setMode('pos'); setScreen('pos-sale'); }}>
              <i className="ti ti-device-desktop"/> Switch to POS
            </button>
            <button className="nux-icon-btn-outline" title="Notifications"><i className="ti ti-bell"/></button>
          </div>
        </header>

        {/* Page content */}
        <main className="nux-content">
          <Screen />
        </main>
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
