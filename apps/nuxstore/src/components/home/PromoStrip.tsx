'use client';

interface Props {
  locale: string;
  announcement?: string;
  announcementAr?: string;
}

const FALLBACK = {
  en: [
    '🚚 Free Shipping on orders above SAR 200',
    '✨ New Arrivals Every Week',
    '🏷️ Up to 70% OFF in Summer Sale',
    '💎 Authentic Products Guaranteed',
    '🔄 Free Returns within 15 days',
    '📦 Same-day delivery in Riyadh',
  ],
  ar: [
    '🚚 شحن مجاني للطلبات فوق 200 ريال',
    '✨ وصولات جديدة كل أسبوع',
    '🏷️ خصم حتى 70% في تخفيضات الصيف',
    '💎 منتجات أصلية مضمونة',
    '🔄 إرجاع مجاني خلال 15 يوم',
    '📦 توصيل في نفس اليوم بالرياض',
  ],
};

export default function PromoStrip({ locale, announcement, announcementAr }: Props) {
  const isRtl = locale === 'ar';

  // Use API announcement if set, else fallback list
  const customMsg = isRtl ? (announcementAr || announcement) : announcement;
  const items: string[] = customMsg
    ? [customMsg, ...((FALLBACK as any)[locale] || FALLBACK.en).slice(1)]
    : ((FALLBACK as any)[locale] || FALLBACK.en);

  const doubled = [...items, ...items];

  return (
    <div className="bg-gold-500 overflow-hidden py-2.5" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`flex gap-10 whitespace-nowrap animate-marquee ${isRtl ? '[animation-direction:reverse]' : ''}`}>
        {doubled.map((item, i) => (
          <span key={i} className="text-white text-xs font-bold flex-shrink-0 flex items-center gap-1">
            {item}
            <span className="opacity-50 mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
