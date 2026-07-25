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

  return (
    <div className="pb-8">
      {/* 1. Hero Banner — uses banners from storefront_banners table */}
      <HeroBanner locale={locale} banners={config.banners || []}/>

      {/* 2. Promo strip — uses announcement from storefront_settings */}
      <PromoStrip locale={locale} announcement={config.announcement} announcementAr={config.announcement_ar}/>

      {/* 3. Category Slider — real categories from DB */}
      {config.category_enabled !== false && <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <CategorySlider locale={locale} categories={visibleCategories}/>
        </div>
      </section>}

      {/* 4. Flash Deals */}
      {config.flash_enabled !== false && fill(flashDeals, 4).length > 0 && (
        <section className="py-10 bg-luxury-900">
          <div className="max-w-7xl mx-auto px-4">
            <FlashDeals locale={locale} products={fill(flashDeals, 4)}/>
          </div>
        </section>
      )}

      {/* 5. New Arrivals */}
      {config.new_arrivals_enabled !== false && products.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <ProductSection
              locale={locale}
              titleEn={config.featured_title || 'New Arrivals'}
              titleAr={config.featured_title_ar || 'وصل حديثاً'}
              products={fill(newArrivals, 8)}
              viewAllHref="/category/all"
            />
          </div>
        </section>
      )}

      {/* 6. Promo banners */}
      {config.promo_banners_enabled !== false && <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <BannerRow locale={locale} config={config}/>
        </div>
      </section>}

      {/* 7. Best Sellers */}
      {config.best_sellers_enabled !== false && products.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <ProductSection
              locale={locale}
              titleEn={config.best_sellers_title || 'Best Sellers'}
              titleAr={config.best_sellers_title_ar || 'الأكثر مبيعاً'}
              products={fill(bestSellers, 8)}
              viewAllHref="/category/all"
            />
          </div>
        </section>
      )}

      {/* 8. Seasonal Campaign */}
      {config.seasonal_enabled !== false && <SeasonalCampaign locale={locale} config={config}/>}

      {/* 9. Brand Slider (static — no public brands API) */}
      {config.brands_enabled !== false && <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <BrandSlider locale={locale} brands={visibleBrands}/>
        </div>
      </section>}

      {/* 10. Trending */}
      {config.trending_enabled !== false && products.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <ProductSection
              locale={locale}
              titleEn={config.trending_title || 'Trending Now'}
              titleAr={config.trending_title_ar || 'الأكثر رواجاً'}
              products={fill(trending, 8)}
              viewAllHref="/category/all"
              badge="🔥"
            />
          </div>
        </section>
      )}

      {/* 11. Instagram Feed */}
      {config.instagram_enabled !== false && <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <InstagramFeed locale={locale} instagramUrl={config.instagram_url}/>
        </div>
      </section>}

      {/* 12. App Download */}
      {config.app_download_enabled === true && <AppDownload locale={locale}/>}

      {/* 13. Trust Section */}
      {config.trust_enabled !== false && <TrustSection locale={locale} config={config}/>} 
    </div>
  );
}
