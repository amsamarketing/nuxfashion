import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
const today = new Date().toISOString().split('T')[0];
const monthStart = today.slice(0,7) + '-01';
export default function Reports() {
  const { t } = useLang();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const { data: byPeriod } = useQuery({ queryKey: ['rpt-period', from, to], queryFn: () => api.get('/reports/sales/by-period?group_by=day&from=' + from + '&to=' + to).then(r => r.data) });
  const { data: byProduct } = useQuery({ queryKey: ['rpt-product', from, to], queryFn: () => api.get('/reports/sales/by-product?from=' + from + '&to=' + to + '&limit=10').then(r => r.data) });
  const { data: payments } = useQuery({ queryKey: ['rpt-pay', from, to], queryFn: () => api.get('/reports/sales/payments?from=' + from + '&to=' + to).then(r => r.data) });
  const fmt = (n: any) => parseFloat(n || 0).toLocaleString(undefined, {maximumFractionDigits:2});
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">{t('reports')}</h2>
        <div className="flex gap-2 items-center">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          <span className="text-gray-400">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Sales by Day</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>{[t('date'),t('orders'),t('revenue')].map(h=><th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {byPeriod?.map((r: any) => (<tr key={r.period} className="hover:bg-gray-50"><td className="px-4 py-2 text-gray-600">{r.period?.slice(0,10)}</td><td className="px-4 py-2">{r.orders}</td><td className="px-4 py-2 font-medium text-purple-600">{fmt(r.revenue)} {t('sar')}</td></tr>))}
              {!byPeriod?.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">{t('noData')}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Top Products</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>{[t('sku'),t('name'),'Qty',t('revenue')].map(h=><th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {byProduct?.map((r: any, i: number) => (<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-2 text-gray-400 font-mono text-xs">{r.sku}</td><td className="px-4 py-2">{r.product}</td><td className="px-4 py-2">{r.qty_sold}</td><td className="px-4 py-2 font-medium text-purple-600">{fmt(r.revenue)} {t('sar')}</td></tr>))}
              {!byProduct?.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">{t('noData')}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Payment Methods</h3></div>
          <div className="p-5 space-y-3">
            {payments?.map((r: any) => {
              const total = (payments || []).reduce((s: number, x: any) => s + parseFloat(x.total), 0);
              const share = total > 0 ? (parseFloat(r.total) / total * 100).toFixed(0) : 0;
              return (<div key={r.method}><div className="flex justify-between text-sm mb-1"><span className="capitalize font-medium text-gray-700">{r.method}</span><span className="text-gray-500">{fmt(r.total)} {t('sar')} ({share}%)</span></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-purple-500 rounded-full" style={{width: share + '%'}} /></div></div>);
            })}
            {!payments?.length && <p className="text-center text-gray-400 py-4">{t('noData')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
