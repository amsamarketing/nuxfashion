'use client';
import Link from 'next/link';
import { useState } from 'react';
import ProductCard, { type Product } from '../product/ProductCard';

interface Props {
  locale: string;
  titleEn: string;
  titleAr: string;
  products: Product[];
  viewAllHref: string;
  badge?: string;
}

export default function ProductSection({ locale, titleEn, titleAr, products, viewAllHref, badge }: Props) {
  const isRtl = locale === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title flex items-center gap-2">
          {badge && <span>{badge}</span>}
          {isRtl ? titleAr : titleEn}
        </h2>
        <Link
          href={`/${locale}${viewAllHref}`}
          className="text-sm font-bold text-luxury-900 hover:text-gold-600 transition-colors border-b border-luxury-900 hover:border-gold-600 pb-0.5"
        >
          {isRtl ? 'عرض الكل ←' : 'See All →'}
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {products.map(p => (
          <ProductCard key={p.id} product={p}/>
        ))}
      </div>
    </div>
  );
}
