'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useCartStore } from '@/store/cart';
import { CheckCircle, MapPin, CreditCard, ChevronRight, Truck, Store } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'cash',  iconEn: '💵', labelEn: 'Cash on Delivery',    labelAr: 'الدفع عند الاستلام',   subEn: 'Pay when delivered',        subAr: 'ادفع عند الاستلام' },
  { id: 'card',  iconEn: '💳', labelEn: 'Credit / Debit Card', labelAr: 'بطاقة ائتمان / مدى',   subEn: 'Visa, Mastercard, Mada',    subAr: 'فيزا، ماستر، مدى' },
  { id: 'mada',  iconEn: '🏦', labelEn: 'Mada',               labelAr: 'مدى',                   subEn: 'Saudi debit card',           subAr: 'بطاقة مدى السعودية' },
  { id: 'apple', iconEn: '🍎', labelEn: 'Apple Pay',           labelAr: 'Apple Pay',             subEn: 'Touch or Face ID',           subAr: 'بصمة أو وجه' },
  { id: 'tabby', iconEn: '🟣', labelEn: 'Tabby',              labelAr: 'تابي',                  subEn: 'Pay in 4 — 0% interest',    subAr: 'ادفع على 4 دفعات — بدون فوائد' },
  { id: 'tamara',iconEn: '🟤', labelEn: 'Tamara',             labelAr: 'تمارا',                 subEn: 'Pay in 3 — 0% interest',    subAr: 'ادفع على 3 دفعات — بدون فوائد' },
  { id: 'stc',   iconEn: '📱', labelEn: 'STC Pay',            labelAr: 'STC Pay',               subEn: 'Mobile wallet',              subAr: 'محفظة إلكترونية' },
  { id: 'wallet',iconEn: '💰', labelEn: 'Wallet Balance',     labelAr: 'رصيد المحفظة',          subEn: 'Available: SAR 120',        subAr: 'المتاح: 120 ريال' },
];

export default function CheckoutPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { items, subtotal, vat, total } = useCartStore();
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState('standard');
  const [payment, setPayment] = useState('card');
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', district: '' });
  const [placed, setPlaced] = useState(false);

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleOrder = () => {
    if (!form.name || !form.phone || !form.address) { toast.error(isRtl ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields'); return; }
    setPlaced(true);
  };

  if (placed) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-600"/>
      </div>
      <h1 className="text-2xl font-black text-luxury-900 mb-2">{isRtl ? 'تم تأكيد طلبك! 🎉' : 'Order Placed! 🎉'}</h1>
      <p className="text-gray-500 text-sm mb-2">{isRtl ? 'رقم الطلب: #NUX-202600001' : 'Order #NUX-202600001'}</p>
      <p className="text-gray-400 text-sm mb-8">{isRtl ? 'سيصلك تأكيد على جوالك وإيميلك' : "You'll receive a confirmation via SMS and email"}</p>
      <a href={`/${locale}`} className="btn-primary">{isRtl ? 'مواصلة التسوق' : 'Continue Shopping'}</a>
    </div>
  );

  const shipping = subtotal >= 200 ? 0 : 25;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-black text-luxury-900 mb-6">{isRtl ? 'إتمام الشراء' : 'Checkout'}</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        {[
          [1, isRtl ? 'التوصيل' : 'Delivery'],
          [2, isRtl ? 'الدفع' : 'Payment'],
          [3, isRtl ? 'المراجعة' : 'Review'],
        ].map(([s, label]) => (
          <div key={s as number} className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => step > (s as number) && setStep(s as number)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                step >= (s as number) ? 'bg-luxury-900 text-white' : 'bg-gray-100 text-gray-400'
              }`}>{s}</button>
            <span className={`text-sm font-medium ${step >= (s as number) ? 'text-luxury-900' : 'text-gray-400'}`}>{label}</span>
            {(s as number) < 3 && <ChevronRight size={14} className="text-gray-300"/>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Step 1: Delivery */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <MapPin size={18} className="text-luxury-900"/>
                <h2 className="font-black text-luxury-900">{isRtl ? 'معلومات التوصيل' : 'Delivery Information'}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  ['name', isRtl ? 'الاسم الكامل *' : 'Full Name *', 'text'],
                  ['phone', isRtl ? 'رقم الجوال *' : 'Phone Number *', 'tel'],
                  ['address', isRtl ? 'عنوان الشارع *' : 'Street Address *', 'text'],
                  ['district', isRtl ? 'الحي' : 'District', 'text'],
                ].map(([k, label, type]) => (
                  <div key={k as string} className={k === 'address' ? 'col-span-2' : ''}>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{label}</label>
                    <input type={type as string} value={(form as any)[k as string]} onChange={update(k as string)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-luxury-900 transition-colors"/>
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">{isRtl ? 'المدينة' : 'City'}</label>
                  <select value={form.city} onChange={update('city')}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-luxury-900 bg-white">
                    <option value="">{isRtl ? 'اختر المدينة' : 'Select City'}</option>
                    {['Riyadh / الرياض','Jeddah / جدة','Dammam / الدمام','Makkah / مكة','Madinah / المدينة','Khobar / الخبر'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Delivery options */}
              <h3 className="font-bold text-sm text-gray-700 mb-3">{isRtl ? 'طريقة التوصيل' : 'Delivery Method'}</h3>
              <div className="space-y-2">
                {[
                  { id: 'standard', icon: <Truck size={16}/>, labelEn: 'Standard Delivery', labelAr: 'توصيل عادي', subEn: '2–4 days', subAr: '2-4 أيام', price: subtotal>=200 ? 0 : 25 },
                  { id: 'express', icon: <Truck size={16}/>, labelEn: 'Express Delivery', labelAr: 'توصيل سريع', subEn: 'Next day', subAr: 'اليوم التالي', price: 49 },
                  { id: 'pickup', icon: <Store size={16}/>, labelEn: 'Click & Collect', labelAr: 'استلام من الفرع', subEn: 'Free — Today', subAr: 'مجاني — اليوم', price: 0 },
                ].map(d => (
                  <label key={d.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${delivery===d.id ? 'border-luxury-900 bg-luxury-900/5' : 'border-gray-100 hover:border-gray-300'}`}>
                    <input type="radio" name="delivery" value={d.id} checked={delivery===d.id} onChange={() => setDelivery(d.id)} className="accent-luxury-900"/>
                    <span className="text-luxury-900">{d.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{isRtl ? d.labelAr : d.labelEn}</div>
                      <div className="text-xs text-gray-400">{isRtl ? d.subAr : d.subEn}</div>
                    </div>
                    <span className={`text-sm font-black ${d.price===0 ? 'text-green-600' : 'text-gray-700'}`}>
                      {d.price===0 ? (isRtl ? 'مجاني' : 'FREE') : `SAR ${d.price}`}
                    </span>
                  </label>
                ))}
              </div>

              <button onClick={() => setStep(2)} className="btn-primary w-full justify-center mt-6">
                {isRtl ? 'التالي: طريقة الدفع' : 'Next: Payment'} →
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard size={18} className="text-luxury-900"/>
                <h2 className="font-black text-luxury-900">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map(pm => (
                  <label key={pm.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment===pm.id ? 'border-luxury-900 bg-luxury-900/5' : 'border-gray-100 hover:border-gray-300'}`}>
                    <input type="radio" name="payment" value={pm.id} checked={payment===pm.id} onChange={() => setPayment(pm.id)} className="accent-luxury-900"/>
                    <span className="text-2xl">{pm.iconEn}</span>
                    <div>
                      <div className="text-sm font-bold">{isRtl ? pm.labelAr : pm.labelEn}</div>
                      <div className="text-xs text-gray-400">{isRtl ? pm.subAr : pm.subEn}</div>
                    </div>
                  </label>
                ))}
              </div>
              {payment === 'card' && (
                <div className="mt-5 p-4 bg-gray-50 rounded-xl space-y-3">
                  <input placeholder={isRtl ? 'رقم البطاقة' : 'Card Number'} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none"/>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder={isRtl ? 'MM / YY' : 'MM / YY'} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none"/>
                    <input placeholder="CVV" className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none"/>
                  </div>
                  <input placeholder={isRtl ? 'اسم صاحب البطاقة' : 'Cardholder Name'} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none"/>
                </div>
              )}
              <button onClick={() => setStep(3)} className="btn-primary w-full justify-center mt-5">
                {isRtl ? 'التالي: مراجعة الطلب' : 'Next: Review Order'} →
              </button>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-black text-luxury-900 mb-5">{isRtl ? 'مراجعة الطلب' : 'Review Order'}</h2>
              <div className="space-y-3 mb-5">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{isRtl ? item.nameAr : item.name}</p>
                      {item.size && <p className="text-[10px] text-gray-400">{isRtl ? 'المقاس:' : 'Size:'} {item.size} · ×{item.qty}</p>}
                    </div>
                    <span className="text-sm font-bold text-luxury-900">SAR {(item.price*item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleOrder} className="btn-gold w-full justify-center text-lg py-4">
                ✓ {isRtl ? 'تأكيد الطلب' : 'Place Order'}
              </button>
              <p className="text-xs text-center text-gray-400 mt-3">
                {isRtl ? 'بالضغط أعلاه أنت توافق على الشروط والأحكام' : 'By placing your order you agree to our Terms & Conditions'}
              </p>
            </div>
          )}
        </div>

        {/* Summary sticky */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-fit sticky top-24">
          <h2 className="font-black text-lg text-luxury-900 mb-4">{isRtl ? 'ملخص الطلب' : 'Order Summary'}</h2>
          <p className="text-xs text-gray-400 mb-3">{items.length} {isRtl ? 'منتج' : 'items'}</p>
          <div className="space-y-2.5 mb-5">
            <div className="flex justify-between text-sm text-gray-600"><span>{isRtl ? 'المجموع الفرعي' : 'Subtotal'}</span><span>SAR {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>{isRtl ? 'ضريبة القيمة المضافة' : 'VAT 15%'}</span><span>SAR {vat.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{isRtl ? 'الشحن' : 'Shipping'}</span>
              <span className={shipping===0 ? 'text-green-600 font-bold' : ''}>{shipping===0 ? (isRtl?'مجاني':'FREE') : `SAR ${shipping}`}</span>
            </div>
            <div className="flex justify-between font-black text-luxury-900 text-base pt-3 border-t">
              <span>{isRtl ? 'الإجمالي' : 'Total'}</span><span>SAR {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {['🔒 Secured by SSL','✅ ZATCA Invoice','🛡 Fraud Protection'].map(b => (
              <span key={b} className="text-[10px] text-gray-400">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
