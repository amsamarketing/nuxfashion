'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Zap } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import toast from 'react-hot-toast';
import type { Product } from '../product/ProductCard';

function useCountdown(endMs: number) {
  const [left, setLeft] = useState(endMs - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(endMs - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endMs]);
  const s = Math.max(0, Math.floor(left / 1000));
  return {
    h: String(Math.floor(s / 3600)).padStart(2, '0'),
    m: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    s: String(s % 60).padStart(2, '0'),
  };
}

const END_TIME = Date.now() + 6 * 60 * 60 * 1000; // 6 hours from now

export default function FlashDeals({ locale, products }: { locale: string; products: Product[] }) {
  const isRtl = locale === 'ar';
  const timer = useCountdown(END_TIME);
  const addItem = useCartStore(s => s.addItem);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white fill-white"/>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              {isRtl ? 'عروض سريعة' : 'Flash Deals'}
            </h2>
            <p className="text-white/60 text-xs">{isRtl ? 'عروض لا تُفوَّت!' : "Don't miss these deals!"}</p>
          </div>
        </div>
        {/* Countdown */}
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm font-medium">{isRtl ? 'ينتهي خلال:' : 'Ends in:'}</span>
          <div className="flex items-center gap-1">
            {[timer.h, timer.m, timer.s].map((val, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="countdown-block">
                  <span className="text-lg font-black leading-none">{val}</span>
                  <span className="text-[8px] text-white/60 uppercase">{['H','M','S'][i]}</span>
                </div>
                {i < 2 && <span className="text-white font-black text-xl leading-none mb-1">:</span>}
              </div>
            ))}
          </div>
        </div>
        <Link href={`/${locale}/flash-deals`} className="text-gold-400 hover:text-gold-300 text-sm font-bold transition-colors">
          {isRtl ? 'عرض الكل ←' : 'See All →'}
        </Link>
      </div>

      {/* Products */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(p => {
          const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 30;
          const pct = Math.random() * 0.4 + 0.3; // 30-70% sold
          return (
            <Link key={p.id} href={`/${locale}/product/${p.slug}`}
              className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 transition-all group border border-white/10 hover:border-white/30">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-3">
                {p.image && <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300"/>}
                <div className="absolute top-2 start-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  -{discount}%
                </div>
              </div>
              <p className="text-white text-xs font-semibold line-clamp-2 mb-2">{isRtl ? p.nameAr : p.name}</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gold-400 font-black text-sm">SAR {p.price.toFixed(0)}</span>
                {p.originalPrice && <span className="text-white/40 line-through text-xs">SAR {p.originalPrice.toFixed(0)}</span>}
              </div>
              {/* Progress bar */}
              <div className="mb-2">
                <div className="text-[10px] text-white/50 mb-1">{isRtl ? `تم بيع ${Math.round(pct*100)}%` : `${Math.round(pct*100)}% sold`}</div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full" style={{ width: `${pct*100}%` }}/>
                </div>
              </div>
              <button
                onClick={e => { e.preventDefault(); addItem({...p, variantId: p.id, sku: p.id, stock: 10}); toast.success(isRtl ? 'أُضيف ✓' : 'Added ✓', {duration:1500}); }}
                className="w-full bg-gold-500 hover:bg-gold-400 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                {isRtl ? 'أضف للسلة' : 'Add to Cart'}
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
