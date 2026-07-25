'use client';
import Link from 'next/link';
import Image from 'next/image';

const BANNERS = [
  {
    titleEn: "Women's Edit",     titleAr: "تشكيلة المرأة",
    subEn: "New season, new you", subAr: "موسم جديد، أنتِ جديدة",
    ctaEn: "Shop Women",          ctaAr: "تسوقي الآن",
    href: '/category/women',
    bg: 'from-pink-100 to-rose-50',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=300&fit=crop',
    accent: '#e11d48',
  },
  {
    titleEn: "Men's Collection",  titleAr: "مجموعة الرجال",
    subEn: "Style meets comfort",  subAr: "الأناقة تلتقي بالراحة",
    ctaEn: "Shop Men",             ctaAr: "تسوق الآن",
    href: '/category/men',
    bg: 'from-blue-50 to-indigo-50',
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&h=300&fit=crop',
    accent: '#1d4ed8',
  },
];

export default function BannerRow({ locale, config = {} }: { locale: string; config?: any }) {
  const isRtl = locale === 'ar';
  const banners = [
    {...BANNERS[0],titleEn:config.promo_card_1_title||BANNERS[0].titleEn,titleAr:config.promo_card_1_title_ar||BANNERS[0].titleAr,subEn:config.promo_card_1_subtitle||BANNERS[0].subEn,image:config.promo_card_1_image||BANNERS[0].image,href:config.promo_card_1_link||BANNERS[0].href},
    {...BANNERS[1],titleEn:config.promo_card_2_title||BANNERS[1].titleEn,titleAr:config.promo_card_2_title_ar||BANNERS[1].titleAr,subEn:config.promo_card_2_subtitle||BANNERS[1].subEn,image:config.promo_card_2_image||BANNERS[1].image,href:config.promo_card_2_link||BANNERS[1].href},
  ];
  return (
    <div className="grid md:grid-cols-2 gap-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {banners.map(b => (
        <Link
          key={b.href}
          href={`/${locale}${b.href}`}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.bg} p-6 md:p-8 group min-h-[160px] flex flex-col justify-between`}
        >
          <div className="absolute inset-0 opacity-20">
            <Image src={b.image} alt="" fill className="object-cover"/>
          </div>
          <div className="relative z-10">
            <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-1">{isRtl ? b.titleAr : b.titleEn}</h3>
            <p className="text-gray-600 text-sm">{isRtl ? b.subAr : b.subEn}</p>
          </div>
          <div className="relative z-10 mt-4">
            <span
              className="inline-flex items-center gap-1 text-sm font-bold px-5 py-2.5 rounded-full text-white transition-all group-hover:scale-105"
              style={{ background: b.accent }}
            >
              {isRtl ? b.ctaAr : b.ctaEn}
              <span className="group-hover:translate-x-1 transition-transform">{isRtl ? '←' : '→'}</span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
