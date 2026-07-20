import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
export default function Purchasing() {
  const { t } = useLang();
  const { data } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => api.get('/purchasing/orders').then(r => r.data) });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/purchasing/suppliers').then(r => r.data) });
  const statusColor: Record<string,string> = { draft:'bg-gray-100 text-gray-600', approved:'bg-blue-100 text-blue-700', sent:'bg-yellow-100 text-yellow-700', received:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-600' };
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('purchasing')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {suppliers?.slice(0,4).map((s: any) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm p-4">
            <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.contact_name || '—'}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            {['PO #', t('supplier'), t('date'), t('total'), t('status')].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((po: any) => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{po.po_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{po.supplier_name}</td>
                <td className="px-4 py-3 text-gray-500">{po.order_date?.slice(0,10)}</td>
                <td className="px-4 py-3 font-medium">{parseFloat(po.total || 0).toLocaleString()} {t('sar')}</td>
                <td className="px-4 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium capitalize " + (statusColor[po.status] || 'bg-gray-100 text-gray-500')}>{po.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
