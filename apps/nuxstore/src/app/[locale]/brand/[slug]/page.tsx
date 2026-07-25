'use client';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import ProductCard from '@/components/product/ProductCard';

const MOCK = Array.from({ length: 8 }, (_, i) => ({
  id: `b${i}`, slug: `brand-product-${i}`,
  name: `Brand Product ${i+1}`, nameAr: `منتج الماركة ${i+1}`,
  image: `https://images.unsplash.com/photo-${1558618666+i*60000}?w=400&h=533&fit=crop`,
  price: 100 + i * 40, originalPrice: 200 + i * 60,
  rating: 4.2 + (i*0.1 % 0.8),
  reviewCount: 30 + i * 20,
  brand: 'Brand', brandAr: 'ماركة',
  inStock: i !== 3,
}));

export default function BrandPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { slug } = useParams();
  const brandName = String(slug).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-br from-luxury-900 to-luxury-700 rounded-2xl p-10 text-center text-white mb-10">
        <div className="text-5xl mb-4">🏷</div>
        <h1 className="text-3xl font-black mb-2">{brandName}</h1>
        <p className="text-white/60 text-sm">{MOCK.length} {isRtl ? 'منتج' : 'products'}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MOCK.map(p => <ProductCard key={p.id} product={p as any}/>)}
      </div>
    </div>
  );
}
