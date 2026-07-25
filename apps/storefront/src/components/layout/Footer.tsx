'use client';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Instagram, Twitter, Facebook, Youtube, MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <footer className="bg-luxury-900 text-gray-300" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Trust badges */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '🚚', title: locale === 'ar' ? 'شحن مجاني' : 'Free Shipping', sub: locale === 'ar' ? 'فوق 200 ريال' : 'On orders above SAR 200' },
            { icon: '↩️', title: locale === 'ar' ? 'إرجاع سهل' : 'Easy Returns', sub: locale === 'ar' ? 'خلال 15 يوم' : 'Within 15 days' },
            { icon: '🔒', title: locale === 'ar' ? 'دفع آمن' : 'Secure Payment', sub: locale === 'ar' ? 'مشفر 100%' : '100% encrypted' },
            { icon: '✅', title: locale === 'ar' ? 'منتجات أصلية' : 'Genuine Products', sub: locale === 'ar' ? 'ضمان الأصالة' : 'Authenticity guaranteed' },
          ].map(b => (
            <div key={b.title} className="flex items-center gap-3">
              <span className="text-2xl">{b.icon}</span>
              <div>
                <div className="text-white font-bold text-sm">{b.title}</div>
                <div className="text-xs text-gray-400">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-white/10 bg-luxury-800">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-white font-black text-xl mb-1">{t('newsletter_title')}</h3>
            <p className="text-gray-400 text-sm">{t('newsletter_sub')}</p>
          </div>
          <form className="flex gap-2 w-full md:w-auto" onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder={t('newsletter_placeholder')}
              className="flex-1 md:w-72 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-gray-400 outline-none focus:border-gold-400"
            />
            <button className="bg-gold-500 hover:bg-gold-400 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors whitespace-nowrap">
              {t('newsletter_btn')}
            </button>
          </form>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">N</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight">NUX<span className="text-gold-400">STORE</span></span>
          </div>
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            {locale === 'ar'
              ? 'وجهتك الأولى للموضة والأناقة في المملكة العربية السعودية'
              : 'Your premier fashion destination in Saudi Arabia'}
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-center gap-2"><MapPin size={13}/>{locale === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}</div>
            <div className="flex items-center gap-2"><Phone size={13}/>920 000 0000</div>
            <div className="flex items-center gap-2"><Mail size={13}/>hello@nuxstore.sa</div>
          </div>
        </div>

        {/* Customer Service */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
            {locale === 'ar' ? 'خدمة العملاء' : 'Customer Service'}
          </h4>
          <ul className="space-y-2.5">
            {[
              [t('track'), `/${locale}/track`],
              [t('returns'), `/${locale}/returns`],
              [t('faq'), `/${locale}/faq`],
              [t('contact'), `/${locale}/contact`],
              [locale === 'ar' ? 'تتبع الشحنة' : 'Track Shipment', `/${locale}/shipment`],
            ].map(([label, href]) => (
              <li key={href}><Link href={href as string} className="text-sm text-gray-400 hover:text-gold-400 transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
            {locale === 'ar' ? 'الشركة' : 'Company'}
          </h4>
          <ul className="space-y-2.5">
            {[
              [t('about'), `/${locale}/about`],
              [t('careers'), `/${locale}/careers`],
              [t('press'), `/${locale}/press`],
              [t('blog'), `/${locale}/blog`],
              [locale === 'ar' ? 'متاجرنا' : 'Our Stores', `/${locale}/stores`],
            ].map(([label, href]) => (
              <li key={href}><Link href={href as string} className="text-sm text-gray-400 hover:text-gold-400 transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
            {locale === 'ar' ? 'قانوني' : 'Legal'}
          </h4>
          <ul className="space-y-2.5">
            {[
              [t('privacy'), `/${locale}/privacy`],
              [t('terms'), `/${locale}/terms`],
              [t('shipping_policy'), `/${locale}/shipping-policy`],
              [locale === 'ar' ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy', `/${locale}/cookies`],
              [locale === 'ar' ? 'إمكانية الوصول' : 'Accessibility', `/${locale}/accessibility`],
            ].map(([label, href]) => (
              <li key={href}><Link href={href as string} className="text-sm text-gray-400 hover:text-gold-400 transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Social + App */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t('follow')}</h4>
          <div className="flex gap-3 mb-6">
            {[
              { Icon: Instagram, href: 'https://instagram.com/nuxstore', color: 'hover:text-pink-400' },
              { Icon: Twitter, href: 'https://twitter.com/nuxstore', color: 'hover:text-sky-400' },
              { Icon: Facebook, href: 'https://facebook.com/nuxstore', color: 'hover:text-blue-400' },
              { Icon: Youtube, href: 'https://youtube.com/nuxstore', color: 'hover:text-red-400' },
            ].map(({ Icon, href, color }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                className={`w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-gray-400 ${color} hover:bg-white/20 transition-all`}>
                <Icon size={16}/>
              </a>
            ))}
          </div>
          <h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">{t('app_title')}</h4>
          <div className="space-y-2">
            <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors">
              <span className="text-lg">🍎</span>
              <div className="text-xs"><div className="text-gray-400">Download on the</div><div className="text-white font-bold">App Store</div></div>
            </a>
            <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors">
              <span className="text-lg">▶</span>
              <div className="text-xs"><div className="text-gray-400">Get it on</div><div className="text-white font-bold">Google Play</div></div>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 text-center md:text-start">
            <div>{t('rights')}</div>
            <div>{t('vat')}</div>
          </div>
          {/* Payment icons */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['VISA', 'MC', 'MADA', 'AMEX', 'TABBY', 'TAMARA', 'STC', 'APPLE PAY'].map(p => (
              <span key={p} className="bg-white/10 text-gray-300 text-[10px] font-bold px-2 py-1 rounded border border-white/10">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
