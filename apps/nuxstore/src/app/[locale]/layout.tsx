import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { storefrontApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'NuxStore – Premium Fashion Saudi Arabia', template: '%s | NuxStore' },
  description: 'Shop the latest fashion for women, men and kids in Saudi Arabia. Free shipping on orders above SAR 200.',
  keywords: ['fashion', 'clothing', 'Saudi Arabia', 'online shopping', 'KSA'],
  openGraph: { type: 'website', locale: 'en_US', siteName: 'NuxStore' },
};

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) notFound();
  const messages = await getMessages();
  const isRtl = locale === 'ar';
  let storeConfig:any={};try{storeConfig=await storefrontApi.getConfig()}catch{}
  const theme = storeConfig?.storefront_theme || 'luxury';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={inter.variable} data-theme={theme}>
      <head>
        {isRtl && (
          <link
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;900&display=swap"
            rel="stylesheet"
          />
        )}
      </head>
      <body className={`${isRtl ? 'font-arabic' : 'font-sans'} antialiased bg-white text-gray-900`}>
        <NextIntlClientProvider messages={messages}>
          <Header/>
          <main className="min-h-screen">{children}</main>
          <Footer config={storeConfig}/>
          {/* Mobile Bottom Nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around py-2 px-4">
            <a href={`/${locale}`} className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-luxury-900">
              <span className="text-lg">🏠</span><span className="text-[10px] font-medium">{locale === 'ar' ? 'الرئيسية' : 'Home'}</span>
            </a>
            <a href={`/${locale}/search`} className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-luxury-900">
              <span className="text-lg">🔍</span><span className="text-[10px] font-medium">{locale === 'ar' ? 'بحث' : 'Search'}</span>
            </a>
            <a href={`/${locale}/wishlist`} className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-luxury-900">
              <span className="text-lg">♥</span><span className="text-[10px] font-medium">{locale === 'ar' ? 'مفضلة' : 'Wishlist'}</span>
            </a>
            <a href={`/${locale}/cart`} className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-luxury-900">
              <span className="text-lg">🛍</span><span className="text-[10px] font-medium">{locale === 'ar' ? 'سلة' : 'Cart'}</span>
            </a>
            <a href={`/${locale}/account`} className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-luxury-900">
              <span className="text-lg">👤</span><span className="text-[10px] font-medium">{locale === 'ar' ? 'حسابي' : 'Account'}</span>
            </a>
          </nav>
          <div className="h-16 md:hidden"/>
          <Toaster position={isRtl ? 'top-left' : 'top-right'} toastOptions={{ style: { fontFamily: isRtl ? 'Noto Sans Arabic, sans-serif' : 'inherit' } }}/>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
