'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Heart, ShoppingBag, User, Menu, X, ChevronDown,
  Globe, Bell, Mic, MapPin, Phone, Truck, RotateCcw, Shield
} from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import MiniCart from '../cart/MiniCart';
import MegaMenu from './MegaMenu';

const NAV_ITEMS = [
  { key: 'women', href: '/category/women', hasMega: true },
  { key: 'men',   href: '/category/men',   hasMega: true },
  { key: 'kids',  href: '/category/kids',  hasMega: true },
  { key: 'beauty',href: '/category/beauty',hasMega: true },
  { key: 'home',  href: '/category/home',  hasMega: false },
  { key: 'sports',href: '/category/sports',hasMega: false },
  { key: 'brands',href: '/brands',          hasMega: false },
  { key: 'sale',  href: '/sale',            hasMega: false, isSale: true },
];

export default function Header() {
  const t = useTranslations('header');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isRtl = locale === 'ar';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [megaKey, setMegaKey] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useCartStore((s) => [s.isOpen, s.toggleCart] as const);
  const itemCount = useCartStore((s) => s.itemCount);
  const wishCount = useWishlistStore((s) => s.items.length);
  const searchRef = useRef<HTMLInputElement>(null);

  const switchLocale = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(searchQ)}`);
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top strip */}
      <div className="bg-luxury-900 text-white text-xs py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Truck size={12}/>{t('free_shipping')}</span>
            <span className="flex items-center gap-1.5"><Phone size={12}/>920 000 0000</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/track`} className="hover:text-gold-400 transition-colors">{t('track')}</Link>
            <Link href={`/${locale}/stores`} className="hover:text-gold-400 transition-colors flex items-center gap-1"><MapPin size={11}/>{t('stores')}</Link>
            <button onClick={switchLocale} className="flex items-center gap-1 hover:text-gold-400 transition-colors font-medium">
              <Globe size={12}/>{t('language')}
            </button>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Mobile menu btn */}
          <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>

          {/* Logo */}
          <Link href={`/${locale}`} className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 bg-luxury-900 rounded-lg flex items-center justify-center">
              <span className="text-gold-400 font-black text-sm">N</span>
            </div>
            <span className="font-black text-xl text-luxury-900 hidden sm:block tracking-tight">
              NUX<span className="text-gold-500">STORE</span>
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto hidden md:flex">
            <div className="relative w-full group">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-luxury-900 transition-colors"/>
              <input
                ref={searchRef}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={t('search')}
                className="w-full border-2 border-gray-200 rounded-full py-2.5 ps-9 pe-12 text-sm focus:border-luxury-900 outline-none transition-colors placeholder:text-gray-400"
              />
              <button type="submit" className="absolute end-1 top-1/2 -translate-y-1/2 bg-luxury-900 text-white p-1.5 rounded-full hover:bg-luxury-700 transition-colors">
                <Search size={14}/>
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1 ms-auto">
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-full" onClick={() => setSearchOpen(!searchOpen)}>
              <Search size={20}/>
            </button>
            <Link href={`/${locale}/account`} className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
              <User size={20}/>
            </Link>
            <Link href={`/${locale}/wishlist`} className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
              <Heart size={20}/>
              {wishCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishCount}
                </span>
              )}
            </Link>
            <button onClick={() => setCartOpen()} className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
              <ShoppingBag size={20}/>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 bg-luxury-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                ref={searchRef}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={t('search')}
                className="w-full border border-gray-200 rounded-full py-2 ps-9 pe-4 text-sm outline-none focus:border-luxury-900"
              />
            </form>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="hidden md:block border-b border-gray-100 bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 flex items-center h-11">
          {NAV_ITEMS.map(item => (
            <div
              key={item.key}
              className="relative h-full flex items-center"
              onMouseEnter={() => item.hasMega && setMegaKey(item.key)}
              onMouseLeave={() => setMegaKey(null)}
            >
              <Link
                href={`/${locale}${item.href}`}
                className={`flex items-center gap-0.5 px-4 h-full text-sm font-semibold transition-colors border-b-2 ${
                  item.isSale
                    ? 'text-red-600 border-transparent hover:border-red-500'
                    : 'text-gray-700 border-transparent hover:text-luxury-900 hover:border-luxury-900'
                }`}
              >
                {tn(item.key as any)}
                {item.hasMega && <ChevronDown size={12} className="mt-0.5 opacity-60"/>}
              </Link>
              {item.hasMega && megaKey === item.key && (
                <MegaMenu category={item.key} locale={locale} onClose={() => setMegaKey(null)}/>
              )}
            </div>
          ))}
          <div className="ms-auto flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Shield size={12} className="text-green-600"/>Secure Shopping</span>
            <span className="flex items-center gap-1"><RotateCcw size={12} className="text-blue-600"/>Easy Returns</span>
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className={`absolute top-0 ${isRtl ? 'right-0' : 'left-0'} w-72 h-full bg-white shadow-xl overflow-y-auto`}
            onClick={e => e.stopPropagation()}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <span className="font-black text-lg text-luxury-900">NUX<span className="text-gold-500">STORE</span></span>
              <button onClick={() => setMobileOpen(false)}><X size={20}/></button>
            </div>
            <div className="py-2">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.key}
                  href={`/${locale}${item.href}`}
                  className={`flex items-center justify-between px-4 py-3 text-sm font-semibold border-b border-gray-50 ${
                    item.isSale ? 'text-red-600' : 'text-gray-800'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {tn(item.key as any)}
                  <ChevronDown size={14} className={`opacity-40 ${isRtl ? 'rotate-90' : '-rotate-90'}`}/>
                </Link>
              ))}
            </div>
            <div className="p-4 space-y-3">
              <Link href={`/${locale}/account`} className="flex items-center gap-3 text-sm text-gray-700">
                <User size={18}/> {t('account')}
              </Link>
              <button onClick={switchLocale} className="flex items-center gap-3 text-sm text-gray-700">
                <Globe size={18}/> {t('language')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Cart Drawer */}
      {cartOpen && <MiniCart onClose={() => setCartOpen()} locale={locale}/>}
    </header>
  );
}
