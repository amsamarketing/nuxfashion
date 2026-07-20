import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const NAV = [
  { key:'dashboard', icon:'📊', to:'/' },
  { key:'pos',       icon:'🛒', to:'/pos' },
  { key:'products',  icon:'👗', to:'/products' },
  { key:'inventory', icon:'📦', to:'/inventory' },
  { key:'customers', icon:'👥', to:'/customers' },
  { key:'purchasing',icon:'🚚', to:'/purchasing' },
  { key:'hr',        icon:'👨‍💼', to:'/hr' },
  { key:'finance',   icon:'💰', to:'/finance' },
  { key:'reports',   icon:'📈', to:'/reports' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, toggle, lang, isRTL } = useLang();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  return (
    <div className={"flex h-screen bg-gray-50 " + (isRTL ? 'flex-row-reverse' : '')}>
      <aside className="w-56 bg-purple-900 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-purple-700">
          <h1 className="text-white font-bold text-lg">NuxFashion</h1>
          <p className="text-purple-300 text-xs mt-0.5">{user?.name}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map(item => (
            <NavLink key={item.key} to={item.to} end={item.to === '/'}
              className={({ isActive }) =>
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ' +
                (isActive ? 'bg-purple-700 text-white' : 'text-purple-200 hover:bg-purple-800 hover:text-white') +
                (isRTL ? ' flex-row-reverse text-right' : '')}>
              <span>{item.icon}</span><span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-purple-700 space-y-1">
          <button onClick={toggle} className="w-full text-xs text-purple-300 hover:text-white py-1 px-2 rounded hover:bg-purple-800 transition-colors text-left">
            {lang === 'en' ? '🌐 العربية' : '🌐 English'}
          </button>
          <button onClick={handleLogout} className="w-full text-xs text-purple-300 hover:text-white py-1 px-2 rounded hover:bg-purple-800 transition-colors text-left">
            🚪 {t('logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}
