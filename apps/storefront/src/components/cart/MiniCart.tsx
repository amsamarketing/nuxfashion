'use client';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useTranslations } from 'next-intl';

export default function MiniCart({ onClose, locale }: { onClose: () => void; locale: string }) {
  const t = useTranslations('cart');
  const { items, updateQty, removeItem, subtotal, vat, total } = useCartStore();
  const isRtl = locale === 'ar';

  return (
    <div className="fixed inset-0 z-50" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className={`absolute top-0 ${isRtl ? 'left-0' : 'right-0'} h-full w-full max-w-md bg-white shadow-2xl flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-luxury-900"/>
            <h2 className="font-bold text-lg text-luxury-900">{t('title')}</h2>
            <span className="bg-luxury-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShoppingBag size={48} className="text-gray-200 mb-4"/>
              <p className="text-gray-400 font-medium">{t('empty')}</p>
              <button onClick={onClose} className="mt-4 text-luxury-900 font-bold text-sm hover:underline">{t('continue')}</button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-3 p-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <div className="relative w-20 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                    {isRtl ? item.nameAr : item.name}
                  </h4>
                  {item.size && <p className="text-xs text-gray-400 mb-1">{locale === 'ar' ? 'المقاس:' : 'Size:'} {item.size}</p>}
                  {item.color && <p className="text-xs text-gray-400 mb-2">{locale === 'ar' ? 'اللون:' : 'Color:'} {item.color}</p>}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-luxury-900 text-sm">SAR {(item.price * item.qty).toFixed(2)}</span>
                      {item.originalPrice && (
                        <span className="text-xs text-gray-400 line-through ms-1">SAR {(item.originalPrice * item.qty).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus size={10}/>
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        disabled={item.qty >= item.stock}
                        className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30"
                      >
                        <Plus size={10}/>
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors self-start p-1">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('subtotal')}</span><span>SAR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('vat')}</span><span>SAR {vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('shipping')}</span>
                <span className="text-green-600 font-medium">{subtotal >= 200 ? t('free') : 'SAR 25'}</span>
              </div>
              <div className="flex justify-between font-black text-luxury-900 text-base pt-2 border-t">
                <span>{t('total')}</span><span>SAR {total.toFixed(2)}</span>
              </div>
            </div>
            <Link
              href={`/${locale}/checkout`}
              onClick={onClose}
              className="block w-full bg-luxury-900 hover:bg-luxury-700 text-white text-center font-bold py-3 rounded-full transition-colors"
            >
              {t('checkout')}
            </Link>
            <button onClick={onClose} className="block w-full text-center text-sm text-gray-500 hover:text-luxury-900 mt-2 transition-colors">
              {t('continue')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
