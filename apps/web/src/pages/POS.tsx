import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';

interface CartItem { variantId: string; sku: string; name: string; price: number; qty: number; }

export default function POS() {
  const { t, isRTL } = useLang();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState<'cash'|'card'>('cash');
  const [receipt, setReceipt] = useState<any>(null);

  const { data: products } = useQuery({ queryKey: ['pos-products'],
    queryFn: () => api.get('/catalog/products').then(r => r.data) });

  const orderMutation = useMutation({
    mutationFn: async () => {
      const lines = cart.map(i => ({ variant_id: i.variantId, quantity: i.qty, unit_price: i.price }));
      const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = subtotal * 0.15;
      const order = await api.post('/sales/orders', { lines, subtotal, tax_amount: tax, discount_amount: 0, total: subtotal + tax });
      await api.post('/sales/payments', { order_id: order.data.id, method: payMethod, amount: order.data.total });
      return order.data;
    },
    onSuccess: (data) => { setReceipt(data); setCart([]); },
  });

  const addToCart = (variant: any, productName: string) => {
    setCart(prev => {
      const ex = prev.find(i => i.variantId === variant.id);
      if (ex) return prev.map(i => i.variantId === variant.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { variantId: variant.id, sku: variant.sku, name: productName + ' — ' + variant.name, price: parseFloat(variant.selling_price), qty: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) => setCart(prev => prev.map(i => i.variantId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.variantId !== id));
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const filtered = (products || []).filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (receipt) return (
    <div className="p-6 max-w-md mx-auto text-center">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful</h2>
        <p className="text-gray-500 text-sm mb-4">Order #{receipt.order_number}</p>
        <p className="text-3xl font-bold text-purple-600 mb-6">{parseFloat(receipt.total).toLocaleString()} {t('sar')}</p>
        <button onClick={() => setReceipt(null)} className="w-full bg-purple-600 text-white rounded-lg py-3 font-medium hover:bg-purple-700">New Sale</button>
      </div>
    </div>
  );

  return (
    <div className={"flex h-full " + (isRTL ? 'flex-row-reverse' : '')}>
      <div className="flex-1 p-4 overflow-auto">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p: any) => p.variants?.map((v: any) => (
            <button key={v.id} onClick={() => addToCart(v, p.name)}
              className="bg-white rounded-xl shadow-sm p-3 text-left hover:shadow-md hover:ring-2 hover:ring-purple-400 transition-all">
              <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{v.sku}</p>
              <p className="text-purple-600 font-bold mt-2">{parseFloat(v.selling_price).toLocaleString()} {t('sar')}</p>
              {v.name && <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 mt-1 inline-block">{v.name}</span>}
            </button>
          )))}
        </div>
      </div>
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">{t('cart')}</h3>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">{t('clearCart')}</button>}
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {cart.length === 0 && <p className="text-center text-gray-400 text-sm mt-8">{t('noData')}</p>}
          {cart.map(item => (
            <div key={item.variantId} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-900 flex-1 leading-tight">{item.name}</p>
                <button onClick={() => removeItem(item.variantId)} className="text-red-400 text-xs ml-2">✕</button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.variantId, -1)} className="w-6 h-6 rounded-full bg-gray-200 text-sm font-bold flex items-center justify-center hover:bg-gray-300">−</button>
                  <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.variantId, 1)} className="w-6 h-6 rounded-full bg-gray-200 text-sm font-bold flex items-center justify-center hover:bg-gray-300">+</button>
                </div>
                <span className="text-sm font-bold text-purple-600">{(item.price * item.qty).toLocaleString()} {t('sar')}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>{t('subtotal')}</span><span>{subtotal.toLocaleString()} {t('sar')}</span></div>
            <div className="flex justify-between text-gray-600"><span>{t('vat')}</span><span>{vat.toFixed(2)} {t('sar')}</span></div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t"><span>{t('total')}</span><span>{total.toFixed(2)} {t('sar')}</span></div>
          </div>
          <div className="flex gap-2">
            {(['cash','card'] as const).map(m => (
              <button key={m} onClick={() => setPayMethod(m)}
                className={"flex-1 py-2 rounded-lg text-sm font-medium transition-colors " + (payMethod === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {t(m)}
              </button>
            ))}
          </div>
          <button onClick={() => orderMutation.mutate()} disabled={cart.length === 0 || orderMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 font-bold text-base transition-colors disabled:opacity-50">
            {orderMutation.isPending ? t('loading') : t('pay') + ' ' + total.toFixed(2) + ' ' + t('sar')}
          </button>
          {orderMutation.isError && <p className="text-red-500 text-xs text-center">Payment failed. Try again.</p>}
        </div>
      </div>
    </div>
  );
}
