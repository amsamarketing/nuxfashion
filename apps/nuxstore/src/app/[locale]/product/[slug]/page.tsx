'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Heart, Share2, Check, Star } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { storefrontApi } from '@/lib/api';

interface Variant {
  id: string;
  color?: string;
  size?: string;
  sku: string;
  selling_price: number;
  compare_price?: number;
  stock: number;
}

interface ProductDetail {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  image_url?: string;
  images?: string[];
  tags?: string[];
  category_id?: string;
  category?: { name: string; slug?: string };
  variants: Variant[];
}

export default function ProductPage() {
  const locale  = useLocale();
  const { slug } = useParams();
  const isRtl   = locale === 'ar';
  const { addItem } = useCartStore();

  const [product, setProduct]     = useState<ProductDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [selColor, setSelColor]   = useState('');
  const [selSize, setSelSize]     = useState('');
  const [qty, setQty]             = useState(1);
  const [added, setAdded]         = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [wishlist, setWishlist]   = useState(false);

  useEffect(() => {
    storefrontApi.getProduct(String(slug))
      .then((data: ProductDetail) => {
        setProduct(data);
        if (data.variants?.[0]?.color) setSelColor(data.variants[0].color);
        if (data.variants?.[0]?.size)  setSelSize(data.variants[0].size);
      })
      .catch(async () => {
        try {
          const catalog = await storefrontApi.getCatalog();
          const match = (catalog.products || []).find((item:any) => item.id === String(slug) || item.slug === String(slug));
          setProduct(match || null);
          if (match?.variants?.[0]?.color) setSelColor(match.variants[0].color);
          if (match?.variants?.[0]?.size) setSelSize(match.variants[0].size);
        } catch { setProduct(null); }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse"/>
          <div className="space-y-4">
            {[100,60,40,80,40].map((w,i) => (
              <div key={i} className="bg-gray-100 rounded-xl animate-pulse" style={{height:24, width:`${w}%`}}/>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400" dir={isRtl?'rtl':'ltr'}>
        <div className="text-6xl mb-4">😔</div>
        <p className="font-medium">{isRtl ? 'المنتج غير موجود' : 'Product not found'}</p>
        <Link href={`/${locale}/category/all`} className="mt-4 inline-block text-luxury-900 font-bold hover:underline">
          {isRtl ? '← متابعة التسوق' : '← Continue Shopping'}
        </Link>
      </div>
    );
  }

  const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))] as string[];
  const sizes  = [...new Set(product.variants.map(v => v.size).filter(Boolean))]  as string[];
  const activeVariant = product.variants.find(v =>
    (!selColor || v.color === selColor) && (!selSize || v.size === selSize)
  ) || product.variants[0];
  const price     = Number(activeVariant?.selling_price || 0);
  const origPrice = Number(activeVariant?.compare_price || 0);
  const discount  = origPrice > price ? Math.round((1-price/origPrice)*100) : 0;
  const inStock   = Number(activeVariant?.stock || 0) > 0;
  const images    = [...new Set([product.image_url, ...(product.images || [])].filter(Boolean))] as string[];

  const name = isRtl ? (product.name_ar || product.name) : product.name;
  const desc = isRtl ? (product.description_ar || product.description) : product.description;

  const handleAddToCart = () => {
    if (!activeVariant || !inStock) return;
    addItem({
      id: activeVariant.id,
      productId: product.id,
      variantId: activeVariant.id,
      name: product.name,
      nameAr: product.name_ar || product.name,
      image: images[0] || '',
      price,
      originalPrice: origPrice > price ? origPrice : undefined,
      qty,
      size: activeVariant.size,
      color: activeVariant.color,
      sku: activeVariant.sku,
      stock: Number(activeVariant.stock),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const TABS = isRtl
    ? ['الوصف', 'المواصفات', 'التقييمات', 'الأسئلة']
    : ['Description', 'Specifications', 'Reviews', 'Q&A'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-6 flex items-center gap-1">
        <Link href={`/${locale}`} className="hover:text-luxury-900">{isRtl ? 'الرئيسية' : 'Home'}</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/${locale}/category/${product.category.slug || product.category_id}`} className="hover:text-luxury-900 capitalize">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-700 font-medium truncate max-w-[160px]">{name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 mb-16">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
            {images[activeImg] ? (
              <Image src={images[activeImg]} alt={name} fill className="object-cover" unoptimized priority/>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-7xl">👗</div>
            )}
            {discount > 0 && (
              <div className="absolute top-4 start-4 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">-{discount}%</div>
            )}
            {product.tags?.includes('new') && (
              <div className="absolute top-4 end-4 bg-luxury-900 text-white text-xs font-black px-2.5 py-1 rounded-full">NEW</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImg===i ? 'border-luxury-900' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <Image src={src} alt="" fill className="object-cover" unoptimized/>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-luxury-900 mb-2">{name}</h1>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {Array.from({length:5}).map((_,i) => <Star key={i} size={14} className="text-gold-500 fill-gold-500"/>)}
            </div>
            <span className="text-xs text-gray-400">(48 {isRtl ? 'تقييم' : 'reviews'})</span>
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl font-black text-luxury-900">SAR {price.toFixed(2)}</span>
            {origPrice > price && (
              <span className="text-lg text-gray-400 line-through">SAR {origPrice.toFixed(2)}</span>
            )}
            {discount > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{discount}% {isRtl ? 'خصم' : 'OFF'}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-5">{isRtl ? 'شامل ضريبة القيمة المضافة 15%' : 'Price includes 15% VAT'}</p>

          {/* Color */}
          {colors.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-gray-800 mb-2">
                {isRtl ? 'اللون:' : 'Color:'} <span className="font-normal text-gray-500">{selColor}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                {colors.map(c => (
                  <button key={c} onClick={() => setSelColor(c)}
                    className={`px-4 py-1.5 rounded-full text-sm border-2 font-medium transition-all ${selColor===c ? 'border-luxury-900 bg-luxury-900 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-bold text-gray-800 mb-2">{isRtl ? 'المقاس:' : 'Size:'} <span className="font-normal text-gray-500">{selSize}</span></p>
              <div className="flex gap-2 flex-wrap">
                {sizes.map(s => {
                  const v2 = product.variants.find(v => v.size === s && (!selColor || v.color === selColor));
                  const sizeInStock = Number(v2?.stock || 0) > 0;
                  return (
                    <button key={s} onClick={() => sizeInStock && setSelSize(s)}
                      disabled={!sizeInStock}
                      className={`w-12 h-12 rounded-xl text-sm font-bold border-2 transition-all relative ${
                        selSize===s ? 'border-luxury-900 bg-luxury-900 text-white' :
                        sizeInStock ? 'border-gray-200 text-gray-700 hover:border-gray-400' :
                        'border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}>
                      {s}
                      {!sizeInStock && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-px bg-gray-300 rotate-45"/></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Qty */}
          <div className="flex items-center gap-4 mb-6">
            <p className="text-sm font-bold text-gray-800">{isRtl ? 'الكمية:' : 'Qty:'}</p>
            <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q-1))} className="w-10 h-10 flex items-center justify-center text-lg font-bold hover:bg-gray-50">−</button>
              <span className="w-10 text-center font-bold text-sm">{qty}</span>
              <button onClick={() => setQty(q => Math.min(Number(activeVariant?.stock||99), q+1))} className="w-10 h-10 flex items-center justify-center text-lg font-bold hover:bg-gray-50">+</button>
            </div>
            {activeVariant && (
              <span className="text-xs text-gray-400">{Number(activeVariant.stock)} {isRtl ? 'متوفر' : 'in stock'}</span>
            )}
          </div>

          {/* CTA */}
          <div className="flex gap-3 mb-6">
            <button onClick={handleAddToCart} disabled={!inStock}
              className={`flex-1 flex items-center justify-center gap-2 font-black text-sm py-4 rounded-2xl transition-all ${
                !inStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                added ? 'bg-green-600 text-white scale-95' :
                'bg-luxury-900 text-white hover:bg-luxury-800 hover:scale-[1.02] active:scale-95'
              }`}>
              {added ? <Check size={18}/> : <ShoppingBag size={18}/>}
              {!inStock ? (isRtl ? 'نفدت الكمية' : 'Out of Stock') : added ? (isRtl ? 'أضيف!' : 'Added!') : (isRtl ? 'أضف للسلة' : 'Add to Cart')}
            </button>
            <button onClick={() => setWishlist(!wishlist)}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all hover:scale-105 ${wishlist ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-400'}`}>
              <Heart size={20} className={wishlist ? 'text-red-500 fill-red-500' : 'text-gray-400'}/>
            </button>
            <button className="w-14 h-14 flex items-center justify-center rounded-2xl border-2 border-gray-200 hover:border-gray-400 transition-all hover:scale-105">
              <Share2 size={18} className="text-gray-400"/>
            </button>
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            {activeVariant?.sku && <p>SKU: {activeVariant.sku}</p>}
            {product.tags && product.tags.length > 0 && (
              <p>{isRtl ? 'الوسوم:' : 'Tags:'} {product.tags.join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-16">
        <div className="flex gap-1 border-b border-gray-100 mb-8 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`pb-3 px-4 text-sm font-bold whitespace-nowrap transition-colors relative ${activeTab===i ? 'text-luxury-900' : 'text-gray-400 hover:text-gray-700'}`}>
              {tab}
              {activeTab===i && <div className="absolute bottom-0 start-0 end-0 h-0.5 bg-luxury-900 rounded-full"/>}
            </button>
          ))}
        </div>
        <div className="text-gray-700 text-sm leading-relaxed max-w-2xl">
          {activeTab === 0 && (
            desc ? <p>{desc}</p> : <p className="text-gray-400">{isRtl ? 'لا يوجد وصف متاح' : 'No description available.'}</p>
          )}
          {activeTab === 1 && (
            <table className="w-full text-sm">
              <tbody>
                {[
                  [isRtl?'الاسم':'Name', product.name],
                  [isRtl?'الفئة':'Category', product.category?.name || '–'],
                  [isRtl?'المقاسات المتاحة':'Sizes', sizes.join(', ') || '–'],
                  [isRtl?'الألوان المتاحة':'Colors', colors.join(', ') || '–'],
                  ['SKU', activeVariant?.sku || '–'],
                ].map(([k,v]) => (
                  <tr key={k} className="border-b border-gray-50">
                    <td className="py-2.5 pe-6 text-gray-500 font-medium">{k}</td>
                    <td className="py-2.5 text-gray-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 2 && (
            <div className="space-y-4">
              {[
                { name:'Ahmed K.', stars:5, text: isRtl?'منتج رائع، جودة ممتازة وتوصيل سريع!':'Amazing product, great quality and fast delivery!' },
                { name:'Sara M.', stars:4, text: isRtl?'أنصح به، لكن المقاسات أكبر قليلاً من المعتاد.':'Recommended, but sizing runs a bit large.' }
              ].map((r,i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-luxury-900 text-white flex items-center justify-center text-xs font-bold">{r.name[0]}</div>
                    <span className="font-bold text-sm">{r.name}</span>
                    <div className="flex ms-auto">
                      {Array.from({length:r.stars}).map((_,j) => <Star key={j} size={12} className="text-gold-500 fill-gold-500"/>)}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{r.text}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === 3 && (
            <p className="text-gray-400">{isRtl ? 'لا توجد أسئلة بعد. كن أول من يسأل!' : 'No questions yet. Be the first to ask!'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
