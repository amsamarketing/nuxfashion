import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useLang } from '../context/LangContext';
const today = new Date().toISOString().split('T')[0];
const yearStart = today.slice(0,4) + '-01-01';
export default function Finance() {
  const { t } = useLang();
  const { data: pl } = useQuery({ queryKey: ['pl'], queryFn: () => api.get('/finance/reports/profit-loss?from=' + yearStart + '&to=' + today).then(r => r.data) });
  const { data: vat } = useQuery({ queryKey: ['vat'], queryFn: () => api.get('/finance/reports/vat?from=' + yearStart + '&to=' + today).then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/finance/accounts').then(r => r.data) });
  const fmt = (n: any) => parseFloat(n || 0).toLocaleString(undefined, {maximumFractionDigits:2}) + ' ' + t('sar');
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('finance')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pl && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">P&L — YTD</h3>
            <div className="space-y-2 text-sm">
              {([['Revenue', pl.revenue, 'text-green-600'], ['COGS', pl.cogs, 'text-red-500'], ['Gross Profit', pl.gross_profit, 'text-purple-600 font-bold'], ['Total OpEx', pl.operating_expenses?.total, 'text-red-500'], ['Net Profit', pl.net_profit, pl.net_profit >= 0 ? 'text-green-600 font-bold text-base' : 'text-red-600 font-bold text-base']] as [string,any,string][]).map(([label, val, cls]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-1.5">
                  <span className="text-gray-600">{label}</span><span className={cls}>{fmt(val)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1"><span className="text-gray-500 text-xs">Net Margin</span><span className="text-xs font-medium">{pl.net_margin}</span></div>
            </div>
          </div>
        )}
        {vat && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">VAT Report — YTD</h3>
            <div className="space-y-2 text-sm">
              {([['Output VAT (Sales)', vat.output_vat?.vat, 'text-green-600'], ['Input VAT (Purchases)', vat.input_vat?.total, 'text-red-500'], ['VAT Payable', vat.vat_payable, 'text-purple-600 font-bold text-base']] as [string,any,string][]).map(([label, val, cls]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-1.5">
                  <span className="text-gray-600">{label}</span><span className={cls}>{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Chart of Accounts</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{['Code','Account','Type','Balance'].map(h => <th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {accounts?.map((a: any) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">{a.code}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-2 capitalize text-gray-500">{a.type}</td>
                <td className="px-4 py-2 font-medium">{fmt(a.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
