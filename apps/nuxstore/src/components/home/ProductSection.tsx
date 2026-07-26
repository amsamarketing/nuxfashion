'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard, { type Product } from '../product/ProductCard';

interface Props {
  locale: string;
  titleEn: string;
  titleAr: string;
  products: Product[];
  viewAllHref: string;
  badge?: string;
  autoplaySeconds?: number;
}

export default function ProductSection({ locale, titleEn, titleAr, products, viewAllHref, badge, autoplaySeconds = 3 }: Props) {
  const isRtl = locale === 'ar';
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction:number) => rail.current?.scrollBy({left:direction * rail.current.clientWidth * .8,behavior:'smooth'});
  useEffect(()=>{if(products.length<5)return;const timer=setInterval(()=>{const el=rail.current;if(!el)return;const end=el.scrollLeft+el.clientWidth>=el.scrollWidth-12;if(end)el.scrollTo({left:0,behavior:'smooth'});else move(isRtl?-1:1)},Math.max(1,autoplaySeconds)*1000);return()=>clearInterval(timer)},[products.length,autoplaySeconds,isRtl]);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title flex items-center gap-2">
          {badge && <span>{badge}</span>}
          {isRtl ? titleAr : titleEn}
        </h2>
        <div className="flex items-center gap-2"><button aria-label="Previous" onClick={()=>move(isRtl?1:-1)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100"><ChevronLeft className="mx-auto" size={18}/></button><button aria-label="Next" onClick={()=>move(isRtl?-1:1)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100"><ChevronRight className="mx-auto" size={18}/></button><Link
          href={`/${locale}${viewAllHref}`}
          className="text-sm font-bold text-luxury-900 hover:text-gold-600 transition-colors border-b border-luxury-900 hover:border-gold-600 pb-0.5"
        >
          {isRtl ? 'عرض الكل ←' : 'See All →'}
        </Link></div>
      </div>
      <div ref={rail} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3" style={{scrollbarWidth:'none'}}>
        {products.map(p => (
          <div key={p.id} className="min-w-[72%] sm:min-w-[42%] md:min-w-[28%] lg:min-w-[22%] snap-start"><ProductCard product={p}/></div>
        ))}
      </div>
    </div>
  );
}
