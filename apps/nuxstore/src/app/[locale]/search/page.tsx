'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Search } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { storefrontApi } from '@/lib/api';

function mapProduct(p:any){const v=p.variants?.[0]||{};const price=Number(v.selling_price||0),original=Number(v.compare_price||0);return {id:p.id,slug:p.id,name:p.name,nameAr:p.name_ar||p.name,image:p.image_url||'',price,originalPrice:original>price?original:undefined,discount:original>price?Math.round((1-price/original)*100):undefined,brand:p.brand_name,brandAr:p.brand_name_ar,inStock:p.variants?.some((x:any)=>Number(x.stock)>0)??true,variantId:v.id,sku:v.sku,stock:p.variants?.reduce((s:number,x:any)=>s+Number(x.stock||0),0)||0}}

export default function SearchPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const q = useSearchParams().get('q') || '';
  const [products,setProducts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;setLoading(true);setError('');storefrontApi.getCatalog(q?{search:q}:undefined).then(data=>{if(active)setProducts((data.products||[]).map(mapProduct))}).catch((e:any)=>{if(active){setProducts([]);setError(e?.message||'Search could not be loaded')}}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[q]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-6">
        <Search size={20} className="text-gray-400"/>
        <div>
          <h1 className="text-xl font-black text-luxury-900">
            {isRtl ? `نتائج البحث عن "${q}"` : `Search results for "${q}"`}
          </h1>
          <p className="text-sm text-gray-400">{loading?'…':products.length} {isRtl ? 'نتيجة' : 'results'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(p => <ProductCard key={p.id} product={p}/>)}
      </div>
      {!loading&&!error&&!products.length&&<div className="py-20 text-center text-gray-500">{isRtl?'لم يتم العثور على منتجات':'No matching products found'}</div>}
      {error&&<div className="py-20 text-center text-red-600">{error}</div>}
    </div>
  );
}
