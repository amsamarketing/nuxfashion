'use client';
import Link from 'next/link';

const FALLBACK_BRANDS = [
  { slug: 'zara',       name: 'ZARA',         logo: '🔴' },
  { slug: 'hm',         name: 'H&M',          logo: '🔴' },
  { slug: 'nike',       name: 'Nike',         logo: '✔' },
  { slug: 'adidas',     name: 'Adidas',       logo: '⚡' },
  { slug: 'max-fashion',name: 'Max Fashion',  logo: '🌟' },
  { slug: 'splash',     name: 'Splash',       logo: '💧' },
  { slug: 'namshi',     name: 'Namshi',       logo: '🛍' },
  { slug: 'charles-keith', name: 'Charles & Keith', logo: '👠' },
  { slug: 'dune',       name: 'Dune London',  logo: '🌙' },
  { slug: 'polo',       name: 'Polo Ralph Lauren', logo: '🐎' },
  { slug: 'lacoste',    name: 'Lacoste',      logo: '🐊' },
  { slug: 'tommy',      name: 'Tommy Hilfiger', logo: '🚢' },
];

export default function BrandSlider({ locale,brands=[] }: { locale: string;brands?:any[] }) {
  const isRtl = locale === 'ar';
  const list=brands.length?brands.map(b=>({slug:b.id,name:isRtl?(b.name_ar||b.name):b.name,logo:b.logo_url||'✦'})):FALLBACK_BRANDS;
  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">{isRtl ? 'ماركات مميزة' : 'Featured Brands'}</h2>
        <Link href={`/${locale}/brands`} className="text-sm font-bold text-luxury-900 hover:text-gold-600 transition-colors">
          {isRtl ? 'كل الماركات ←' : 'All Brands →'}
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {list.map(brand => (
          <Link
            key={brand.slug}
            href={`/${locale}/brand/${brand.slug}`}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-md transition-all group"
          >
            {String(brand.logo).startsWith('http')?<img src={brand.logo} alt="" className="h-8 max-w-full object-contain"/>:<span className="text-2xl group-hover:scale-110 transition-transform">{brand.logo}</span>}
            <span className="text-xs font-bold text-gray-600 group-hover:text-luxury-900 text-center leading-tight">{brand.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
