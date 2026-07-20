import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
export default function Inventory() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: () => api.get('/inventory').then(r => r.data) });
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('inventory')}</h2>
      {isLoading ? <p className="text-gray-500">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              {[t('sku'), t('name'), t('warehouse'), t('qty'), 'Reorder At', t('status')].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data?.map((i: any) => {
                const low = i.quantity <= i.reorder_point;
                return (
                  <tr key={i.id} className={"hover:bg-gray-50 " + (low ? 'bg-red-50' : '')}>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i.sku}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{i.product_name}</td>
                    <td className="px-4 py-3 text-gray-500">{i.warehouse_name}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{i.quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{i.reorder_point}</td>
                    <td className="px-4 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (low ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>{low ? '⚠️ Low' : '✓ OK'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
