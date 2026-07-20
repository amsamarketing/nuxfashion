import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
export default function HR() {
  const { t } = useLang();
  const { data: employees, isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/hr/employees').then(r => r.data) });
  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/hr/departments').then(r => r.data) });
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('hr')}</h2>
      {depts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {depts.map((d: any) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="font-semibold text-gray-900">{d.name}</p>
              <p className="text-purple-600 text-2xl font-bold mt-1">{d.employee_count || 0}</p>
              <p className="text-xs text-gray-400">employees</p>
            </div>
          ))}
        </div>
      )}
      {isLoading ? <p className="text-gray-500">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              {[t('name'), 'Department', 'Position', 'Salary', t('status')].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {employees?.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                  <td className="px-4 py-3 text-gray-500">{e.department_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.position || '—'}</td>
                  <td className="px-4 py-3 font-medium">{parseFloat(e.basic_salary || 0).toLocaleString()} {t('sar')}</td>
                  <td className="px-4 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium capitalize " + (e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
