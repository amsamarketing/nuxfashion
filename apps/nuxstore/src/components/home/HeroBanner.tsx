'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Fallback slides shown when no banners are configured in the ERP */
const FALLBACK_SLIDES = [
  {
    id: 'fallback-1',
    titleEn: 'New Collection 2026',
    titleAr: 'مجموعة 2026 الجديدة',
    subtitleEn: 'Discover our exclusive collection crafted for the modern Saudi shopper',
    subtitleAr: 'اكتشف مجموعتنا الحصرية المصممة للمتسوق السعودي العصري',
    ctaEn: 'Shop Now',   ctaAr: 'تسوق الآن',
    ctaLink: '/category/all',
    bg: 'from-luxury-900 via-luxury-800 to-luxury-700',
    accent: '#f59e0b',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  },
  {
    id: 'fallback-2',
    titleEn: 'Flash Sale — Up to 70% OFF',
    titleAr: 'عروض سريعة — خصم حتى 70%',
    subtitleEn: 'Shop thousands of styles at unbeatable prices. Limited time only.',
    subtitleAr: 'تسوق آلاف القطع بأسعار لا تُضاهى. لفترة محدودة فقط.',
    ctaEn: 'Shop Sale', ctaAr: 'تسوق العروض',
    ctaLink: '/category/all',
    bg: 'from-red-900 via-red-800 to-orange-800',
    accent: '#fbbf24',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=600&fit=crop',
  },
];

interface ApiBanner {
  id: string;
  title: string;
  title_ar?: string;
  subtitle?: string;
  subtitle_ar?: string;
  kicker?: string;
  image_url?: string;
  mobile_image_url?: string;
  image_url_ar?: string;
  mobile_image_url_ar?: string;
  button_label?: string;
  button_label_ar?: string;
  button_link?: string;
  text_position?: string;
}

interface Props {
  locale: string;
  banners?: ApiBanner[];
  autoplaySeconds?: number;
}

export default function HeroBanner({ locale, banners = [], autoplaySeconds = 5 }: Props) {
  const isRtl = locale === 'ar';
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Use real banners from API if available, else fallback
  const slides = banners.length > 0 ? banners : FALLBACK_SLIDES;

  const next = useCallback(() => setActive(a => (a + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setActive(a => (a - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(next, Math.max(1, autoplaySeconds) * 1000);
    return () => clearInterval(t);
  }, [next, paused, slides.length, autoplaySeconds]);

  const slide = slides[active];

  // Normalise real API banner OR fallback slide
  const title   = isRtl ? ((slide as any).title_ar || (slide as any).titleAr || (slide as any).title || (slide as any).titleEn) : ((slide as any).title || (slide as any).titleEn);
  const sub     = isRtl ? ((slide as any).subtitle_ar || (slide as any).subtitleAr || (slide as any).subtitle || (slide as any).subtitleEn) : ((slide as any).subtitle || (slide as any).subtitleEn);
  const cta     = isRtl ? ((slide as any).button_label_ar || (slide as any).ctaAr || 'تسوق الآن') : ((slide as any).button_label || (slide as any).ctaEn || 'Shop Now');
  const ctaLink = (slide as any).button_link || (slide as any).ctaLink || '/category/all';
  const desktopImg = isRtl ? ((slide as any).image_url_ar || (slide as any).image_url || '') : ((slide as any).image_url || '');
  const mobileImg = isRtl ? ((slide as any).mobile_image_url_ar || (slide as any).image_url_ar || (slide as any).mobile_image_url || desktopImg) : ((slide as any).mobile_image_url || desktopImg);
  const bg      = (slide as any).bg || 'from-luxury-900 via-luxury-800 to-luxury-700';
  const accent  = (slide as any).accent || '#f59e0b';

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${bg} transition-all duration-700`}
      dir={isRtl ? 'rtl' : 'ltr'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ minHeight: 420 }}
    >
      {desktopImg && (
        <picture className="absolute inset-0">
          <source media="(max-width: 767px)" srcSet={mobileImg}/>
          <img src={desktopImg} alt="" className="h-full w-full object-cover"/>
        </picture>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent rtl:bg-gradient-to-l"/>
      <div className="absolute -end-20 -top-20 w-80 h-80 rounded-full opacity-10" style={{ background: accent }}/>
      <div className="absolute -start-10 -bottom-10 w-60 h-60 rounded-full opacity-5" style={{ background: accent }}/>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 text-white">
          {(slide as any).kicker && (
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full border"
              style={{ color: accent, borderColor: accent + '44', background: accent + '11' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }}/>
              {(slide as any).kicker}
            </div>
          )}
          <h1 className="text-5xl md:text-7xl font-black leading-none mb-6">{title}</h1>
          {sub && <p className="text-white/70 text-sm md:text-base max-w-md mb-8 leading-relaxed">{sub}</p>}
          <Link href={`/${locale}${ctaLink.startsWith('/') ? ctaLink : '/' + ctaLink}`}
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: accent, color: '#fff' }}>
            {cta}
          </Link>
        </div>
        <div className="hidden md:block flex-1"/>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute start-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all backdrop-blur-sm">
            {isRtl ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
          </button>
          <button onClick={next} className="absolute end-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all backdrop-blur-sm">
            {isRtl ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                className="rounded-full transition-all duration-300"
                style={{ width: i===active ? 24 : 8, height: 8, background: i===active ? accent : 'rgba(255,255,255,0.4)' }}/>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
