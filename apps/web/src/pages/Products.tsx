import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
export default function Products() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/catalog/products').then(r => r.data) });
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('products')}</h2>
      {isLoading ? <p className="text-gray-500">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              {[t('name'), t('category'), t('brand'), 'Variants', t('status')].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data?.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.brand_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.variants?.length || 0}</td>
                  <td className="px-4 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
