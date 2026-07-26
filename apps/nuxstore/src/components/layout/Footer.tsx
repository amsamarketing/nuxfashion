'use client';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Instagram, Twitter, Facebook, Youtube, MapPin, Phone, Mail } from 'lucide-react';
import { useState } from 'react';
import { storefrontApi } from '@/lib/api';

export default function Footer({config={}}:{config?:any}) {
  const t = useTranslations('footer');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const [newsletterEmail,setNewsletterEmail]=useState('');
  const [newsletterState,setNewsletterState]=useState<'idle'|'loading'|'success'|'error'>('idle');
  const defaultsCustomer=[[t('track'),`/${locale}/track`],[t('returns'),`/${locale}/returns`],[t('faq'),`/${locale}/faq`],[t('contact'),`/${locale}/contact`],[locale==='ar'?'تتبع الشحنة':'Track Shipment',`/${locale}/shipment`]];
  const defaultsCompany=[[t('about'),`/${locale}/about`],[t('careers'),`/${locale}/careers`],[t('press'),`/${locale}/press`],[t('blog'),`/${locale}/blog`],[locale==='ar'?'متاجرنا':'Our Stores',`/${locale}/stores`]];
  const defaultsLegal=[[t('privacy'),`/${locale}/privacy`],[t('terms'),`/${locale}/terms`],[t('shipping_policy'),`/${locale}/shipping-policy`],[locale==='ar'?'سياسة ملفات تعريف الارتباط':'Cookie Policy',`/${locale}/cookies`],[locale==='ar'?'إمكانية الوصول':'Accessibility',`/${locale}/accessibility`]];
  const links=(value:any[],fallback:any[])=>Array.isArray(value)&&value.length?value.filter(x=>x.enabled!==false).map(x=>[isRtl?(x.label_ar||x.label):x.label,x.url?.replace('{locale}',locale)||'#']):fallback;

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
          <form className="flex flex-col gap-2 w-full md:w-auto" onSubmit={async e=>{e.preventDefault();setNewsletterState('loading');try{await storefrontApi.subscribe(newsletterEmail);setNewsletterEmail('');setNewsletterState('success')}catch{setNewsletterState('error')}}}>
            <div className="flex gap-2">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={e=>setNewsletterEmail(e.target.value)}
              placeholder={t('newsletter_placeholder')}
              className="flex-1 md:w-72 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-gray-400 outline-none focus:border-gold-400"
            />
            <button disabled={newsletterState==='loading'} className="bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors whitespace-nowrap">
              {newsletterState==='loading'?'…':t('newsletter_btn')}
            </button>
            </div>
            {newsletterState==='success'&&<p className="text-xs text-green-400">{isRtl?'تم الاشتراك بنجاح':'Subscription confirmed'}</p>}
            {newsletterState==='error'&&<p className="text-xs text-red-400">{isRtl?'تعذر الاشتراك. حاول مرة أخرى':'Could not subscribe. Please try again.'}</p>}
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
              ? (config.footer_about_ar||config.footer_about||'وجهتك الأولى للموضة والأناقة في المملكة العربية السعودية')
              : (config.footer_about||'Your premier fashion destination in Saudi Arabia')}
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-center gap-2"><MapPin size={13}/>{isRtl?(config.contact_address_ar||config.contact_address):(config.contact_address||'Riyadh, Saudi Arabia')}</div>
            <div className="flex items-center gap-2"><Phone size={13}/>{config.contact_phone||config.support_phone||'—'}</div>
            <div className="flex items-center gap-2"><Mail size={13}/>{config.contact_email||config.support_email||'—'}</div>
          </div>
        </div>

        {/* Customer Service */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
            {locale === 'ar' ? 'خدمة العملاء' : 'Customer Service'}
          </h4>
          <ul className="space-y-2.5">
            {links(config.footer_customer_links,defaultsCustomer).map(([label, href]) => (
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
            {links(config.footer_company_links,defaultsCompany).map(([label, href]) => (
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
            {links(config.footer_legal_links,defaultsLegal).map(([label, href]) => (
              <li key={href}><Link href={href as string} className="text-sm text-gray-400 hover:text-gold-400 transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Social + App */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t('follow')}</h4>
          <div className="flex gap-3 mb-6">
            {[
              { Icon: Instagram, href: config.instagram_url, color: 'hover:text-pink-400' },
              { Icon: Twitter, href: config.twitter_url, color: 'hover:text-sky-400' },
              { Icon: Facebook, href: config.facebook_url, color: 'hover:text-blue-400' },
              { Icon: Youtube, href: config.youtube_url, color: 'hover:text-red-400' },
            ].filter(x=>x.href).map(({ Icon, href, color }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                className={`w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-gray-400 ${color} hover:bg-white/20 transition-all`}>
                <Icon size={16}/>
              </a>
            ))}
          </div>
          {(config.app_store_url||config.google_play_url)&&<><h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">{t('app_title')}</h4>
          <div className="space-y-2">
            {config.app_store_url&&<a href={config.app_store_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors">
              <span className="text-lg">🍎</span>
              <div className="text-xs"><div className="text-gray-400">Download on the</div><div className="text-white font-bold">App Store</div></div>
            </a>}
            {config.google_play_url&&<a href={config.google_play_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors">
              <span className="text-lg">▶</span>
              <div className="text-xs"><div className="text-gray-400">Get it on</div><div className="text-white font-bold">Google Play</div></div>
            </a>}
          </div></>}
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 text-center md:text-start">
            <div>{isRtl?(config.footer_copyright_ar||t('rights')):(config.footer_copyright||t('rights'))}</div>
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
