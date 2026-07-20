import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data) });
  if (isLoading) return <div className="p-8 text-gray-500">{t('loading')}</div>;
  const fmt = (n: any) => parseFloat(n || 0).toLocaleString() + ' ' + t('sar');
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('dashboard')}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('todaySales')} value={fmt(data?.today?.revenue)} icon="💵" color="green" sub={data?.today?.orders + ' ' + t('orders')} />
        <StatCard label={t('monthSales')} value={fmt(data?.this_month?.revenue)} icon="📅" color="purple" sub={data?.this_month?.orders + ' ' + t('orders')} />
        <StatCard label={t('invValue')} value={fmt(data?.inventory?.value)} icon="📦" color="blue" sub={data?.inventory?.variants + ' variants'} />
        <StatCard label={t('customers_')} value={data?.customers?.total || 0} icon="👥" color="orange" sub={'+' + data?.customers?.new_this_month + ' this month'} />
      </div>
      {(data?.alerts?.low_stock_variants > 0 || data?.alerts?.open_purchase_orders > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {data?.alerts?.low_stock_variants > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div><p className="font-semibold text-red-700">{t('lowStock')}</p>
                <p className="text-red-500 text-sm">{data.alerts.low_stock_variants} variants need restocking</p></div>
            </div>
          )}
          {data?.alerts?.open_purchase_orders > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">🚚</span>
              <div><p className="font-semibold text-amber-700">{t('openPOs')}</p>
                <p className="text-amber-500 text-sm">{data.alerts.open_purchase_orders} pending</p></div>
            </div>
          )}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-3">{t('monthSales')} Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-purple-600">{data?.this_month?.orders || 0}</p><p className="text-xs text-gray-500">{t('orders')}</p></div>
          <div><p className="text-2xl font-bold text-green-600">{fmt(data?.this_month?.revenue)}</p><p className="text-xs text-gray-500">{t('revenue')}</p></div>
          <div><p className="text-2xl font-bold text-orange-500">{fmt(data?.this_month?.discounts)}</p><p className="text-xs text-gray-500">{t('discounts')}</p></div>
        </div>
      </div>
    </div>
  );
}
