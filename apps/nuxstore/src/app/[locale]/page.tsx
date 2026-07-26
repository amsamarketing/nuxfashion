import { getLocale } from 'next-intl/server';
import { storefrontApi } from '@/lib/api';
import HeroBanner from '@/components/home/HeroBanner';
import PromoStrip from '@/components/home/PromoStrip';
import CategorySlider from '@/components/home/CategorySlider';
import ProductSection from '@/components/home/ProductSection';
import FlashDeals from '@/components/home/FlashDeals';
import BrandSlider from '@/components/home/BrandSlider';
import BannerRow from '@/components/home/BannerRow';
import SeasonalCampaign from '@/components/home/SeasonalCampaign';
import InstagramFeed from '@/components/home/InstagramFeed';
import TrustSection from '@/components/home/TrustSection';
import AppDownload from '@/components/home/AppDownload';
import type { Product } from '@/components/product/ProductCard';

/** Map NuxFashion catalog product → NuxStore ProductCard format */
function mapProduct(p: any): Product {
  const firstVariant = p.variants?.[0] || {};
  const price = Number(firstVariant.selling_price || 0);
  const originalPrice = Number(firstVariant.compare_price || 0);
  return {
    id: p.id,
    slug: p.id,                         // use id as slug; swap for p.slug if you add one
    name: p.name,
    nameAr: p.name_ar || p.name,
    image: p.image_url || '',
    price,
    originalPrice: originalPrice > price ? originalPrice : undefined,
    discount: originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : undefined,
    brand: p.brand_name || undefined,
    brandAr: p.brand_name_ar || undefined,
    inStock: p.variants?.some((v: any) => Number(v.stock) > 0) ?? true,
    isNew: p.tags?.includes('new') ?? false,
    isBestSeller: p.tags?.includes('best-seller') ?? false,
    variantId: firstVariant.id,
    sku: firstVariant.sku,
    stock: p.variants?.reduce((s: number, v: any) => s + Number(v.stock || 0), 0) ?? 99,
    colorOptions: p.variants?.map((v: any) => v.color).filter(Boolean) ?? [],
    sizeOptions: p.variants?.map((v: any) => v.size).filter(Boolean) ?? [],
  };
}

export default async function HomePage() {
  const locale = await getLocale();

  // Fetch from existing NuxFashion API
  let products: Product[] = [];
  let categories: any[] = [];
  let brands: any[] = [];
  let config: any = {};

  try {
    const [catalogData, configData] = await Promise.all([
      storefrontApi.getCatalog(),
      storefrontApi.getConfig(),
    ]);
    products = (catalogData.products || []).map(mapProduct);
    categories = catalogData.categories || [];
    brands = catalogData.brands || [];
    config = configData;
  } catch (e) {
    // API not reachable during build — use empty state; hydrates on client
    console.warn('Storefront API unreachable during build:', e);
  }

  // Slice sets for sections (tag-based when available, otherwise by position)
  const selected=(ids:any[],fallback:Product[])=>Array.isArray(ids)&&ids.length?ids.map(id=>products.find(p=>p.id===id)).filter(Boolean) as Product[]:fallback;
  const visibleCategories=Array.isArray(config.category_ids)&&config.category_ids.length?config.category_ids.map((id:string)=>categories.find(c=>c.id===id)).filter(Boolean):categories;
  const visibleBrands=Array.isArray(config.featured_brand_ids)&&config.featured_brand_ids.length?config.featured_brand_ids.map((id:string)=>brands.find(b=>b.id===id)).filter(Boolean):brands;
  const newArrivals = selected(config.collection_product_ids,products.filter(p => p.isNew)).slice(0, 8);
  const bestSellers = selected(config.best_seller_product_ids,products.filter(p => p.isBestSeller)).slice(0, 8);
  const flashDeals  = selected(config.flash_product_ids,products.filter(p => p.discount && p.discount >= 20)).slice(0, 8);
  const trending    = selected(config.trending_product_ids,products).slice(0, 8);

  // Fallback: if filters return nothing, use first N products
  const fill = (arr: Product[], n: number) => arr.length ? arr : products.slice(0, n);

  const fallbackSections=[
    {id:'hero',type:'hero',enabled:true},{id:'announcement',type:'announcement',enabled:true},
    {id:'categories',type:'categories',title:'Shop by Category',title_ar:'تسوق حسب الفئة',enabled:true},
    {id:'flash',type:'flash',title:'Flash Deals',title_ar:'عروض سريعة',enabled:true},
    {id:'products',type:'products',title:'New Arrivals',title_ar:'وصل حديثاً',source:'collection',enabled:true},
    {id:'promo',type:'promo_grid',layout:'two',enabled:true},{id:'brands',type:'brands',enabled:true},
    {id:'trust',type:'trust',title:'Why NuxStore?',title_ar:'لماذا نوكس ستور؟',enabled:true}
  ];
  const sections=(Array.isArray(config.homepage_sections)&&config.homepage_sections.length?config.homepage_sections:fallbackSections).filter((x:any)=>x.enabled!==false);
  const productsFor=(section:any)=>{
    if(Array.isArray(section.product_ids)&&section.product_ids.length)return selected(section.product_ids,[]);
    if(section.source==='best_sellers')return fill(bestSellers,8);
    if(section.source==='trending')return fill(trending,8);
    if(section.source==='flash')return fill(flashDeals,8);
    return fill(newArrivals,8);
  };
  const renderSection=(section:any,index:number)=>{
    const key=section.id||`${section.type}-${index}`;const speed=Number(section.autoplay_seconds??config.product_slider_autoplay_seconds??3);
    if(section.type==='hero')return <div key={key} className="max-w-[1640px] mx-auto px-2 md:px-4 pt-4"><div className="overflow-hidden rounded-[28px] aspect-[2.67/1] min-h-[420px]"><HeroBanner locale={locale} banners={config.banners||[]} autoplaySeconds={speed||5}/></div></div>;
    if(section.type==='announcement')return <PromoStrip key={key} locale={locale} announcement={config.announcement} announcementAr={config.announcement_ar}/>;
    if(section.type==='categories'){const chosen=Array.isArray(section.category_ids)&&section.category_ids.length?section.category_ids.map((id:string)=>categories.find(c=>c.id===id)).filter(Boolean):visibleCategories;return <section key={key} className="py-10 bg-gray-50"><div className="max-w-7xl mx-auto px-4"><CategorySlider locale={locale} categories={chosen} titleEn={section.title||'Shop by Category'} titleAr={section.title_ar||section.title||'تسوق حسب الفئة'}/></div></section>}
    if(section.type==='flash')return fill(flashDeals,5).length?<section key={key} className="py-10 bg-luxury-900"><div className="max-w-7xl mx-auto px-4"><FlashDeals locale={locale} products={fill(flashDeals,5)} titleEn={section.title||'Flash Deals'} titleAr={section.title_ar||section.title||'عروض سريعة'} endAt={section.end_at}/></div></section>:null;
    if(section.type==='products'){const list=productsFor(section);return list.length?<section key={key} className="py-12"><div className="max-w-7xl mx-auto px-4"><ProductSection locale={locale} titleEn={section.title||'Featured Products'} titleAr={section.title_ar||section.title||'منتجات مختارة'} products={list} viewAllHref="/category/all" badge={section.source==='trending'?'🔥':undefined} autoplaySeconds={speed}/></div></section>:null}
    if(section.type==='promo_grid')return <section key={key} className="py-8 bg-gray-50"><div className="max-w-7xl mx-auto px-4"><BannerRow locale={locale} config={config} section={section}/></div></section>;
    if(section.type==='seasonal')return <SeasonalCampaign key={key} locale={locale} config={config}/>;
    if(section.type==='brands')return <section key={key} className="py-10 bg-gray-50"><div className="max-w-7xl mx-auto px-4"><BrandSlider locale={locale} brands={visibleBrands}/></div></section>;
    if(section.type==='trust')return <TrustSection key={key} locale={locale} config={{...config,trust_title:section.title||config.trust_title,trust_title_ar:section.title_ar||config.trust_title_ar}}/>;
    return null;
  };
  return <div className="pb-8">{sections.map(renderSection)}{config.instagram_enabled!==false&&<section className="py-10 bg-gray-50"><div className="max-w-7xl mx-auto px-4"><InstagramFeed locale={locale} instagramUrl={config.instagram_url}/></div></section>}{config.app_download_enabled===true&&<AppDownload locale={locale}/>}</div>;
}
