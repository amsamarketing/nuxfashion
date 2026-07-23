import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => 'SAR ' + (n || 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n: number) => { const a = Math.abs(n || 0); const s = n < 0 ? '-' : ''; return s + (a >= 1e6 ? 'SAR ' + (a / 1e6).toFixed(1) + 'M' : a >= 1000 ? 'SAR ' + (a / 1000).toFixed(1) + 'k' : 'SAR ' + a.toFixed(0)); };
const pct  = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

/** Pick first non-null value from the object by trying multiple keys */
function g(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (row[k] != null) return row[k];
  return null;
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv  = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename + '.csv';
  a.click();
}

// ── BarChart ─────────────────────────────────────────────────────────────────
function BarChart({ data, xKey, yKey, color = 'var(--ac)' }: { data: Record<string, unknown>[]; xKey: string; yKey: string; color?: string }) {
  if (!data.length) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>No data</div>;
  const max = Math.max(...data.map(d => Number(d[yKey]) || 0), 1);
  const W   = Math.max(data.length * 44, 400);
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} 140`} style={{ width: '100%', minWidth: W, height: 140 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(r => <line key={r} x1={0} y1={100 * (1 - r)} x2={W} y2={100 * (1 - r)} stroke="var(--bd)" strokeWidth={0.5} />)}
        {data.map((d, i) => {
          const h = Math.max(2, (Number(d[yKey]) || 0) / max * 90);
          const x = i * 44 + 7;
          return (
            <g key={i}>
              <rect x={x} y={100 - h} width={30} height={h} fill={color} rx={3} opacity={0.85} />
              <text x={x + 15} y={115} textAnchor="middle" fontSize={8} fill="var(--mu)">{String(d[xKey] || '').slice(0, 8)}</text>
              <title>{String(d[xKey])}: {fmt(Number(d[yKey]))}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: string; color: string }) {
  return (
    <div className="nx-stat">
      <div className={`nx-stat-icon ${color}`}><i className={`ti ${icon}`} /></div>
      <div className="nx-stat-body">
        <div className="nx-stat-val">{value}</div>
        <div className="nx-stat-lbl">{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
type Col = { label: string; get: (r: Record<string, unknown>) => unknown; fmt?: (v: unknown, r: Record<string, unknown>) => React.ReactNode };

function Table({ cols, rows, onExport, filename }: { cols: Col[]; rows: Record<string, unknown>[]; onExport?: () => void; filename?: string }) {
  if (!rows.length) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>No data for this period</div>;
  return (
    <div>
      {onExport && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn-nx ghost sm" onClick={onExport}><i className="ti ti-download" /> Export {filename}</button>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bd)' }}>
              {cols.map((c, i) => <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                {cols.map((c, j) => { const v = c.get(r); return <td key={j} style={{ padding: '9px 12px', fontSize: 13 }}>{c.fmt ? c.fmt(v, r) : v != null ? String(v) : '—'}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ProgressList ──────────────────────────────────────────────────────────────
function ProgressList({ data, getLabel, getValue, color = 'var(--ac)', formatVal }: { data: Record<string, unknown>[]; getLabel: (r: Record<string, unknown>) => string; getValue: (r: Record<string, unknown>) => number; color?: string; formatVal: (v: number) => string }) {
  if (!data.length) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>No data</div>;
  const max = Math.max(...data.map(r => getValue(r)), 1);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {data.map((d, i) => {
        const val = getValue(d);
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ fontWeight: i < 3 ? 700 : 400 }}>{['🥇','🥈','🥉'][i] ?? ''} {getLabel(d) || '—'}</span>
              <span style={{ fontWeight: 600, color }}>{formatVal(val)}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: pct(val, max), background: color, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Reports page ──────────────────────────────────────────────────────────────
export default function Reports() {
  const [tab,     setTab]     = useState('dashboard');
  const [from,    setFrom]    = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to,      setTo]      = useState(new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState('day');
  const qs = `from=${from}&to=${to}`;

  const setQuick = (p: string) => {
    const n = new Date();
    if (p === 'today')   { const d = n.toISOString().slice(0, 10); setFrom(d); setTo(d); }
    if (p === 'week')    { const d = new Date(n); d.setDate(n.getDate() - n.getDay()); setFrom(d.toISOString().slice(0, 10)); setTo(n.toISOString().slice(0, 10)); }
    if (p === 'month')   { setFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10)); setTo(new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10)); }
    if (p === 'quarter') { const q = Math.floor(n.getMonth() / 3); setFrom(new Date(n.getFullYear(), q * 3, 1).toISOString().slice(0, 10)); setTo(new Date(n.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10)); }
    if (p === 'year')    { setFrom(new Date(n.getFullYear(), 0, 1).toISOString().slice(0, 10)); setTo(new Date(n.getFullYear(), 11, 31).toISOString().slice(0, 10)); }
  };

  // ── queries ─────────────────────────────────────────────────────────────────
  const { data: dash }        = useQuery({ queryKey: ['rpt-dash'],                queryFn: async () => (await api.get('/reports/dashboard')).data,                              enabled: tab === 'dashboard'  });
  const { data: salesPeriod } = useQuery({ queryKey: ['rpt-period', from, to, groupBy], queryFn: async () => (await api.get(`/reports/sales/by-period?${qs}&group_by=${groupBy}`)).data, enabled: tab === 'sales' });
  const { data: salesProduct }= useQuery({ queryKey: ['rpt-product', from, to],  queryFn: async () => (await api.get(`/reports/sales/by-product?${qs}&limit=20`)).data,       enabled: tab === 'sales'      });
  const { data: salesCat }    = useQuery({ queryKey: ['rpt-cat', from, to],      queryFn: async () => (await api.get(`/reports/sales/by-category?${qs}`)).data,               enabled: tab === 'sales'      });
  const { data: salesStaff }  = useQuery({ queryKey: ['rpt-staff', from, to],    queryFn: async () => (await api.get(`/reports/sales/by-staff?${qs}`)).data,                  enabled: tab === 'sales'      });
  const { data: salesPay }    = useQuery({ queryKey: ['rpt-pay', from, to],      queryFn: async () => (await api.get(`/reports/sales/payments?${qs}`)).data,                  enabled: tab === 'sales'      });
  const { data: invVal }      = useQuery({ queryKey: ['rpt-val'],                 queryFn: async () => (await api.get('/reports/inventory/valuation')).data,                    enabled: tab === 'inventory'  });
  const { data: invLow }      = useQuery({ queryKey: ['rpt-low'],                 queryFn: async () => (await api.get('/reports/inventory/low-stock')).data,                    enabled: tab === 'inventory'  });
  const { data: invMov }      = useQuery({ queryKey: ['rpt-mov', from, to],      queryFn: async () => (await api.get(`/reports/inventory/movements?${qs}`)).data,             enabled: tab === 'inventory'  });
  const { data: custRpt }     = useQuery({ queryKey: ['rpt-cust', from, to],     queryFn: async () => (await api.get(`/reports/customers?${qs}`)).data,                       enabled: tab === 'customers'  });
  const { data: purchRpt }    = useQuery({ queryKey: ['rpt-purch', from, to],    queryFn: async () => (await api.get(`/reports/purchasing?${qs}`)).data,                      enabled: tab === 'purchasing' });
  const { data: hrRpt }       = useQuery({ queryKey: ['rpt-hr', from, to],       queryFn: async () => (await api.get(`/reports/hr?${qs}`)).data,                              enabled: tab === 'hr'         });

  // ── normalise response arrays ────────────────────────────────────────────────
  const arr = (d: unknown, ...keys: string[]): Record<string, unknown>[] => {
    if (!d) return [];
    const obj = d as Record<string, unknown>;
    for (const k of keys) { const v = obj[k]; if (Array.isArray(v)) return v as Record<string, unknown>[]; }
    return Array.isArray(d) ? d as Record<string, unknown>[] : [];
  };

  const periodRows  = arr(salesPeriod,  'data', 'records');
  const productRows = arr(salesProduct, 'data', 'products');
  const catRows     = arr(salesCat,     'data', 'categories');
  const staffRows   = arr(salesStaff,   'data', 'staff');
  const payRows     = arr(salesPay,     'data', 'methods');
  const valRows     = arr(invVal,       'data', 'items');
  const lowRows     = arr(invLow,       'data', 'items');
  const movRows     = arr(invMov,       'data', 'movements');
  const custRows    = arr(custRpt,      'customers', 'data');
  const purchRows   = arr(purchRpt,     'orders', 'data');
  const hrRows      = arr(hrRpt,        'employees', 'data');

  const totalRevenue = useMemo(() => periodRows.reduce((s, r) => s + (Number(g(r, 'total', 'revenue', 'amount')) || 0), 0), [periodRows]);
  const totalOrders  = useMemo(() => periodRows.reduce((s, r) => s + (Number(g(r, 'count', 'orders', 'order_count')) || 0), 0), [periodRows]);

  // detect the actual key names present in period data for BarChart
  const periodXKey = periodRows[0] ? (Object.keys(periodRows[0]).find(k => ['period', 'date', 'label'].includes(k)) ?? 'period') : 'period';
  const periodYKey = periodRows[0] ? (Object.keys(periodRows[0]).find(k => ['total', 'revenue', 'amount'].includes(k)) ?? 'total') : 'total';

  const ds = (dash ?? {}) as Record<string, unknown>;

  const STATUS_COLOR: Record<string, string> = { draft: 'grey', pending: 'amber', approved: 'indigo', received: 'green', cancelled: 'red', partial: 'teal', present: 'green', absent: 'red', late: 'amber' };
  const METHOD_ICON:  Record<string, string> = { cash: '💵', card: '💳', tabby: '🟢', tamara: '🟣', apple_pay: '🍎', mada: '🔵', bank_transfer: '🏦' };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Reports &amp; Analytics</h1>
          <p className="nx-page-sub">{from} → {to}</p>
        </div>
      </div>

      {/* date range bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', background: 'var(--cd)', borderRadius: 12, border: '1px solid var(--bd)' }}>
        <input type="date" className="nx-input" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 148 }} />
        <span style={{ color: 'var(--mu)', fontSize: 13 }}>to</span>
        <input type="date" className="nx-input" value={to}   onChange={e => setTo(e.target.value)}   style={{ width: 148 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['today', 'week', 'month', 'quarter', 'year'] as const).map(p => (
            <button key={p} className="btn-nx ghost sm" onClick={() => setQuick(p)} style={{ textTransform: 'capitalize' }}>{p}</button>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--bd)' }}>
        {[['dashboard','📊 Dashboard'], ['sales','💰 Sales'], ['inventory','📦 Inventory'], ['customers','👥 Customers'], ['purchasing','🚚 Purchasing'], ['hr','👨‍💼 HR']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 16px', border: 'none', background: 'none', borderBottom: tab === id ? '2px solid var(--ac)' : '2px solid transparent', color: tab === id ? 'var(--ac)' : 'var(--mu)', fontWeight: tab === id ? 600 : 400, cursor: 'pointer', fontSize: 13 }}>{l}</button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div>
          <div className="nx-stats cols-4" style={{ marginBottom: 20 }}>
            <StatCard label="Total Revenue"  value={fmtK(Number(g(ds, 'total_revenue',  'revenue'))  || 0)} icon="ti-trending-up"  color="green"  />
            <StatCard label="Total Orders"   value={(Number(g(ds, 'total_orders',   'orders'))   || 0).toLocaleString()} icon="ti-shopping-cart" color="indigo" />
            <StatCard label="Total Customers"value={(Number(g(ds, 'total_customers','customers')) || 0).toLocaleString()} icon="ti-users"         color="teal"   />
            <StatCard label="Avg Order Value" value={fmtK(Number(g(ds, 'avg_order_value','aov'))   || 0)} icon="ti-receipt"       color="amber"  />
          </div>

          {arr(ds, 'recent_sales', 'sales_trend').length > 0 && (
            <div className="nx-card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Sales Trend</div>
              <BarChart data={arr(ds, 'recent_sales', 'sales_trend')} xKey="date" yKey="total" color="var(--ac)" />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {arr(ds, 'top_products').length > 0 && (
              <div className="nx-card">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Top Products</div>
                <ProgressList data={arr(ds, 'top_products')} getLabel={r => String(g(r, 'name', 'product_name') || '—')} getValue={r => Number(g(r, 'revenue', 'total')) || 0} formatVal={fmtK} />
              </div>
            )}
            {arr(ds, 'sales_by_category').length > 0 && (
              <div className="nx-card">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>By Category</div>
                <ProgressList data={arr(ds, 'sales_by_category')} getLabel={r => String(g(r, 'category', 'name') || '—')} getValue={r => Number(g(r, 'total', 'revenue')) || 0} color="#6366f1" formatVal={fmtK} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SALES ── */}
      {tab === 'sales' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="nx-stats cols-4">
            <StatCard label="Revenue"     value={fmtK(totalRevenue)}                                   icon="ti-cash"          color="green"  />
            <StatCard label="Orders"      value={totalOrders.toLocaleString()}                          icon="ti-receipt"       color="indigo" />
            <StatCard label="Top Product" value={String(g(productRows[0] ?? {}, 'name', 'product_name') || '—')} sub={productRows[0] ? fmtK(Number(g(productRows[0], 'revenue', 'total')) || 0) : undefined} icon="ti-star"   color="amber" />
            <StatCard label="Top Category"value={String(g(catRows[0] ?? {}, 'category', 'name') || '—')}   sub={catRows[0]    ? fmtK(Number(g(catRows[0],    'total', 'revenue')) || 0) : undefined} icon="ti-category" color="teal"  />
          </div>

          <div className="nx-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Sales by Period</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['day', 'week', 'month'] as const).map(gb => <button key={gb} onClick={() => setGroupBy(gb)} className={`btn-nx ${groupBy === gb ? 'primary' : 'ghost'} sm`} style={{ textTransform: 'capitalize' }}>{gb}</button>)}
                <button className="btn-nx ghost sm" onClick={() => exportCSV(periodRows, `sales-${groupBy}-${from}-${to}`)}><i className="ti ti-download" /></button>
              </div>
            </div>
            <BarChart data={periodRows} xKey={periodXKey} yKey={periodYKey} color="#22c55e" />
            <Table cols={[
              { label: 'Period',    get: r => g(r, 'period', 'date', 'label') },
              { label: 'Revenue',   get: r => Number(g(r, 'total', 'revenue', 'amount')) || 0,   fmt: v => fmt(Number(v)) },
              { label: 'Orders',    get: r => Number(g(r, 'count', 'orders', 'order_count')) || 0 },
              { label: 'Avg Order', get: r => { const rev = Number(g(r, 'total', 'revenue')) || 0; const cnt = Number(g(r, 'count', 'orders')) || 1; return fmt(rev / cnt); } },
            ]} rows={periodRows} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="nx-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Top Products</div>
                <button className="btn-nx ghost sm" onClick={() => exportCSV(productRows, `top-products-${from}-${to}`)}><i className="ti ti-download" /></button>
              </div>
              <ProgressList data={productRows.slice(0, 10)} getLabel={r => String(g(r, 'name', 'product_name') || '—')} getValue={r => Number(g(r, 'revenue', 'total', 'amount')) || 0} formatVal={fmtK} />
            </div>
            <div className="nx-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>By Category</div>
                <button className="btn-nx ghost sm" onClick={() => exportCSV(catRows, `by-category-${from}-${to}`)}><i className="ti ti-download" /></button>
              </div>
              <ProgressList data={catRows} getLabel={r => String(g(r, 'category', 'name') || '—')} getValue={r => Number(g(r, 'total', 'revenue', 'amount')) || 0} color="#6366f1" formatVal={fmtK} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="nx-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Sales by Staff</div>
                <button className="btn-nx ghost sm" onClick={() => exportCSV(staffRows, `by-staff-${from}-${to}`)}><i className="ti ti-download" /></button>
              </div>
              <ProgressList data={staffRows} getLabel={r => String(g(r, 'staff_name', 'name', 'employee') || '—')} getValue={r => Number(g(r, 'total', 'revenue', 'amount')) || 0} color="#f59e0b" formatVal={fmtK} />
            </div>
            <div className="nx-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Payment Methods</div>
                <button className="btn-nx ghost sm" onClick={() => exportCSV(payRows, `payments-${from}-${to}`)}><i className="ti ti-download" /></button>
              </div>
              {payRows.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--mu)', fontSize: 13, padding: 24 }}>No data</div>
                : <div style={{ display: 'grid', gap: 10 }}>
                  {payRows.map((p, i) => {
                    const total  = payRows.reduce((s, r) => s + (Number(g(r, 'total', 'amount')) || 0), 0);
                    const val    = Number(g(p, 'total', 'amount')) || 0;
                    const method = String(g(p, 'method', 'payment_method', 'name') || '');
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                          <span>{METHOD_ICON[method] ?? '💰'} {method}</span>
                          <span style={{ fontWeight: 600 }}>{fmt(val)} <span style={{ color: 'var(--mu)', fontSize: 11 }}>({pct(val, total)})</span></span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: pct(val, total), background: 'var(--ac)', borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY ── */}
      {tab === 'inventory' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="nx-stats cols-4">
            <StatCard label="Total SKUs"      value={valRows.length}                                                                                          icon="ti-box"           color="indigo" />
            <StatCard label="Total Value"     value={fmtK(valRows.reduce((s, r) => s + (Number(g(r, 'value', 'total_value')) || 0), 0))}                      icon="ti-cash"           color="green"  />
            <StatCard label="LowStock Items" value={lowRows.length}                                                                                           icon="ti-alert-circle"   color="amber"  />
            <StatCard label="Stock Movements" value={movRows.length}                                                                                           icon="ti-arrows-exchange" color="teal"  />
          </div>

         <div className="nx-card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>⚠️ Low Stock Alert</div>
            <Table onExport={() => exportCSV(lowRows, 'low-stock')} filename="low-stock.csv" cols={[
              { label: 'Product',   get: r => g(r, 'product_name', 'name', 'variant_name') },
              { label: 'SKU',       get: r => g(r, 'sku') },
              { label: 'Size',      get: r => g(r, 'size') },
              { label: 'Color',     get: r => g(r, 'color') },
              { label: 'Stock',     get: r => Number(g(r, 'stock_quantity', 'quantity')) || 0, fmt: v => <span style={{ color: Number(v) === 0 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{String(v)} pcs</span> },
              { label: 'Threshold', get: r => g(r, 'low_stock_threshold', 'threshold') },
              { label: 'Warehouse', get: r => g(r, 'warehouse', 'warehouse_name') },
            ]} rows={lowRows} />
          </div>

          <div className="nx-card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Inventory Valuation</div>
            <Table onExport={() => exportCSV(valRows, 'inventory-valuation')} filename="valuation.csv" cols={[
              { label: 'Product',    get: r => g(r, 'product_name', 'name') },
              { label: 'SKU',        get: r => g(r, 'sku') },
              { label: 'Qty',        get: r => Number(g(r, 'quantity', 'stock_quantity')) || 0, fmt: v => Number(v).toLocaleString() },
              { label: 'Unit Cost',  get: r => Number(g(r, 'cost_price', 'unit_cost')) || 0,   fmt: v => fmt(Number(v)) },
              { label: 'Total Value',get: r => Number(g(r, 'value', 'total_value')) || 0,       fmt: v => <span style={{ fontWeight: 700, color: 'var(--ac)' }}>{fmt(Number(v))}</span> },
              { label: 'Warehouse',  get: r => g(r, 'warehouse', 'warehouse_name') },
            ]} rows={valRows} />
          </div>

          <div className="nx-card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Stock Movements</div>
            <Table onExport={() => exportCSV(movRows, `movements-${from}-${to}`)} filename="movements.csv" cols={[
              { label: 'Date',      get: r => g(r, 'date', 'created_at'),            fmt: v => v ? new Date(String(v)).toLocaleDateString() : '—' },
              { label: 'Product',   get: r => g(r, 'product_name', 'name') },
              { label: 'Type',      get: r => g(r, 'type', 'movement_type'),          fmt: v => <span className={`nx-badge ${STATUS_COLOR[String(v)] ?? 'grey'}`}>{String(v ?? '—')}</span> },
              { label: 'Qty',       get: r => Number(g(r, 'quantity')) || 0,          fmt: (v, r) => { const t = String(g(r, 'type', 'movement_type') || ''); return <span style={{ color: ['out','sale'].includes(t) ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{Number(v) > 0 && !['out','sale'].includes(t) ? '+' : ''}{String(v)}</span>; } },
              { label: 'Warehouse', get: r => g(r, 'warehouse', 'warehouse_name') },
              { label: 'Reference', get: r => g(r, 'reference', 'notes', 'ref') },
            ]} rows={movRows} />
          </div>
        </div>
      )}

      {/* ── CUSTOMERS ── */}
      {tab === 'customers' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="nx-stats cols-4">
            <StatCard label="Customers"  value={(Number(g(ds, 'total_customers', 'count')) || custRows.length).toLocaleString()} icon="ti-users"     color="indigo" />
            <StatCard label="New"        value={Number(g(custRpt as Record<string,unknown> ?? {}, 'new_customers',       'new'))       || '—'} icon="ti-user-plus" color="green"  />
            <StatCard label="Returning"  value={Number(g(custRpt as Record<string,unknown> ?? {}, 'returning_customers','returning'))  || '—'} icon="ti-repeat"    color="teal"   />
            <StatCard label="Avg Spend"  value={fmtK(Number(g(custRpt as Record<string,unknown> ?? {}, 'avg_spend', 'average_spend')) || 0)}   icon="ti-wallet"    color="amber"  />
          </div>
          <div className="nx-card">
            <Table onExport={() => exportCSV(custRows, `customers-${from}-${to}`)} filename="customers.csv" cols={[
              { label: 'Customer',    get: r => g(r, 'name', 'full_name', 'customer_name') },
              { label: 'Phone',       get: r => g(r, 'phone') },
              { label: 'Tier',        get: r => g(r, 'tier', 'loyalty_tier'), fmt: v => { const c: Record<string,string> = { regular: 'grey', silver: 'teal', gold: 'amber', vip: 'indigo' }; return <span className={`nx-badge ${c[String(v ?? 'regular')] ?? 'grey'}`}>{String(v ?? 'regular')}</span>; } },
              { label: 'Orders',      get: r => Number(g(r, 'orders', 'order_count', 'total_orders')) || 0 },
              { label: 'Total Spent', get: r => Number(g(r, 'total_spent', 'revenue', 'amount')) || 0, fmt: v => <span style={{ fontWeight: 700, color: 'var(--ac)' }}>{fmt(Number(v))}</span> },
              { label: 'Points',      get: r => Number(g(r, 'loyalty_points', 'points')) || 0, fmt: v => Number(v).toLocaleString() },
              { label: 'Last Order',  get: r => g(r, 'last_order', 'last_purchase'), fmt: v => v ? new Date(String(v)).toLocaleDateString() : '—' },
            ]} rows={custRows} />
          </div>
        </div>
      )}

      {/* ── PURCHASING ── */}
      {tab === 'purchasing' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="nx-stats cols-4">
            <StatCard label="Total POs"    value={(Number(g(purchRpt as Record<string,unknown> ?? {}, 'total_orders',  'total'))       || purchRows.length).toLocaleString()} icon="ti-truck"  color="indigo" />
            <StatCard label="Total Spend"  value={fmtK(Number(g(purchRpt as Record<string,unknown> ?? {}, 'total_amount', 'total_spend')) || purchRows.reduce((s, r) => s + (Number(g(r, 'total', 'amount')) || 0), 0))} icon="ti-cash"   color="red"    />
            <StatCard label="Received"     value={(Number(g(purchRpt as Record<string,unknown> ?? {}, 'received_orders','received'))    || purchRows.filter(r => g(r, 'status') === 'received').length).toLocaleString()} icon="ti-check"  color="green"  />
            <StatCard label="Pending"      value={(Number(g(purchRpt as Record<string,unknown> ?? {}, 'pending_orders', 'pending'))     || purchRows.filter(r => ['pending','approved'].includes(String(g(r, 'status') || ''))).length).toLocaleString()} icon="ti-clock"  color="amber"  />
          </div>
          <div className="nx-card">
            <Table onExport={() => exportCSV(purchRows, `purchasing-${from}-${to}`)} filename="purchasing.csv" cols={[
              { label: 'PO #',      get: r => g(r, 'po_number', 'number', 'reference') },
              { label: 'Supplier',  get: r => g(r, 'supplier', 'supplier_name') },
              { label: 'Status',    get: r => g(r, 'status'), fmt: v => <span className={`nx-badge ${STATUS_COLOR[String(v)] ?? 'grey'}`}>{String(v ?? '—')}</span> },
              { label: 'Total',     get: r => Number(g(r, 'total', 'amount', 'total_amount')) || 0, fmt: v => <span style={{ fontWeight: 700 }}>{fmt(Number(v))}</span> },
              { label: 'Warehouse', get: r => g(r, 'warehouse', 'warehouse_name') },
              { label: 'Date',      get: r => g(r, 'expected_date', 'created_at', 'date'), fmt: v => v ? new Date(String(v)).toLocaleDateString() : '—' },
            ]} rows={purchRows} />
          </div>
        </div>
      )}

      {/* ── HR ── */}
      {tab === 'hr' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="nx-stats cols-4">
            <StatCard label="Headcount"      value={(Number(g(hrRpt as Record<string,unknown> ?? {}, 'total_employees','headcount')) || hrRows.length).toLocaleString()} icon="ti-users"      color="indigo" />
            <StatCard label="On Leave"        value={Number(g(hrRpt as Record<string,unknown> ?? {}, 'on_leave')) || 0}                                                   icon="ti-calendar-off" color="amber"  />
            <StatCard label="Payroll Cost"    value={fmtK(Number(g(hrRpt as Record<string,unknown> ?? {}, 'total_payroll','payroll_cost')) || 0)}                          icon="ti-cash"         color="red"    />
            <StatCard label="Attendance Rate" value={(Number(g(hrRpt as Record<string,unknown> ?? {}, 'attendance_rate')) || 0) + '%'}                                     icon="ti-user-check"   color="green"  />
          </div>
          <div className="nx-card">
            <Table onExport={() => exportCSV(hrRows, `hr-${from}-${to}`)} filename="hr.csv" cols={[
              { label: 'Emp #',        get: r => g(r, 'employee_number', 'emp_number') },
              { label: 'Name',         get: r => g(r, 'full_name', 'name') },
              { label: 'Department',   get: r => g(r, 'department', 'department_name') },
              { label: 'Present Days', get: r => Number(g(r, 'present_days', 'attendance')) || 0 },
              { label: 'Absent',       get: r => Number(g(r, 'absent_days', 'absent')) || 0, fmt: v => <span style={{ color: Number(v) > 3 ? '#ef4444' : 'inherit' }}>{String(v)}</span> },
              { label: 'Leave Days',   get: r => Number(g(r, 'leave_days', 'leave')) || 0 },
              { label: 'Net Salary',   get: r => Number(g(r, 'net_salary', 'salary')) || 0, fmt: v => Number(v) ? fmt(Number(v)) : '—' },
            ]} rows={hrRows} />
          </div>
        </div>
      )}
    </div>
  );
}
