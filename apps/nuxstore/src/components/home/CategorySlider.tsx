'use client';
import Link from 'next/link';
import Image from 'next/image';

/** Icons + colors for known category slugs / names */
const CAT_META: Record<string, { icon: string; color: string; border: string }> = {
  women:     { icon: '👗', color: '#fdf2f8', border: '#f9a8d4' },
  men:       { icon: '👔', color: '#eff6ff', border: '#93c5fd' },
  kids:      { icon: '🧸', color: '#fffbeb', border: '#fcd34d' },
  beauty:    { icon: '💄', color: '#fdf4ff', border: '#d8b4fe' },
  sports:    { icon: '⚽', color: '#f0fdf4', border: '#86efac' },
  home:      { icon: '🏠', color: '#fff7ed', border: '#fdba74' },
  watches:   { icon: '⌚', color: '#f8fafc', border: '#cbd5e1' },
  bags:      { icon: '👜', color: '#fdf2f8', border: '#f9a8d4' },
  shoes:     { icon: '👟', color: '#eff6ff', border: '#93c5fd' },
  fragrance: { icon: '🌸', color: '#fdf4ff', border: '#d8b4fe' },
  sale:      { icon: '🏷️', color: '#fff1f2', border: '#fca5a5' },
  brands:    { icon: '⭐', color: '#fffbeb', border: '#fcd34d' },
  clothing:  { icon: '👕', color: '#eff6ff', border: '#93c5fd' },
  accessories: { icon: '💍', color: '#fdf4ff', border: '#d8b4fe' },
  default:   { icon: '🛍', color: '#f8fafc', border: '#cbd5e1' },
};

function getMeta(slug?: string, name?: string) {
  if (slug && CAT_META[slug]) return CAT_META[slug];
  const key = (name || '').toLowerCase().split(' ')[0];
  return CAT_META[key] || CAT_META.default;
}

interface ApiCategory {
  id: string;
  name: string;
  name_ar?: string;
  slug?: string;
  image_url?: string;
  product_count?: number;
}

interface Props {
  locale: string;
  categories?: ApiCategory[];
}

// Fallback static categories shown while API loads or if empty
const STATIC_CATS: ApiCategory[] = [
  { id: 'women',   name: 'Women',    name_ar: 'نساء',     slug: 'women' },
  { id: 'men',     name: 'Men',      name_ar: 'رجال',     slug: 'men' },
  { id: 'kids',    name: 'Kids',     name_ar: 'أطفال',    slug: 'kids' },
  { id: 'beauty',  name: 'Beauty',   name_ar: 'الجمال',   slug: 'beauty' },
  { id: 'sports',  name: 'Sports',   name_ar: 'رياضة',    slug: 'sports' },
  { id: 'shoes',   name: 'Shoes',    name_ar: 'أحذية',    slug: 'shoes' },
];

export default function CategorySlider({ locale, categories = [] }: Props) {
  const isRtl = locale === 'ar';
  const cats = categories.length > 0 ? categories : STATIC_CATS;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">{isRtl ? 'تسوق حسب الفئة' : 'Shop by Category'}</h2>
        <Link href={`/${locale}/category/all`} className="text-sm font-bold text-luxury-900 hover:text-gold-600 transition-colors">
          {isRtl ? 'عرض الكل ←' : 'See All →'}
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {cats.map(cat => {
          const meta = getMeta(cat.slug, cat.name);
          // href: use slug if available, else id
          const href = `/${locale}/category/${cat.slug || cat.id}`;
          const label = isRtl ? (cat.name_ar || cat.name) : cat.name;

          return (
            <Link key={cat.id} href={href} className="flex-shrink-0 snap-start flex flex-col items-center gap-2.5 group">
              <div
                className="w-28 h-28 md:w-40 md:h-40 rounded-full flex items-center justify-center border group-hover:scale-105 transition-all duration-300 group-hover:shadow-lg overflow-hidden"
                style={{ background: meta.color, borderColor: meta.border }}
              >
                {cat.image_url ? (
                  <Image src={cat.image_url} alt={label} width={80} height={80} className="object-cover w-full h-full" unoptimized/>
                ) : (
                  <span className="text-2xl md:text-3xl">{meta.icon}</span>
                )}
              </div>
              <span className="text-xs font-bold text-gray-700 group-hover:text-luxury-900 transition-colors whitespace-nowrap text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
