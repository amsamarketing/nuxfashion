'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Star, Eye, GitCompare } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useWishlistStore } from '@/store/wishlist';
import { useCartStore } from '@/store/cart';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  image: string;
  images?: string[];
  price: number;
  originalPrice?: number;
  discount?: number;
  rating?: number;
  reviewCount?: number;
  badge?: 'new' | 'sale' | 'hot' | 'limited';
  brand?: string;
  brandAr?: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  inStock?: boolean;
  variantId?: string;
  sku?: string;
  stock?: number;
  colorOptions?: string[];
  sizeOptions?: string[];
}

interface Props {
  product: Product;
  layout?: 'grid' | 'list';
  showQuickAdd?: boolean;
}

export default function ProductCard({ product, layout = 'grid', showQuickAdd = true }: Props) {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { toggle, has } = useWishlistStore();
  const addItem = useCartStore(s => s.addItem);
  const wished = has(product.id);

  const discount = product.discount || (
    product.originalPrice
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      productId: product.id,
      variantId: product.variantId || product.id,
      name: product.name,
      nameAr: product.nameAr,
      image: product.image,
      price: product.price,
      originalPrice: product.originalPrice,
      sku: product.sku || product.id,
      stock: product.stock || 99,
    });
    toast.success(isRtl ? 'أُضيف إلى السلة ✓' : 'Added to cart ✓', { duration: 2000 });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggle({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      image: product.image,
      price: product.price,
      originalPrice: product.originalPrice,
      slug: product.slug,
    });
    toast(wished ? (isRtl ? 'تمت الإزالة' : 'Removed from wishlist') : (isRtl ? 'أُضيف للمفضلة ♥' : 'Added to wishlist ♥'), { duration: 1500 });
  };

  if (layout === 'list') {
    return (
      <Link href={`/${locale}/product/${product.slug}`} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group">
        <div className="relative w-28 h-36 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {product.image && <Image src={product.image} alt={isRtl ? product.nameAr : product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300"/>}
          {discount > 0 && <span className="absolute top-2 start-2 badge-sale">{discount}% {isRtl ? 'خصم' : 'OFF'}</span>}
        </div>
        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            {product.brand && <p className="text-xs text-gray-400 font-medium mb-0.5">{isRtl ? product.brandAr : product.brand}</p>}
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{isRtl ? product.nameAr : product.name}</h3>
            {product.rating && (
              <div className="flex items-center gap-1 mb-2">
                <Star size={11} className="text-gold-500 fill-gold-500"/>
                <span className="text-xs font-medium">{product.rating}</span>
                <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-black text-luxury-900">SAR {product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-xs text-gray-400 line-through ms-2">SAR {product.originalPrice.toFixed(2)}</span>
              )}
            </div>
            <button onClick={handleAddToCart} className="btn-primary py-2 px-4 text-sm">
              {isRtl ? 'أضف للسلة' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/${locale}/product/${product.slug}`} className="product-card group block" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
        {product.image && (
          <Image
            src={product.image}
            alt={isRtl ? product.nameAr : product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* Badges */}
        <div className="absolute top-2 start-2 flex flex-col gap-1">
          {discount > 0 && <span className="badge-sale">{discount}% {isRtl ? 'خصم' : 'OFF'}</span>}
          {product.isNew && <span className="badge-new">{isRtl ? 'جديد' : 'NEW'}</span>}
          {product.isBestSeller && <span className="badge-hot">{isRtl ? 'الأكثر مبيعاً' : 'BEST SELLER'}</span>}
        </div>

        {/* Quick actions */}
        <div className="absolute top-2 end-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleWishlist}
            className={cn(
              'w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center transition-colors',
              wished ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            )}
          >
            <Heart size={14} className={wished ? 'fill-red-500' : ''}/>
          </button>
          <Link
            href={`/${locale}/product/${product.slug}`}
            className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 hover:text-luxury-900 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <Eye size={14}/>
          </Link>
        </div>

        {/* Quick add */}
        {showQuickAdd && (product.inStock !== false) && (
          <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAddToCart}
              className="w-full bg-luxury-900 hover:bg-luxury-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <ShoppingBag size={12}/>
              {isRtl ? 'أضف إلى السلة' : 'Add to Cart'}
            </button>
          </div>
        )}

        {product.inStock === false && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {isRtl ? 'نفدت الكمية' : 'Out of Stock'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {product.brand && (
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
            {isRtl ? product.brandAr : product.brand}
          </p>
        )}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5">
          {isRtl ? product.nameAr : product.name}
        </h3>
        {product.rating && (
          <div className="flex items-center gap-1 mb-1.5">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={10} className={s <= Math.round(product.rating!) ? 'text-gold-400 fill-gold-400' : 'text-gray-200 fill-gray-200'}/>
            ))}
            <span className="text-[10px] text-gray-400 ms-0.5">({product.reviewCount || 0})</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-black text-luxury-900">SAR {product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">SAR {product.originalPrice.toFixed(2)}</span>
          )}
        </div>
        {/* Color dots */}
        {product.colorOptions && product.colorOptions.length > 0 && (
          <div className="flex gap-1 mt-2">
            {product.colorOptions.slice(0, 5).map(c => (
              <div key={c} className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ background: c }}/>
            ))}
            {product.colorOptions.length > 5 && <span className="text-[10px] text-gray-400">+{product.colorOptions.length - 5}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
