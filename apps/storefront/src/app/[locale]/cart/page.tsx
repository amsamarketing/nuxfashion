'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Trash2, Plus, Minus, ShoppingBag, Tag, Gift } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CartPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { items, removeItem, updateQty, subtotal, vat, total, coupon, applyCoupon } = useCartStore();
  const [couponInput, setCouponInput] = useState('');

  const handleCoupon = () => {
    if (couponInput.toLowerCase() === 'save10') { applyCoupon('SAVE10', subtotal * 0.1); toast.success(isRtl ? 'تم تطبيق الكوبون ✓' : 'Coupon applied ✓'); }
    else toast.error(isRtl ? 'كوبون غير صالح' : 'Invalid coupon code');
  };

  if (items.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
      <ShoppingBag size={64} className="text-gray-200 mx-auto mb-4"/>
      <h2 className="text-2xl font-black text-luxury-900 mb-2">{isRtl ? 'سلتك فارغة' : 'Your cart is empty'}</h2>
      <p className="text-gray-500 mb-6">{isRtl ? 'ابدأ التسوق الآن لإضافة منتجات' : 'Start shopping to add items to your cart'}</p>
      <Link href={`/${locale}`} className="btn-primary">{isRtl ? 'تسوق الآن' : 'Continue Shopping'}</Link>
    </div>
  );

  const shipping = subtotal >= 200 ? 0 : 25;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-black text-luxury-900 mb-8">
        {isRtl ? 'سلة التسوق' : 'Shopping Cart'} <span className="text-gray-400 text-lg font-normal">({items.length})</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="relative w-24 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{isRtl ? item.nameAr : item.name}</h3>
                    {item.size && <p className="text-xs text-gray-400 mt-0.5">{isRtl ? 'المقاس:' : 'Size:'} {item.size}</p>}
                    {item.color && <p className="text-xs text-gray-400">{isRtl ? 'اللون:' : 'Color:'} {item.color}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">SKU: {item.sku}</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                    <Trash2 size={14}/>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => updateQty(item.id, item.qty-1)} className="px-3 py-2 hover:bg-gray-50 transition-colors"><Minus size={12}/></button>
                    <span className="px-3 text-sm font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty+1)} disabled={item.qty>=item.stock} className="px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-30"><Plus size={12}/></button>
                  </div>
                  <div className="text-end">
                    <div className="font-black text-luxury-900 text-sm">SAR {(item.price * item.qty).toFixed(2)}</div>
                    {item.originalPrice && <div className="text-xs text-gray-400 line-through">SAR {(item.originalPrice * item.qty).toFixed(2)}</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Coupon */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-luxury-900"/>
              <h3 className="font-bold text-sm text-luxury-900">{isRtl ? 'كوبون الخصم' : 'Discount Coupon'}</h3>
              {coupon && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{coupon}</span>}
            </div>
            <div className="flex gap-2">
              <input value={couponInput} onChange={e => setCouponInput(e.target.value)}
                placeholder={isRtl ? 'أدخل الكوبون' : 'Enter coupon code'}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-luxury-900"/>
              <button onClick={handleCoupon} className="btn-outline py-2.5 px-5 text-sm">{isRtl ? 'تطبيق' : 'Apply'}</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">{isRtl ? 'جرّب: SAVE10' : 'Try: SAVE10'}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-fit sticky top-24">
          <h2 className="font-black text-lg text-luxury-900 mb-5">{isRtl ? 'ملخص الطلب' : 'Order Summary'}</h2>
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{isRtl ? 'المجموع الفرعي' : 'Subtotal'}</span><span>SAR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{isRtl ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span><span>SAR {vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{isRtl ? 'الشحن' : 'Shipping'}</span>
              <span className={shipping === 0 ? 'text-green-600 font-bold' : ''}>{shipping === 0 ? (isRtl ? 'مجاني' : 'FREE') : `SAR ${shipping}`}</span>
            </div>
            {coupon && (
              <div className="flex justify-between text-sm text-green-600">
                <span>- {coupon}</span><span>- SAR {(subtotal * 0.1).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-luxury-900 text-base pt-3 border-t">
              <span>{isRtl ? 'الإجمالي' : 'Total'}</span><span>SAR {total.toFixed(2)}</span>
            </div>
          </div>
          <Link href={`/${locale}/checkout`} className="btn-primary w-full justify-center text-center block">
            {isRtl ? 'إتمام الشراء' : 'Proceed to Checkout'}
          </Link>
          <div className="mt-4 flex flex-wrap gap-1 justify-center">
            {['VISA','MC','MADA','AMEX','TABBY','TAMARA','APPLE PAY'].map(p => (
              <span key={p} className="text-[9px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
