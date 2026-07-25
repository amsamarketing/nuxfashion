'use client';
import Link from 'next/link';

export default function SeasonalCampaign({ locale, config = {} }: { locale: string; config?: any }) {
  const isRtl = locale === 'ar';
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-luxury-900 via-purple-950 to-luxury-900 py-20 my-8 bg-cover bg-center" style={config.seasonal_image?{backgroundImage:`linear-gradient(90deg,rgba(15,23,42,.9),rgba(59,7,100,.75)),url(${config.seasonal_image})`}:undefined} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl"/>
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl"/>
      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 rounded-full px-4 py-1.5 text-gold-400 text-xs font-bold mb-6 tracking-widest uppercase">
          🌙 {isRtl ? 'مجموعة رمضان 2026' : 'Ramadan Collection 2026'}
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-white mb-4">
          {isRtl ? (config.seasonal_title_ar||'تألق في الموسم') : (config.seasonal_title||'Dress for the Season')}
        </h2>
        <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto mb-8">
          {isRtl ? (config.seasonal_subtitle_ar||'اكتشف أحدث تشكيلاتنا الموسمية.') : (config.seasonal_subtitle||'Discover our latest seasonal edit.')}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href={`/${locale}${config.seasonal_button_link||'/category/all'}`}
            className="bg-gold-500 hover:bg-gold-400 text-white font-bold px-8 py-3.5 rounded-full transition-all hover:scale-105">
            {isRtl ? (config.seasonal_button_label_ar||'تسوق المجموعة') : (config.seasonal_button_label||'Shop Collection')}
          </Link>
          <Link href={`/${locale}/collections`}
            className="border border-white/30 text-white hover:bg-white/10 font-bold px-8 py-3.5 rounded-full transition-all">
            {isRtl ? 'كل المجموعات' : 'All Collections'}
          </Link>
        </div>
        {/* Campaign tags */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {(isRtl
            ? ['رمضان', 'اليوم الوطني', 'موسم الرياض', 'العيد', 'صيف 2026', 'الشتاء']
            : ['Ramadan', 'National Day', 'Riyadh Season', 'Eid', 'Summer 2026', 'Winter']
          ).map(tag => (
            <span key={tag} className="bg-white/10 border border-white/20 text-white/70 text-xs px-3 py-1 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
