'use client';
import Link from 'next/link';

// You can wire these up dynamically from your API / CMS
const MEGA_DATA: Record<string, { title: string; titleAr: string; items: { label: string; labelAr: string; href: string }[] }[]> = {
  women: [
    {
      title: 'Clothing', titleAr: 'ملابس',
      items: [
        { label: 'Dresses', labelAr: 'فساتين', href: '/category/women/dresses' },
        { label: 'Abayas', labelAr: 'عبايات', href: '/category/women/abayas' },
        { label: 'Tops & Blouses', labelAr: 'بلوزات', href: '/category/women/tops' },
        { label: 'Pants & Trousers', labelAr: 'بناطيل', href: '/category/women/pants' },
        { label: 'Skirts', labelAr: 'تنانير', href: '/category/women/skirts' },
        { label: 'Coats & Jackets', labelAr: 'معاطف', href: '/category/women/coats' },
      ],
    },
    {
      title: 'Shoes', titleAr: 'أحذية',
      items: [
        { label: 'Heels', labelAr: 'كعب عالي', href: '/category/women/heels' },
        { label: 'Flats', labelAr: 'مسطح', href: '/category/women/flats' },
        { label: 'Sneakers', labelAr: 'رياضي', href: '/category/women/sneakers' },
        { label: 'Sandals', labelAr: 'صنادل', href: '/category/women/sandals' },
        { label: 'Boots', labelAr: 'بوت', href: '/category/women/boots' },
      ],
    },
    {
      title: 'Bags & Accessories', titleAr: 'حقائب وإكسسوارات',
      items: [
        { label: 'Handbags', labelAr: 'حقائب يد', href: '/category/women/handbags' },
        { label: 'Jewellery', labelAr: 'مجوهرات', href: '/category/women/jewellery' },
        { label: 'Sunglasses', labelAr: 'نظارات', href: '/category/women/sunglasses' },
        { label: 'Scarves', labelAr: 'وشاح', href: '/category/women/scarves' },
        { label: 'Belts', labelAr: 'أحزمة', href: '/category/women/belts' },
      ],
    },
    {
      title: 'Featured', titleAr: 'مميز',
      items: [
        { label: 'New Arrivals', labelAr: 'وصل حديثاً', href: '/new-arrivals?gender=women' },
        { label: 'Best Sellers', labelAr: 'الأكثر مبيعاً', href: '/best-sellers?gender=women' },
        { label: 'Sale', labelAr: 'تخفيضات', href: '/sale?gender=women' },
        { label: 'Ramadan Edit', labelAr: 'تشكيلة رمضان', href: '/collections/ramadan' },
      ],
    },
  ],
  men: [
    {
      title: 'Clothing', titleAr: 'ملابس',
      items: [
        { label: 'T-Shirts & Polos', labelAr: 'تيشيرت وبولو', href: '/category/men/tshirts' },
        { label: 'Shirts', labelAr: 'قمصان', href: '/category/men/shirts' },
        { label: 'Thobes', labelAr: 'ثياب', href: '/category/men/thobes' },
        { label: 'Pants & Chinos', labelAr: 'بناطيل', href: '/category/men/pants' },
        { label: 'Jeans', labelAr: 'جينز', href: '/category/men/jeans' },
        { label: 'Jackets', labelAr: 'جاكيت', href: '/category/men/jackets' },
      ],
    },
    {
      title: 'Shoes', titleAr: 'أحذية',
      items: [
        { label: 'Sneakers', labelAr: 'رياضي', href: '/category/men/sneakers' },
        { label: 'Formal Shoes', labelAr: 'رسمي', href: '/category/men/formal' },
        { label: 'Sandals', labelAr: 'صنادل', href: '/category/men/sandals' },
        { label: 'Boots', labelAr: 'بوت', href: '/category/men/boots' },
        { label: 'Sports', labelAr: 'رياضي', href: '/category/men/sports-shoes' },
      ],
    },
    {
      title: 'Accessories', titleAr: 'إكسسوارات',
      items: [
        { label: 'Watches', labelAr: 'ساعات', href: '/category/men/watches' },
        { label: 'Sunglasses', labelAr: 'نظارات', href: '/category/men/sunglasses' },
        { label: 'Wallets', labelAr: 'محافظ', href: '/category/men/wallets' },
        { label: 'Bags', labelAr: 'حقائب', href: '/category/men/bags' },
        { label: 'Belts', labelAr: 'أحزمة', href: '/category/men/belts' },
      ],
    },
    {
      title: 'Featured', titleAr: 'مميز',
      items: [
        { label: 'New Arrivals', labelAr: 'وصل حديثاً', href: '/new-arrivals?gender=men' },
        { label: 'Best Sellers', labelAr: 'الأكثر مبيعاً', href: '/best-sellers?gender=men' },
        { label: 'Sale', labelAr: 'تخفيضات', href: '/sale?gender=men' },
        { label: 'National Day Edit', labelAr: 'تشكيلة اليوم الوطني', href: '/collections/national-day' },
      ],
    },
  ],
  kids: [
    {
      title: 'Girls', titleAr: 'بنات',
      items: [
        { label: 'Dresses', labelAr: 'فساتين', href: '/category/kids/girls-dresses' },
        { label: 'Tops', labelAr: 'توبات', href: '/category/kids/girls-tops' },
        { label: 'Shoes', labelAr: 'أحذية', href: '/category/kids/girls-shoes' },
      ],
    },
    {
      title: 'Boys', titleAr: 'أولاد',
      items: [
        { label: 'T-Shirts', labelAr: 'تيشيرت', href: '/category/kids/boys-tshirts' },
        { label: 'Pants', labelAr: 'بناطيل', href: '/category/kids/boys-pants' },
        { label: 'Shoes', labelAr: 'أحذية', href: '/category/kids/boys-shoes' },
      ],
    },
    {
      title: 'Baby', titleAr: 'رضع',
      items: [
        { label: 'Newborn', labelAr: 'حديث الولادة', href: '/category/kids/newborn' },
        { label: 'Baby Clothing', labelAr: 'ملابس أطفال', href: '/category/kids/baby-clothing' },
        { label: 'Baby Shoes', labelAr: 'أحذية أطفال', href: '/category/kids/baby-shoes' },
      ],
    },
    {
      title: 'Featured', titleAr: 'مميز',
      items: [
        { label: 'New Arrivals', labelAr: 'وصل حديثاً', href: '/new-arrivals?gender=kids' },
        { label: 'Back to School', labelAr: 'العودة للمدرسة', href: '/collections/back-to-school' },
      ],
    },
  ],
  beauty: [
    {
      title: 'Skincare', titleAr: 'العناية بالبشرة',
      items: [
        { label: 'Moisturisers', labelAr: 'مرطبات', href: '/category/beauty/moisturisers' },
        { label: 'Serums', labelAr: 'سيروم', href: '/category/beauty/serums' },
        { label: 'Sunscreen', labelAr: 'واقي شمس', href: '/category/beauty/sunscreen' },
        { label: 'Cleansers', labelAr: 'منظفات', href: '/category/beauty/cleansers' },
      ],
    },
    {
      title: 'Makeup', titleAr: 'مكياج',
      items: [
        { label: 'Foundation', labelAr: 'كريم أساس', href: '/category/beauty/foundation' },
        { label: 'Lipstick', labelAr: 'أحمر شفاه', href: '/category/beauty/lipstick' },
        { label: 'Mascara', labelAr: 'ماسكارا', href: '/category/beauty/mascara' },
        { label: 'Eyeshadow', labelAr: 'ظل عيون', href: '/category/beauty/eyeshadow' },
      ],
    },
    {
      title: 'Fragrance', titleAr: 'عطور',
      items: [
        { label: 'Perfumes', labelAr: 'عطور', href: '/category/beauty/perfumes' },
        { label: 'Oud', labelAr: 'عود', href: '/category/beauty/oud' },
        { label: 'Body Mist', labelAr: 'بخاخ جسم', href: '/category/beauty/body-mist' },
      ],
    },
    {
      title: 'Featured', titleAr: 'مميز',
      items: [
        { label: 'New Arrivals', labelAr: 'وصل حديثاً', href: '/new-arrivals?cat=beauty' },
        { label: 'Best Sellers', labelAr: 'الأكثر مبيعاً', href: '/best-sellers?cat=beauty' },
      ],
    },
  ],
};

interface Props {
  category: string;
  locale: string;
  onClose: () => void;
}

export default function MegaMenu({ category, locale, onClose }: Props) {
  const isRtl = locale === 'ar';
  const sections = MEGA_DATA[category] || [];

  return (
    <div
      className="absolute top-full start-0 z-50 w-screen max-w-4xl bg-white shadow-2xl border-t-2 border-luxury-900 rounded-b-xl animate-slide-down"
      dir={isRtl ? 'rtl' : 'ltr'}
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-4 gap-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="font-black text-xs uppercase tracking-widest text-luxury-900 mb-3 pb-1 border-b border-gold-200">
              {isRtl ? section.titleAr : section.title}
            </h4>
            <ul className="space-y-1.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${locale}${item.href}`}
                    className="text-sm text-gray-600 hover:text-luxury-900 hover:font-semibold transition-all"
                    onClick={onClose}
                  >
                    {isRtl ? item.labelAr : item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
