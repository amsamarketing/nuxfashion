'use client';

export default function AppDownload({ locale,appStoreUrl,googlePlayUrl }: { locale: string;appStoreUrl?:string;googlePlayUrl?:string }) {
  const isRtl = locale === 'ar';
  return (
    <section className="bg-gradient-to-br from-luxury-900 to-luxury-700 py-16" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 text-white">
          <div className="text-gold-400 text-xs font-bold tracking-widest uppercase mb-3">📱 {isRtl ? 'تطبيق نكس ستور' : 'NuxStore App'}</div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            {isRtl ? 'تسوقي أينما كنتِ' : 'Shop Anywhere, Anytime'}
          </h2>
          <p className="text-white/70 text-sm mb-6 max-w-md">
            {isRtl
              ? 'حمّلي التطبيق للحصول على عروض حصرية، إشعارات فورية، وتجربة تسوق سلسة'
              : 'Download the app for exclusive deals, instant notifications, and seamless shopping'}
          </p>
          <div className="flex flex-wrap gap-3">
            {appStoreUrl&&<a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white text-luxury-900 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors">
              <span className="text-2xl">🍎</span>
              <div><div className="text-[10px] text-gray-500">Download on the</div><div className="font-bold text-sm">App Store</div></div>
            </a>}
            {googlePlayUrl&&<a href={googlePlayUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white text-luxury-900 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors">
              <span className="text-2xl">▶️</span>
              <div><div className="text-[10px] text-gray-500">Get it on</div><div className="font-bold text-sm">Google Play</div></div>
            </a>}
          </div>
          <div className="flex gap-6 mt-6">
            {[['4.8★', isRtl ? 'تقييم التطبيق' : 'App Rating'], ['1M+', isRtl ? 'تحميل' : 'Downloads'], ['50K+', isRtl ? 'تقييم' : 'Reviews']].map(([val, lab]) => (
              <div key={lab}><div className="text-gold-400 font-black text-lg">{val}</div><div className="text-white/50 text-xs">{lab}</div></div>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-48 h-96 bg-white/10 rounded-3xl border border-white/20 flex items-center justify-center">
            <span className="text-6xl">📱</span>
          </div>
        </div>
      </div>
    </section>
  );
}
