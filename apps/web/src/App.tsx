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
import BarcodeLabels from './pages/admin/BarcodeLabels';
import B2BSales from './pages/admin/B2BSales';
import Marketing from './pages/admin/Marketing';

const qc = new QueryClient({ defaultOptions:{ queries:{ retry:1, staleTime:30000 }}});

const NAV = [
  { id:'ad-dash',   label:'Dashboard',     icon:'ti-layout-dashboard',  sec:'Main',perms:['dashboard.view'] },
  { id:'ad-orders', label:'Orders',        icon:'ti-shopping-cart',      sec:'Main',perms:['orders.view','sales.view'] },
  { id:'ad-b2b',    label:'B2B Sales',     icon:'ti-building-store',     sec:'Main',perms:['sales.view'] },
  { id:'ad-prod',   label:'Products',      icon:'ti-tag',                sec:'Catalog',perms:['products.view','inventory.view'] },
  { id:'ad-labels', label:'Barcode Labels',icon:'ti-barcode',            sec:'Catalog',perms:['products.manage','inventory.view'] },
  { id:'ad-inv',    label:'Inventory',     icon:'ti-package',            sec:'Catalog',perms:['inventory.view'] },
  { id:'ad-wh',     label:'Warehouses',    icon:'ti-building-warehouse', sec:'Catalog',perms:['warehouses.view','inventory.view'] },
  { id:'ad-branches',label:'Branches',      icon:'ti-building-store',     sec:'Main',perms:['branches.view','reports.branch'] },
  { id:'ad-purch',  label:'Purchasing',    icon:'ti-truck',              sec:'Catalog',perms:['purchasing.view'] },
  { id:'ad-ecom',   label:'E-commerce',    icon:'ti-world',              sec:'Channels',perms:['ecommerce.view','ecommerce.content'] },
  { id:'ad-crm',    label:'Customers',     icon:'ti-users',              sec:'Channels',perms:['customers.view'] },
  { id:'ad-loyal',  label:'Loyalty',       icon:'ti-star',               sec:'Channels',perms:['loyalty.view','marketing.view'] },
  { id:'ad-marketing',label:'Marketing',    icon:'ti-speakerphone',       sec:'Channels',perms:['marketing.view','marketing.*'] },
  { id:'ad-hr',     label:'HR & Payroll',  icon:'ti-id',                 sec:'People',perms:['hr.view','hr.self.view','payroll.view','hr.payroll.view'] },
  { id:'ad-acct',   label:'Accounting',    icon:'ti-report-money',       sec:'Finance',perms:['finance.view','invoices.view'] },
  { id:'ad-zatca',  label:'ZATCA',         icon:'ti-file-check',         sec:'Finance',perms:['vat.view'] },
  { id:'ad-rep',    label:'Reports',       icon:'ti-chart-bar',          sec:'Finance',perms:['reports.view','reports.finance','reports.branch','reports.marketing'] },
  { id:'ad-set',    label:'Settings',      icon:'ti-settings',           sec:'System',perms:['settings.view','users.view'] },
];

const ECOM_NAV = [
  { id:'ad-ecom',              label:'E-commerce Dashboard', icon:'ti-dashboard' },
  { id:'ad-ecom-home',         label:'Homepage Builder',     icon:'ti-layout-dashboard' },
  { id:'ad-ecom-banners',      label:'Hero Banners',         icon:'ti-photo' },
  { id:'ad-ecom-sections',     label:'Catalog Sections',     icon:'ti-layout-grid' },
  { id:'ad-ecom-catalog',      label:'Online Catalog',       icon:'ti-category' },
  { id:'ad-ecom-orders',       label:'Online Orders',        icon:'ti-shopping-bag' },
  { id:'ad-ecom-campaigns',    label:'Campaign Content',     icon:'ti-speakerphone' },
  { id:'ad-ecom-pages',        label:'Website Pages',        icon:'ti-file-text' },
  { id:'ad-ecom-footer',       label:'Footer & Contact',     icon:'ti-layout-bottombar' },
  { id:'ad-ecom-settings',     label:'Store Settings',       icon:'ti-settings' },
  { id:'ad-ecom-seo',          label:'General & SEO',        icon:'ti-search' },
];

function hasPermission(user:any,required:string[]){const permissions:string[]=user?.permissions||[];if(!permissions.length)return String(user?.role||'').toLowerCase().includes('admin');if(permissions.includes('*'))return true;return required.some(need=>permissions.some(got=>got===need||(got.endsWith('.*')&&need.startsWith(got.slice(0,-1)))))}

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
  'ad-labels':BarcodeLabels,
  'ad-b2b':B2BSales,
  'ad-marketing':Marketing,
  'ad-ecom-home':()=> <Ecommerce initialTab="content" initialWorkspace="home"/>,
  'ad-ecom-banners':()=> <Ecommerce initialTab="content" initialWorkspace="hero"/>,
  'ad-ecom-sections':()=> <Ecommerce initialTab="content" initialWorkspace="catalog"/>,
  'ad-ecom-catalog':()=> <Ecommerce initialTab="catalog"/>,
  'ad-ecom-orders':()=> <Ecommerce initialTab="orders"/>,
  'ad-ecom-campaigns':()=> <Ecommerce initialTab="content" initialWorkspace="campaigns"/>,
  'ad-ecom-pages':()=> <Ecommerce initialTab="content" initialWorkspace="pages"/>,
  'ad-ecom-footer':()=> <Ecommerce initialTab="content" initialWorkspace="footer"/>,
  'ad-ecom-settings':()=> <Ecommerce initialTab="settings"/>,
  'ad-ecom-seo':()=> <Ecommerce initialTab="content" initialWorkspace="general"/>,
};

const SECS = ['Main','Catalog','Channels','People','Finance','System'];

function App() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'pos'|'admin'>(()=>user?.portal==='pos'?'pos':'admin');
  const [screen, setScreen] = useState(()=>user?.portal==='pos'?'pos-sale':'ad-dash');
  const [sideOpen, setSideOpen] = useState(false);
  const [openGroups,setOpenGroups]=useState<string[]>(['Main','Catalog']);
  const visibleNav=NAV.filter(n=>hasPermission(user,n.perms));

  useEffect(()=>{
    const h=(e:any)=>{const target=NAV.find(n=>n.id===e.detail);if(target&&!hasPermission(user,target.perms))return;setMode('admin');setScreen(e.detail);};
    const h2=()=>{ setMode('pos'); setScreen('pos-sale'); };
    window.addEventListener('nav',h);
    window.addEventListener('resume-held',h2);
    return ()=>{ window.removeEventListener('nav',h); window.removeEventListener('resume-held',h2); };
  },[user]);

  const isStore=window.location.hash==='#store'||window.location.pathname.startsWith('/store');
  if(isStore) return <Storefront/>;
  const posLogin=window.location.pathname.startsWith('/pos-login')||window.location.hash==='#pos-login';
  if(!user) return <Login portal={posLogin?'pos':'admin'} onLogin={portal=>{setMode(portal);setScreen(portal==='pos'?'pos-sale':'ad-dash')}}/>;

  const ecommerceAllowed=visibleNav.some(n=>n.id==='ad-ecom')&&ECOM_NAV.some(n=>n.id===screen);
  const safeScreen=mode==='admin'&&!visibleNav.some(n=>n.id===screen)&&!ecommerceAllowed?(visibleNav[0]?.id||'ad-dash'):screen;
  const Screen = SCREENS[safeScreen] || Dashboard;
  const initials=(user.name||user.email||'A').slice(0,2).toUpperCase();
  const firstName=user.name?.split(' ')[0]||'Admin';
  const today=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const curLabel=NAV.find(n=>n.id===safeScreen)?.label||ECOM_NAV.find(n=>n.id===safeScreen)?.label||'Dashboard';

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
          <span className="p-chip"><i className="ti ti-building-store"/>{user.branchName||'Assigned Branch'}</span>
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
            const items=visibleNav.filter(n=>n.sec===sec);if(!items.length)return null;
            return (
              <div key={sec} className="p-nav-group">
                <button className="p-nav-label p-nav-toggle" onClick={()=>setOpenGroups(g=>g.includes(sec)?g.filter(x=>x!==sec):[...g,sec])}><span>{sec}</span><i className={`ti ti-chevron-${openGroups.includes(sec)?'up':'down'}`}/></button>
                <div className={`p-nav-children${openGroups.includes(sec)?' open':''}`}>{items.map(n=>n.id==='ad-ecom'?(
                  <div className={`p-subnav${safeScreen.startsWith('ad-ecom')?' active':''}`} key={n.id}>
                    <button className="p-nav-item p-subnav-trigger" onClick={()=>setOpenGroups(g=>g.includes('E-commerce')?g.filter(x=>x!=='E-commerce'):[...g,'E-commerce'])}>
                      <i className={`ti ${n.icon} p-nav-ic`}/><span>{n.label}</span><i className={`ti ti-chevron-${openGroups.includes('E-commerce')?'up':'down'} p-subnav-chevron`}/>
                    </button>
                    <div className={`p-subnav-menu${openGroups.includes('E-commerce')?' open':''}`}>
                      {ECOM_NAV.map(item=><button key={item.id} className={safeScreen===item.id?'active':''} onClick={()=>{setScreen(item.id);setSideOpen(false)}}><i className={`ti ${item.icon}`}/><span>{item.label}</span></button>)}
                    </div>
                  </div>
                ):(
                  <button key={n.id} className={`p-nav-item${safeScreen===n.id?' active':''}`} onClick={()=>{ setScreen(n.id); setSideOpen(false); }}>
                    <i className={`ti ${n.icon} p-nav-ic`}/><span>{n.label}</span>
                  </button>
                ))}</div>
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
            <a className="p-action-btn" href="/pos-login"><i className="ti ti-device-desktop"/> Branch POS Login</a>
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
