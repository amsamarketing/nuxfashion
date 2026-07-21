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

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

const POS_NAV = [
  { id: 'pos-sale',    l: 'New sale',     i: 'ti-shopping-cart' },
  { id: 'pos-return',  l: 'Returns',      i: 'ti-arrow-back' },
  { id: 'pos-held',    l: 'Held orders',  i: 'ti-player-pause' },
  { id: 'pos-zreport', l: 'Z-report',     i: 'ti-report' },
];
const ADMIN_NAV = [
  { id: 'ad-dash',   l: 'Dashboard',       i: 'ti-layout-dashboard',  group: 'MAIN' },
  { id: 'ad-orders', l: 'Orders',           i: 'ti-shopping-cart',    group: 'MAIN' },
  { id: 'ad-inv',    l: 'Inventory',        i: 'ti-package',           group: 'MAIN' },
  { id: 'ad-prod',   l: 'Products',         i: 'ti-tag',               group: 'MAIN' },
  { id: 'ad-purch',  l: 'Purchasing',       i: 'ti-truck',             group: 'MAIN' },
  { id: 'ad-acct',   l: 'Accounting',       i: 'ti-report-money',      group: 'FINANCE' },
  { id: 'ad-zatca',  l: 'ZATCA invoices',   i: 'ti-file-check',        group: 'FINANCE' },
  { id: 'ad-crm',    l: 'Customers',        i: 'ti-users',             group: 'PEOPLE' },
  { id: 'ad-loyal',  l: 'Loyalty & promos', i: 'ti-star',              group: 'PEOPLE' },
  { id: 'ad-hr',     l: 'HR & payroll',     i: 'ti-id',                group: 'PEOPLE' },
  { id: 'ad-rep',    l: 'Reports',          i: 'ti-chart-bar',         group: 'SYSTEM' },
  { id: 'ad-set',    l: 'Settings',         i: 'ti-settings',          group: 'SYSTEM' },
];

const SCREENS: Record<string, React.ComponentType> = {
  'pos-sale': POSSale, 'pos-return': POSReturn, 'pos-held': POSHeld, 'pos-zreport': ZReport,
  'ad-dash': Dashboard, 'ad-orders': Orders, 'ad-inv': Inventory, 'ad-prod': Products,
  'ad-purch': Purchasing, 'ad-acct': Accounting, 'ad-zatca': ZATCA, 'ad-crm': Customers,
  'ad-loyal': Loyalty, 'ad-hr': HR, 'ad-rep': Reports, 'ad-set': Settings,
};

function App() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'pos' | 'admin'>('pos');
  const [screen, setScreen] = useState('pos-sale');

  const switchMode = (m: 'pos' | 'admin') => {
    setMode(m);
    setScreen(m === 'pos' ? 'pos-sale' : 'ad-dash');
  };

  if (!user) return <Login onLogin={() => setScreen('pos-sale')} />;

  const Screen = SCREENS[screen] || Dashboard;
  const groups = ['MAIN', 'FINANCE', 'PEOPLE', 'SYSTEM'];

  return (
    <div className="app-root">

      {/* ── Top bar ───────────────────────────────── */}
      <div className="app-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-hanger" style={{ fontSize: 22, color: 'var(--fill-accent)' }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>NuxFashion</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {mode === 'pos' ? 'POS · Riyadh Mall · Terminal 1' : 'ERP · Multi-branch · KSA'}
          </span>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 12, background: 'var(--surface-1)', borderRadius: 'var(--radius)', padding: 3 }}>
          {(['pos', 'admin'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ padding: '5px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'calc(var(--radius) - 2px)', cursor: 'pointer', background: mode === m ? 'var(--fill-accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-secondary)', transition: 'all .15s' }}>
              <i className={`ti ${m === 'pos' ? 'ti-device-desktop' : 'ti-layout-dashboard'}`} style={{ marginRight: 5 }} />
              {m === 'pos' ? 'POS Terminal' : 'Admin Portal'}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="bx g"><i className="ti ti-wifi" style={{ fontSize: 11 }} /> Online</span>
          <span className="bx g"><i className="ti ti-file-check" style={{ fontSize: 11 }} /> ZATCA Active</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</span>
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={logout}>
            <i className="ti ti-logout" /> Logout
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div className="app-body">

        {/* ── Sidebar ───────────────────────────────── */}
        <div className="app-sidebar">
          {mode === 'pos' ? (
            <>
              <div className="sep">POS TERMINAL</div>
              {POS_NAV.map(n => (
                <div key={n.id} className={`ni ${screen === n.id ? 'on' : ''}`} onClick={() => setScreen(n.id)}>
                  <i className={`ti ${n.i}`} /> {n.l}
                </div>
              ))}
              <div className="sep" style={{ marginTop: 'auto' }}>QUICK ACTIONS</div>
              <div className="ni"><i className="ti ti-user-plus" /> Add customer</div>
              <div className="ni"><i className="ti ti-gift" /> Gift card</div>
              <div className="ni"><i className="ti ti-percentage" /> Discount</div>
            </>
          ) : (
            <>
              {groups.map(group => {
                const items = ADMIN_NAV.filter(n => n.group === group);
                return (
                  <div key={group}>
                    <div className="sep">{group}</div>
                    {items.map(n => (
                      <div key={n.id} className={`ni ${screen === n.id ? 'on' : ''}`} onClick={() => setScreen(n.id)}>
                        <i className={`ti ${n.i}`} /> {n.l}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Main content ──────────────────────────── */}
        <div className="app-main">
          <Screen />
        </div>
      </div>

    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  );
}
