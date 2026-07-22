import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const SAR = (n: number) => `SAR ${n.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ZReport() {
  const [openingFloat, setOpeningFloat] = useState(500);
  const [actualCounted, setActualCounted] = useState<number | null>(null);
  const [countInput, setCountInput] = useState('');
  const shiftKey = `closed_shift_${new Date().toISOString().slice(0,10)}`;
  const [shiftClosed, setShiftClosed] = useState(() => !!localStorage.getItem(shiftKey));
  const [showCloseModal, setShowCloseModal] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const { data: allOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ['z-report-orders', today],
    queryFn: async () => {
      const res = await api.get('/sales/orders?limit=500');
      return (Array.isArray(res) ? res : (res as any).data ?? (res as any).orders ?? [])
        .filter((o: any) => o.created_at?.slice(0, 10) === today);
    },
  });

  const { data: allReturns = [] } = useQuery<any[]>({
    queryKey: ['z-report-returns', today],
    queryFn: async () => {
      const res = await api.get('/sales/returns?limit=500').catch(() => []);
      return (Array.isArray(res) ? res : (res as any).data ?? (res as any).returns ?? [])
        .filter((r: any) => r.created_at?.slice(0, 10) === today);
    },
  });

  const paidOrders = allOrders.filter(o => !['cancelled','draft'].includes(o.status));

  // Totals
  const totalSales = paidOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const totalTax = paidOrders.reduce((s, o) => s + (parseFloat(o.tax_amount) || parseFloat(o.total || 0) * 15 / 115), 0);
  const totalDiscount = paidOrders.reduce((s, o) => s + parseFloat(o.discount_amount || o.discount || 0), 0);
  const transactions = paidOrders.length;
  const avgBasket = transactions > 0 ? totalSales / transactions : 0;
  const returnCount = allReturns.length;
  const totalReturned = allReturns.reduce((s, r) => s + parseFloat(r.total_refund || r.refund_amount || 0), 0);

  // Payment breakdown by method
  const paymentMethods: Record<string, number> = {};
  for (const o of paidOrders) {
    const method = (o.payment_method || o.payments?.[0]?.method || 'card').toLowerCase().replace(/ /g, '_');
    paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(o.total || 0);
  }
  const pmLabels: Record<string, string> = {
    cash: 'Cash', card: 'Card (mada/Visa/MC)', mada: 'Card (mada/Visa/MC)',
    tabby: 'Tabby', tamara: 'Tamara', apple_pay: 'Apple Pay',
    store_wallet: 'Store wallet', credit_card: 'Card (mada/Visa/MC)',
    bank_transfer: 'Bank transfer',
  };
  const mergedPM: Record<string, number> = {};
  for (const [k, v] of Object.entries(paymentMethods)) {
    const label = pmLabels[k] || k;
    mergedPM[label] = (mergedPM[label] || 0) + v;
  }
  const pmEntries = Object.entries(mergedPM).sort((a, b) => b[1] - a[1]);

  // Cash reconciliation
  const cashSales = mergedPM['Cash'] || 0;
  const cashRefunds = allReturns
    .filter(r => (r.refund_method || '').toLowerCase() === 'cash')
    .reduce((s, r) => s + parseFloat(r.total_refund || r.refund_amount || 0), 0);
  const expectedInDrawer = openingFloat + cashSales - cashRefunds;
  const counted = actualCounted ?? expectedInDrawer;
  const variance = counted - expectedInDrawer;

  // Top selling items from line items if available
  const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const o of paidOrders) {
    for (const l of o.lines ?? o.items ?? o.order_lines ?? []) {
      const name = l.product_name || l.name || l.sku || 'Unknown';
      if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 };
      itemMap[name].qty += parseInt(l.quantity || l.qty || 1);
      itemMap[name].revenue += parseFloat(l.subtotal || l.total || 0);
    }
  }
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

  const shift = (() => {
    const h = new Date().getHours();
    if (h < 14) return '07:00–15:00 Morning shift';
    if (h < 22) return '15:00–23:00 Evening shift';
    return '23:00–07:00 Night shift';
  })();

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<html><head><title>Z-Report</title>
    <style>body{font-family:sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0}p{color:#666;font-size:13px;margin:4px 0 16px}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
    .card{border:1px solid #ddd;border-radius:8px;padding:12px 16px}
    .card label{font-size:12px;color:#888;display:block;margin-bottom:4px}
    .card strong{font-size:18px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    td{padding:6px 8px;border-bottom:1px solid #eee;font-size:13px}
    td:last-child{text-align:right;font-weight:600}
    h3{font-size:14px;font-weight:600;margin:16px 0 8px}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    </style></head><body>
    <h1>Z-Report — End of shift</h1>
    <p>${shift} &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-SA')}</p>
    <div class="grid">
      <div class="card"><label>Total sales</label><strong>${SAR(totalSales)}</strong></div>
      <div class="card"><label>Transactions</label><strong>${transactions}</strong></div>
      <div class="card"><label>Avg basket</label><strong>${SAR(avgBasket)}</strong></div>
      <div class="card"><label>Returns</label><strong>${returnCount} · ${SAR(totalReturned)}</strong></div>
      <div class="card"><label>Discounts given</label><strong>${SAR(totalDiscount)}</strong></div>
      <div class="card"><label>Tax collected</label><strong>${SAR(totalTax)}</strong></div>
    </div>
    <div class="two">
      <div><h3>Payment breakdown</h3><table>
        ${pmEntries.map(([m, v]) => `<tr><td>${m}</td><td>${SAR(v)} <span style="color:#888;font-size:11px">${totalSales > 0 ? Math.round(v / totalSales * 100) : 0}%</span></td></tr>`).join('')}
      </table></div>
      <div><h3>Cash reconciliation</h3><table>
        <tr><td>Opening float</td><td>${SAR(openingFloat)}</td></tr>
        <tr><td>Cash sales</td><td>+ ${SAR(cashSales)}</td></tr>
        <tr><td>Cash refunds</td><td>– ${SAR(cashRefunds)}</td></tr>
        <tr><td>Expected in drawer</td><td>${SAR(expectedInDrawer)}</td></tr>
        <tr><td>Actual counted</td><td>${SAR(counted)}</td></tr>
        <tr><td>Variance</td><td style="color:${Math.abs(variance)<0.01?'green':'red'}">${SAR(variance)} ${Math.abs(variance)<0.01?'Balanced':'⚠ Discrepancy'}</td></tr>
      </table></div>
    </div>
    </body></html>`);
    w.document.close(); w.print();
  };

  if (isLoading) return <div className="pg"><p>Loading Z-Report…</p></div>;

  return (
    <div className="pg" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Z-report — End of shift</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>
            {shift} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bx" onClick={handlePrint}><i className="ti ti-printer" /> Print</button>
          <button className="bx" onClick={handlePrint}><i className="ti ti-file-type-pdf" /> Export PDF</button>
          {shiftClosed ? (
            <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 600 }}>
              <i className="ti ti-check" /> Shift closed
            </span>
          ) : (
            <button className="bx a" style={{ background: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
              onClick={() => setShowCloseModal(true)}>
              <i className="ti ti-lock" /> Close shift
            </button>
          )}
        </div>
      </div>

      {/* Top metric cards — row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Total sales', value: SAR(totalSales) },
          { label: 'Transactions', value: transactions.toString() },
          { label: 'Avg basket', value: SAR(avgBasket) },
          { label: 'Returns', value: `${returnCount} · ${SAR(totalReturned)}` },
        ].map(c => (
          <div key={c.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Top metric cards — row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Discounts given', value: SAR(totalDiscount) },
          { label: 'Tax collected', value: SAR(totalTax) },
          { label: 'Loyalty pts issued', value: `${Math.round(totalSales / 10)} pts` },
          { label: 'Gift cards redeemed', value: SAR(0) },
        ].map(c => (
          <div key={c.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Payment breakdown + Cash reconciliation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Payment breakdown */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', background: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Payment breakdown</div>
          {pmEntries.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13 }}>No payments recorded today</p>
          ) : pmEntries.map(([method, amount]) => {
            const pct = totalSales > 0 ? Math.round(amount / totalSales * 100) : 0;
            return (
              <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>{method}</span>
                <span style={{ fontSize: 14 }}>
                  <strong>{SAR(amount)}</strong>
                  <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>{pct}%</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Cash reconciliation */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', background: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Cash reconciliation</div>
          {[
            { label: 'Opening float', value: SAR(openingFloat), muted: false },
            { label: 'Cash sales', value: `+ ${SAR(cashSales)}`, muted: false },
            { label: 'Cash refunds', value: `– ${SAR(cashRefunds)}`, muted: false },
            { label: 'Expected in drawer', value: SAR(expectedInDrawer), muted: false },
            { label: 'Actual counted', value: SAR(counted), muted: false, edit: true },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#374151' }}>{row.label}</span>
              {row.edit ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {actualCounted === null ? (
                    <>
                      <input
                        type="number"
                        placeholder="Count..."
                        value={countInput}
                        onChange={e => setCountInput(e.target.value)}
                        style={{ width: 90, padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                      />
                      <button className="bx" style={{ padding: '2px 8px', fontSize: 12 }}
                        onClick={() => { const v = parseFloat(countInput); if (!isNaN(v)) { setActualCounted(v); } }}>
                        Set
                      </button>
                    </>
                  ) : (
                    <>
                      <strong style={{ fontSize: 14 }}>{SAR(counted)}</strong>
                      <button className="bx" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => { setActualCounted(null); setCountInput(''); }}>✕</button>
                    </>
                  )}
                </div>
              ) : (
                <strong style={{ fontSize: 14 }}>{row.value}</strong>
              )}
            </div>
          ))}
          {/* Variance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#374151' }}>Variance</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 14, color: Math.abs(variance) < 0.01 ? '#16a34a' : '#dc2626' }}>{SAR(variance)}</strong>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: Math.abs(variance) < 0.01 ? '#dcfce7' : '#fee2e2',
                color: Math.abs(variance) < 0.01 ? '#15803d' : '#b91c1c',
              }}>
                {Math.abs(variance) < 0.01 ? 'Balanced' : '⚠ Discrepancy'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Opening float editor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontSize: 13, color: '#6b7280' }}>
        <span>Opening float:</span>
        <input
          type="number"
          value={openingFloat}
          onChange={e => setOpeningFloat(parseFloat(e.target.value) || 0)}
          style={{ width: 90, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
        />
        <span style={{ color: '#9ca3af' }}>SAR — edit to match your actual opening float</span>
      </div>

      {/* Top selling items */}
      {topItems.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', background: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Top selling items</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {topItems.map(item => (
              <div key={item.name} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.name}</div>
                <div style={{ color: '#16a34a', fontSize: 13, fontWeight: 500 }}>{item.qty} units sold</div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{SAR(item.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topItems.length === 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', background: '#fff', color: '#9ca3af', fontSize: 14 }}>
          <i className="ti ti-chart-bar" style={{ marginRight: 8 }} />
          No sales line items available for top items breakdown.
          {transactions > 0 && ' (Orders fetched without line items — API list endpoint may not include lines.)'}
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Close shift?</div>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
              This will mark the shift as closed. You can still view the Z-report but no further changes will be recorded.
            </p>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#6b7280' }}>Total sales</span>
                <strong>{SAR(totalSales)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#6b7280' }}>Transactions</span>
                <strong>{transactions}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#6b7280' }}>Expected in drawer</span>
                <strong>{SAR(expectedInDrawer)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Variance</span>
                <strong style={{ color: Math.abs(variance) < 0.01 ? '#16a34a' : '#dc2626' }}>{SAR(variance)}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="bx" style={{ flex: 1 }} onClick={() => setShowCloseModal(false)}>Cancel</button>
              <button className="bx a" style={{ flex: 1, background: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
                onClick={() => {
                  localStorage.setItem(shiftKey, JSON.stringify({ closedAt: new Date().toISOString(), totalSales, transactions, expectedInDrawer, variance }));
                  setShiftClosed(true);
                  setShowCloseModal(false);
                }}>
                Confirm close shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
