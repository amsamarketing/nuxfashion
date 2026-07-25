'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Package, Heart, MapPin, User, Star, Wallet, Bell, ArrowLeft, ChevronRight, LogOut, Gift, RotateCcw, FileText } from 'lucide-react';

const NAV_ITEMS = {
  en: [
    { k:'orders',  icon: Package,  label: 'My Orders',       badge: '3 new' },
    { k:'wishlist',icon: Heart,    label: 'Wishlist',        badge: '12' },
    { k:'loyalty', icon: Star,     label: 'Loyalty Points',  badge: '1,240 pts' },
    { k:'wallet',  icon: Wallet,   label: 'Wallet',          badge: 'SAR 120' },
    { k:'addresses',icon:MapPin,   label: 'Address Book',    badge: null },
    { k:'returns', icon: RotateCcw,label: 'Returns',         badge: null },
    { k:'invoices',icon:FileText,  label: 'Invoices',        badge: null },
    { k:'gifts',   icon: Gift,     label: 'Gift Cards',      badge: null },
    { k:'notifications',icon:Bell, label: 'Notifications',   badge: '5' },
    { k:'profile', icon: User,     label: 'Profile',         badge: null },
  ],
  ar: [
    { k:'orders',  icon: Package,  label: 'طلباتي',            badge: '3 جديد' },
    { k:'wishlist',icon: Heart,    label: 'المفضلة',           badge: '12' },
    { k:'loyalty', icon: Star,     label: 'نقاط الولاء',       badge: '1,240 نقطة' },
    { k:'wallet',  icon: Wallet,   label: 'المحفظة',           badge: 'SAR 120' },
    { k:'addresses',icon:MapPin,   label: 'دفتر العناوين',     badge: null },
    { k:'returns', icon: RotateCcw,label: 'المرتجعات',         badge: null },
    { k:'invoices',icon:FileText,  label: 'الفواتير',           badge: null },
    { k:'gifts',   icon: Gift,     label: 'بطاقات الهدايا',    badge: null },
    { k:'notifications',icon:Bell, label: 'الإشعارات',         badge: '5' },
    { k:'profile', icon: User,     label: 'الملف الشخصي',      badge: null },
  ],
};

const MOCK_ORDERS = [
  { id: '#NUX-202600421', date: '22 Jul 2026', status: 'Delivered', statusAr: 'تم التوصيل', total: 454, items: 2, color: 'green' },
  { id: '#NUX-202600388', date: '18 Jul 2026', status: 'In Transit', statusAr: 'في الطريق', total: 684, items: 3, color: 'blue' },
  { id: '#NUX-202600312', date: '10 Jul 2026', status: 'Processing', statusAr: 'قيد المعالجة', total: 229, items: 1, color: 'orange' },
];

export default function AccountPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const [active, setActive] = useState('orders');
  const items = NAV_ITEMS[locale as 'en' | 'ar'] || NAV_ITEMS.en;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 hidden md:block">
          {/* Profile card */}
          <div className="bg-gradient-to-br from-luxury-900 to-luxury-700 rounded-2xl p-5 text-white mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gold-500 rounded-full flex items-center justify-center text-xl font-black">SA</div>
              <div>
                <div className="font-black">Sara Abdullah</div>
                <div className="text-xs text-white/60">sara@example.com</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['1,240', isRtl ? 'نقطة' : 'Points'], ['SAR 120', isRtl ? 'محفظة' : 'Wallet'], ['Gold', isRtl ? 'الرتبة' : 'Tier']].map(([v,l]) => (
                <div key={l} className="bg-white/10 rounded-xl p-2">
                  <div className="font-bold text-sm text-gold-300">{v}</div>
                  <div className="text-[10px] text-white/60">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav */}
          <nav className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {items.map((item, i) => (
              <button key={item.k} onClick={() => setActive(item.k)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-sm transition-all ${i < items.length - 1 ? 'border-b border-gray-50' : ''} ${active === item.k ? 'bg-luxury-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <item.icon size={16}/>
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active===item.k ? 'bg-white/20 text-white' : 'bg-luxury-50 text-luxury-900'}`}>{item.badge}</span>}
                  <ChevronRight size={12} className="opacity-40"/>
                </div>
              </button>
            ))}
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={16}/><span className="font-medium">{isRtl ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {active === 'orders' && (
            <div>
              <h2 className="text-xl font-black text-luxury-900 mb-5">{isRtl ? 'طلباتي' : 'My Orders'}</h2>
              <div className="space-y-4">
                {MOCK_ORDERS.map(o => (
                  <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-black text-luxury-900 text-sm">{o.id}</p>
                        <p className="text-xs text-gray-400">{o.date} · {o.items} {isRtl ? 'منتج' : 'items'}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        o.color === 'green' ? 'bg-green-100 text-green-700' :
                        o.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {isRtl ? o.statusAr : o.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-luxury-900">SAR {o.total}</span>
                      <div className="flex gap-2">
                        <button className="text-xs border border-gray-200 rounded-full px-4 py-1.5 font-medium hover:bg-gray-50 transition-colors">
                          {isRtl ? 'تتبع' : 'Track'}
                        </button>
                        <button className="text-xs bg-luxury-900 text-white rounded-full px-4 py-1.5 font-medium hover:bg-luxury-700 transition-colors">
                          {isRtl ? 'تفاصيل' : 'Details'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'loyalty' && (
            <div>
              <h2 className="text-xl font-black text-luxury-900 mb-5">{isRtl ? 'نقاط الولاء' : 'Loyalty Points'}</h2>
              <div className="bg-gradient-to-br from-luxury-900 to-luxury-700 rounded-2xl p-6 text-white mb-5">
                <div className="text-4xl font-black text-gold-400 mb-1">1,240</div>
                <div className="text-sm text-white/70 mb-4">{isRtl ? 'نقطة متاحة' : 'Available points'}</div>
                <div className="h-2 bg-white/20 rounded-full mb-2">
                  <div className="h-full bg-gold-400 rounded-full" style={{ width: '62%' }}/>
                </div>
                <p className="text-xs text-white/60">{isRtl ? '760 نقطة للوصول إلى رتبة بلاتيني' : '760 points to Platinum tier'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  [isRtl ? 'الرتبة' : 'Tier', isRtl ? 'ذهبي' : 'Gold', '🥇'],
                  [isRtl ? 'مكتسبة' : 'Earned', '3,480', '⬆️'],
                  [isRtl ? 'مستردة' : 'Redeemed', '2,240', '⬇️'],
                ].map(([l, v, ic]) => (
                  <div key={l as string} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <div className="text-2xl mb-1">{ic}</div>
                    <div className="font-black text-luxury-900">{v}</div>
                    <div className="text-xs text-gray-400">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'profile' && (
            <div>
              <h2 className="text-xl font-black text-luxury-900 mb-5">{isRtl ? 'الملف الشخصي' : 'My Profile'}</h2>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                {[
                  [isRtl ? 'الاسم الكامل' : 'Full Name', 'Sara Abdullah'],
                  [isRtl ? 'البريد الإلكتروني' : 'Email', 'sara@example.com'],
                  [isRtl ? 'رقم الجوال' : 'Phone', '+966 50 123 4567'],
                  [isRtl ? 'تاريخ الميلاد' : 'Date of Birth', '1995-05-15'],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <label className="text-xs font-bold text-gray-400 mb-1 block">{label}</label>
                    <input defaultValue={val as string} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-luxury-900"/>
                  </div>
                ))}
                <button className="btn-primary">{isRtl ? 'حفظ التغييرات' : 'Save Changes'}</button>
              </div>
            </div>
          )}

          {!['orders','loyalty','profile'].includes(active) && (
            <div className="text-center py-20 text-gray-300">
              <div className="text-6xl mb-4">🚧</div>
              <p className="text-gray-400">{isRtl ? 'قريباً...' : 'Coming soon...'}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
