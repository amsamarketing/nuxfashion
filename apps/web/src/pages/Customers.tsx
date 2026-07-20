import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
export default function Customers() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers').then(r => r.data) });
  const tierColor: Record<string,string> = { bronze:'bg-orange-100 text-orange-700', silver:'bg-gray-100 text-gray-600', gold:'bg-yellow-100 text-yellow-700', vip:'bg-purple-100 text-purple-700' };
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('customers')}</h2>
      {isLoading ? <p className="text-gray-500">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              {[t('name'), t('phone'), 'Tier', 'Points', 'Joined'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium capitalize " + (tierColor[c.loyalty_tier] || 'bg-gray-100 text-gray-500')}>{c.loyalty_tier}</span></td>
                  <td className="px-4 py-3 text-purple-600 font-medium">{c.loyalty_points}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
