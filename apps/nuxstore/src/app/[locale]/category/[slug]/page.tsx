'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { SlidersHorizontal, Grid3x3, List, ChevronDown, X } from 'lucide-react';
import ProductCard, { type Product } from '@/components/product/ProductCard';
import { storefrontApi } from '@/lib/api';

const SIZES = ['XS','S','M','L','XL','XXL','3XL'];
const COLORS = ['#000','#fff','#c8a882','#1a1a2e','#ef4444','#22c55e','#3b82f6','#f59e0b'];

const SORT_EN = ['Recommended','Newest','Price: Low to High','Price: High to Low','Best Discount'];
const SORT_AR = ['الموصى به','الأحدث','السعر: من الأقل','السعر: من الأعلى','أعلى خصم'];

function mapProduct(p: any): Product {
  const v = p.variants?.[0] || {};
  const price = Number(v.selling_price || 0);
  const orig  = Number(v.compare_price  || 0);
  return {
    id: p.id, slug: p.id,
    name: p.name, nameAr: p.name_ar || p.name,
    image: p.image_url || '',
    price,
    originalPrice: orig > price ? orig : undefined,
    discount: orig > price ? Math.round((1 - price/orig)*100) : undefined,
    inStock: p.variants?.some((v2: any) => Number(v2.stock) > 0) ?? true,
    isNew: p.tags?.includes('new') ?? false,
    isBestSeller: p.tags?.includes('best-seller') ?? false,
    variantId: v.id,
    sku: v.sku,
    stock: p.variants?.reduce((s: number, v2: any) => s + Number(v2.stock||0), 0) ?? 99,
    colorOptions: [...new Set(p.variants?.map((v2: any) => v2.color).filter(Boolean))] as string[],
    sizeOptions: [...new Set(p.variants?.map((v2: any) => v2.size).filter(Boolean))] as string[],
  };
}

export default function CategoryPage() {
  const locale = useLocale();
  const { slug } = useParams();
  const isRtl = locale === 'ar';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState(0);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const categoryParam = String(slug) === 'all' ? undefined : String(slug);
    storefrontApi.getCatalog({ category: categoryParam })
      .then(data => {
        let mapped: Product[] = (data.products || []).map(mapProduct);
        // Client-side sort
        if (sort === 2) mapped = [...mapped].sort((a,b) => a.price - b.price);
        if (sort === 3) mapped = [...mapped].sort((a,b) => b.price - a.price);
        if (sort === 4) mapped = [...mapped].sort((a,b) => (b.discount||0) - (a.discount||0));
        // Price filter
        mapped = mapped.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
        // Size filter
        if (selectedSizes.length) mapped = mapped.filter(p => p.sizeOptions?.some(s => selectedSizes.includes(s)));
        setProducts(mapped);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug, sort, priceRange, selectedSizes]);

  const toggleArr = (arr: string[], val: string, set: (a: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const catLabel = String(slug).replace(/-/g,' ');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-4 flex items-center gap-1">
        <a href={`/${locale}`} className="hover:text-luxury-900">{isRtl ? 'الرئيسية' : 'Home'}</a>
        <span>/</span>
        <span className="text-gray-800 font-medium capitalize">{catLabel}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-luxury-900 capitalize">{catLabel}</h1>
          <p className="text-gray-400 text-sm">
            {loading ? '...' : `${products.length} ${isRtl ? 'منتج' : 'products'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFiltersOpen(!filtersOpen)}
            className="md:hidden flex items-center gap-1.5 text-sm font-bold border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50">
            <SlidersHorizontal size={14}/>{isRtl ? 'فلتر' : 'Filter'}
          </button>
          <div className="relative">
            <select value={sort} onChange={e => setSort(+e.target.value)}
              className="appearance-none border border-gray-200 rounded-full px-4 py-2 pe-8 text-sm font-medium focus:outline-none focus:border-luxury-900 bg-white cursor-pointer">
              {(isRtl ? SORT_AR : SORT_EN).map((o,i) => <option key={i} value={i}>{o}</option>)}
            </select>
            <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          </div>
          <div className="hidden md:flex border border-gray-200 rounded-full p-0.5">
            <button onClick={() => setView('grid')} className={`p-2 rounded-full transition-colors ${view==='grid' ? 'bg-luxury-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}><Grid3x3 size={14}/></button>
            <button onClick={() => setView('list')} className={`p-2 rounded-full transition-colors ${view==='list' ? 'bg-luxury-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}><List size={14}/></button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`w-64 flex-shrink-0 sticky top-20 self-start ${filtersOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-luxury-900">{isRtl ? 'الفلاتر' : 'Filters'}</h3>
              <button onClick={() => { setSelectedSizes([]); setSelectedColors([]); setPriceRange([0,5000]); }}
                className="text-xs text-gold-600 hover:underline">{isRtl ? 'مسح الكل' : 'Clear All'}</button>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-800 mb-3">{isRtl ? 'نطاق السعر' : 'Price Range'}</h4>
              <div className="flex gap-2">
                <input type="number" value={priceRange[0]} onChange={e => setPriceRange([+e.target.value, priceRange[1]])}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Min"/>
                <input type="number" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], +e.target.value])}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Max"/>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-800 mb-3">{isRtl ? 'المقاس' : 'Size'}</h4>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(s => (
                  <button key={s} onClick={() => toggleArr(selectedSizes, s, setSelectedSizes)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedSizes.includes(s) ? 'bg-luxury-900 text-white border-luxury-900' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-800 mb-3">{isRtl ? 'اللون' : 'Color'}</h4>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => toggleArr(selectedColors, c, setSelectedColors)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColors.includes(c) ? 'scale-125 border-luxury-900' : 'border-gray-200 hover:scale-110'}`}
                    style={{ background: c }}/>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products */}
        <main className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({length: 6}).map((_,i) => (
                <div key={i} className="bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse"/>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🛍</div>
              <p className="font-medium">{isRtl ? 'لا توجد منتجات' : 'No products found'}</p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p}/>)}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => <ProductCard key={p.id} product={p} layout="list"/>)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
