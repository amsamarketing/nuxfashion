'use client';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Search } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';

const MOCK = Array.from({ length: 12 }, (_, i) => ({
  id: `s${i}`, slug: `search-result-${i}`,
  name: `Search Result ${i+1}`, nameAr: `نتيجة بحث ${i+1}`,
  image: `https://images.unsplash.com/photo-${1558618666+i*80000}?w=400&h=533&fit=crop`,
  price: 90 + i * 25, originalPrice: 180 + i * 40,
  rating: 4 + Math.random() * 0.9,
  reviewCount: 20 + i * 15,
  brand: ['Nike','Zara','H&M'][i%3], brandAr: ['نايكي','زارا','إتش آند إم'][i%3],
  inStock: true,
}));

export default function SearchPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const q = useSearchParams().get('q') || '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-6">
        <Search size={20} className="text-gray-400"/>
        <div>
          <h1 className="text-xl font-black text-luxury-900">
            {isRtl ? `نتائج البحث عن "${q}"` : `Search results for "${q}"`}
          </h1>
          <p className="text-sm text-gray-400">{MOCK.length} {isRtl ? 'نتيجة' : 'results'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MOCK.map(p => <ProductCard key={p.id} product={p as any}/>)}
      </div>
    </div>
  );
}
