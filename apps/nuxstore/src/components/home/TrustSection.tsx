'use client';

const ITEMS = {
  en: [
    { icon: '🔒', title: 'Secure Payment', desc: 'Your data is always protected with 256-bit SSL encryption' },
    { icon: '✅', title: '100% Authentic', desc: 'All products are genuine and sourced directly from brands' },
    { icon: '🚚', title: 'Fast Delivery', desc: 'Same-day delivery in Riyadh, 2-4 days across Saudi Arabia' },
    { icon: '↩️', title: 'Easy Returns', desc: '15-day hassle-free returns — no questions asked' },
    { icon: '💬', title: '24/7 Support', desc: 'Chat, call, or WhatsApp us anytime' },
    { icon: '🏆', title: 'Loyalty Rewards', desc: 'Earn points on every purchase and redeem for discounts' },
  ],
  ar: [
    { icon: '🔒', title: 'دفع آمن', desc: 'بياناتك محمية دائماً بتشفير SSL 256-bit' },
    { icon: '✅', title: 'منتجات أصلية 100%', desc: 'جميع المنتجات أصلية ومصدرها مباشرة من الماركات' },
    { icon: '🚚', title: 'توصيل سريع', desc: 'توصيل في نفس اليوم بالرياض، 2-4 أيام في كل أنحاء المملكة' },
    { icon: '↩️', title: 'إرجاع سهل', desc: 'إرجاع مجاني خلال 15 يوم بدون أسئلة' },
    { icon: '💬', title: 'دعم 24/7', desc: 'تواصل معنا بالدردشة أو الهاتف أو واتساب في أي وقت' },
    { icon: '🏆', title: 'نقاط الولاء', desc: 'اكسب نقاطاً مع كل شراء واستبدلها بخصومات' },
  ],
};

export default function TrustSection({ locale,config={} }: { locale: string;config?:any }) {
  const isRtl = locale === 'ar';
  const custom=Array.isArray(config.trust_items)?config.trust_items:[];
  const items = custom.length?custom.map((x:any)=>({icon:x.icon||'✓',title:isRtl?(x.title_ar||x.title):x.title,desc:isRtl?(x.description_ar||x.description):x.description})):(ITEMS[locale as 'en' | 'ar'] || ITEMS.en);
  return (
    <section className="py-12 bg-gray-50" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="section-title text-center mb-8">{isRtl ? (config.trust_title_ar||'لماذا نوكس ستور؟') : (config.trust_title||'Why NuxStore?')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {items.map((item:any) => (
            <div key={item.title} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all flex gap-4">
              <span className="text-3xl flex-shrink-0">{item.icon}</span>
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
