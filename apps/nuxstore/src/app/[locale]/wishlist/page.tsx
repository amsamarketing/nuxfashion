'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Heart, Trash2 } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist';

export default function WishlistPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { items, remove } = useWishlistStore();

  if (items.length === 0) return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
      <Heart size={64} className="text-gray-200 mx-auto mb-4"/>
      <h2 className="text-2xl font-black text-luxury-900 mb-2">{isRtl ? 'قائمة المفضلة فارغة' : 'Your wishlist is empty'}</h2>
      <p className="text-gray-400 mb-6">{isRtl ? 'أضف المنتجات التي تعجبك' : 'Save items you love to your wishlist'}</p>
      <Link href={`/${locale}`} className="btn-primary">{isRtl ? 'تسوق الآن' : 'Start Shopping'}</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-black text-luxury-900 mb-6">
        {isRtl ? 'المفضلة' : 'Wishlist'} <span className="text-gray-400 font-normal text-lg">({items.length})</span>
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
            <Link href={`/${locale}/product/${item.slug}`}>
              <div className="relative aspect-[3/4] bg-gray-100">
                {item.image && <Image src={item.image} alt={isRtl ? item.nameAr : item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300"/>}
              </div>
            </Link>
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{isRtl ? item.nameAr : item.name}</h3>
              <div className="flex items-center justify-between">
                <span className="font-black text-luxury-900">SAR {item.price}</span>
                <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
