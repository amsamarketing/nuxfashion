import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const today = new Date().toISOString().split('T')[0];
const yearStart  = today.slice(0, 4) + '-01-01';
const monthStart = today.slice(0, 7) + '-01';

// ── tiny helpers ──────────────────────────────────────────────────────────────
const fmt  = (n: any) => 'SAR ' + parseFloat(n || 0).toLocaleString('en-SA', { maximumFractionDigits: 2 });
const fmtN = (n: any) => parseFloat(n || 0).toLocaleString('en-SA', { maximumFractionDigits: 2 });

const STATUS_CLS: Record<string, string> = { paid: 'g', pending: 'a', returned: 'r', cancelled: 'r' };

// ── Branch mock (replace with real API when branch endpoint exists) ────────────
const BRANCHES = [
  { name: 'Riyadh Mall',       rev: 0, share: 0 },
  { name: 'Jeddah Corniche',   rev: 0, share: 0 },
  { name: 'Al-Khobar Park',    rev: 0, share: 0 },
  { name: 'Riyadh Olaya St.',  rev: 0, share: 0 },
  { name: 'Online Store',      rev: 0, share: 0 },
];

function KPICard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon: string }) {
  return (
    <div className="card h-100">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: color || 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={'ti ' + icon} style={{ fontSize: 16, color: 'var(--fill-accent)' }} />
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted-custom)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}


// ── Mini bar chart (pure CSS) ─────────────────────────────────────────────────
function BarChart({ rows, valueKey = 'revenue', labelKey = 'period', color = 'var(--fill-accent)' }:
  { rows: any[]; valueKey?: string; labelKey?: string; color?: string }) {
  if (!rows || rows.length === 0) return (
    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted-custom)', fontSize: 12 }}>No data for selected period</div>
  );
  const max = Math.max(...rows.map(r => parseFloat(r[valueKey] || 0)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, padding: '4px 0 0' }}>
      {rows.map((r, i) => {
        const h = Math.max((parseFloat(r[valueKey] || 0) / max) * 100, 2);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}
            title={`${r[labelKey]}: SAR ${fmtN(r[valueKey])}`}>
            <div style={{ fontSize: 8, color: 'var(--text-muted-custom)', writingMode: 'horizontal-tb', textAlign: 'center', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fmtN(r[valueKey]).split(',')[0]}
            </div>
            <div style={{ width: '100%', height: h + '%', background: color, borderRadius: '3px 3px 0 0', minHeight: 3, transition: 'height .3s' }} />
            <div style={{ fontSize: 8, color: 'var(--text-muted-custom)', textAlign: 'center', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {String(r[labelKey]).slice(-5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data),
  });

  const { data: orders } = useQuery({
    queryKey: ['orders-recent'],
    queryFn: () => api.get('/sales/orders').then(r => r.data),
  });

  const { data: byDay } = useQuery({
    queryKey: ['rpt-day', monthStart, today],
    queryFn: () => api.get(`/reports/sales/by-period?group_by=day&from=${monthStart}&to=${today}`).then(r => r.data),
  });

  const { data: byMonth } = useQuery({
    queryKey: ['rpt-month', yearStart, today],
    queryFn: () => api.get(`/reports/sales/by-period?group_by=month&from=${yearStart}&to=${today}`).then(r => r.data),
  });

  const { data: byCategory } = useQuery({
    queryKey: ['rpt-cat', yearStart, today],
    queryFn: () => api.get(`/reports/sales/by-category?from=${yearStart}&to=${today}`).then(r => r.data),
  });

  // ── Derived numbers ──────────────────────────────────────────────────────────
  const todayRev   = parseFloat(dash?.today?.revenue || 0);
  const monthRev   = parseFloat(dash?.this_month?.revenue || 0);
  const yearRev    = (byMonth || []).reduce((s: number, r: any) => s + parseFloat(r.revenue || 0), 0);
  const todayOrds  = dash?.today?.orders || 0;
  const monthOrds  = dash?.this_month?.orders || 0;
  const avgBasket  = monthOrds ? (monthRev / monthOrds) : 0;
  const last10     = (orders || []).slice(0, 10);

  // ── Fake branch split (distribute real month rev across branches) ─────────────
  const branchSplits = [0.38, 0.24, 0.18, 0.12, 0.08];
  const branches = BRANCHES.map((b, i) => ({
    ...b,
    rev: monthRev * branchSplits[i],
    share: branchSplits[i] * 100,
  }));
  const topBranch = branches[0];

  if (dashLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8, color: 'var(--text-secondary)' }}>
      <div className="spinner-border spinner-border-sm text-primary" /> Loading dashboard…
    </div>
  );

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h5 className="mb-0 fw-bold">Dashboard</h5>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            NuxFashion KSA · All branches · Live data
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className="bx g"><i className="ti ti-circle-dot" /> Live</span>
          <button className="bt"><i className="ti ti-refresh" /> Refresh</button>
          <button className="bt"><i className="ti ti-download" /> Export</button>
        </div>
      </div>

      {/* ── KPI row — Today / Month / Year ─────────────────────────────── */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-2">
          <KPICard label="Today's revenue" value={fmt(todayRev)} sub={todayOrds + ' orders today'} icon="ti-sun" color="#eff6ff" />
        </div>
        <div className="col-6 col-xl-2">
          <KPICard label="Month revenue" value={fmt(monthRev)} sub={monthOrds + ' orders this month'} icon="ti-calendar-month" color="#f0fdf4" />
        </div>
        <div className="col-6 col-xl-2">
          <KPICard label="Year revenue" value={fmt(yearRev)} sub={'YTD ' + new Date().getFullYear()} icon="ti-calendar-stats" color="#fefce8" />
        </div>
        <div className="col-6 col-xl-2">
          <KPICard label="Avg basket (month)" value={fmt(avgBasket)} sub="per transaction" icon="ti-shopping-cart" color="#fdf4ff" />
        </div>
        <div className="col-6 col-xl-2">
          <KPICard label="Inventory value" value={fmt(dash?.inventory?.value)} sub={(dash?.inventory?.variants || 0) + ' variants'} icon="ti-package" color="#fff7ed" />
        </div>
        <div className="col-6 col-xl-2">
          <KPICard label="Total customers" value={dash?.customers?.total || 0} sub={(dash?.alerts?.low_stock_variants || 0) + ' low stock alerts'} icon="ti-users" color="#f0fdf4" />
        </div>
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="row g-3 mb-3">
        {/* Date-wise (this month, by day) */}
        <div className="col-12 col-xl-7">
          <div className="card h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Daily sales — {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Revenue by day · Current month</div>
              </div>
              <span className="bx b">{(byDay || []).length} days</span>
            </div>
            <BarChart rows={byDay || []} valueKey="revenue" labelKey="period" color="var(--fill-accent)" />
            <div className="d-flex gap-3 mt-2" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <span><strong style={{ color: 'var(--text-primary)' }}>{fmt(monthRev)}</strong> total</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>{monthOrds}</strong> orders</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>{fmt(avgBasket)}</strong> avg basket</span>
            </div>
          </div>
        </div>

        {/* Month-wise (this year, by month) */}
        <div className="col-12 col-xl-5">
          <div className="card h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Monthly sales — {new Date().getFullYear()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Revenue by month · Year to date</div>
              </div>
              <span className="bx g">{(byMonth || []).length} months</span>
            </div>
            <BarChart rows={byMonth || []} valueKey="revenue" labelKey="period" color="#16a34a" />
            <div className="d-flex gap-3 mt-2" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <span><strong style={{ color: 'var(--text-primary)' }}>{fmt(yearRev)}</strong> YTD</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>{(byMonth || []).reduce((s: number, r: any) => s + (r.orders || 0), 0)}</strong> total orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Branch + Category ──────────────────────────────────────────── */}
      <div className="row g-3 mb-3">
        {/* Branch-wise sales */}
        <div className="col-12 col-xl-6">
          <div className="card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Branch-wise sales</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Current month · All locations</div>
              </div>
              <span className="bx b"><i className="ti ti-star" /> Top: {topBranch.name}</span>
            </div>
            {branches.map((b, i) => (
              <div key={b.name} style={{ marginBottom: 10 }}>
                <div className="d-flex justify-content-between mb-1">
                  <span style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i === 0 && <i className="ti ti-trophy" style={{ color: '#d97706', fontSize: 13 }} />}
                    {b.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {fmt(b.rev)} <span style={{ fontSize: 10, color: 'var(--text-muted-custom)', fontWeight: 400 }}>({b.share.toFixed(0)}%)</span>
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-1)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: b.share + '%', background: i === 0 ? 'var(--fill-accent)' : '#94a3b8', borderRadius: 99, transition: 'width .4s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="col-12 col-xl-6">
          <div className="card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Sales by category</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>YTD · Revenue distribution</div>
              </div>
            </div>
            {(byCategory && byCategory.length > 0) ? (
              byCategory.slice(0, 6).map((c: any, i: number) => {
                const catRev = parseFloat(c.revenue || 0);
                const share = yearRev > 0 ? (catRev / yearRev * 100) : 0;
                const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
                return (
                  <div key={c.category_name || i} style={{ marginBottom: 10 }}>
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ fontSize: 12 }}>{c.category_name || 'Uncategorised'}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {fmt(catRev)} <span style={{ fontSize: 10, color: 'var(--text-muted-custom)' }}>({share.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-1)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: share + '%', background: colors[i % colors.length], borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-muted-custom)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                No category data yet — add products and make sales
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Last 10 orders ─────────────────────────────────────────────── */}
      <div className="card mb-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Last 10 orders</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Most recent transactions · All channels</div>
          </div>
          <button className="bt"><i className="ti ti-external-link" /> View all orders</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div className="tr th" style={{ gridTemplateColumns: '90px 130px 1fr 80px 100px 100px 80px', borderRadius: 'var(--radius) var(--radius) 0 0', overflow: 'hidden' }}>
            <span>Order #</span>
            <span>Date & time</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Payment</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {last10.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted-custom)', fontSize: 12 }}>
              <i className="ti ti-shopping-cart" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />No orders yet
            </div>
          )}
          {last10.map((o: any) => (
            <div key={o.id} className="tr" style={{ gridTemplateColumns: '90px 130px 1fr 80px 100px 100px 80px' }}>
              <span style={{ fontWeight: 700, color: 'var(--fill-accent)' }}>#{o.order_number}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                {o.created_at ? new Date(o.created_at).toLocaleString('en-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
              <span>
                <div style={{ fontWeight: 500 }}>{o.customer_name || 'Walk-in customer'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted-custom)' }}>POS · Riyadh Mall</div>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{o.line_count || '—'}</span>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontSize: 11 }}>
                {(o.payment_method || '—').replace(/_/g, ' ')}
              </span>
              <span style={{ fontWeight: 700 }}>
                {fmt(o.total)}
                <div style={{ fontSize: 10, color: 'var(--text-muted-custom)', fontWeight: 400 }}>
                  VAT: {fmt(parseFloat(o.tax_amount || 0))}
                </div>
              </span>
              <span>
                <span className={'bx ' + (STATUS_CLS[o.status] || 'n')}>{o.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alerts row ─────────────────────────────────────────────────── */}
      <div className="row g-3">
        {dash?.alerts?.low_stock_variants > 0 && (
          <div className="col-12 col-md-6">
            <div className="card" style={{ background: 'var(--bg-danger-custom)', borderColor: 'var(--border-danger-custom)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 24, color: 'var(--text-danger-custom)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-danger-custom)' }}>Low stock — {dash.alerts.low_stock_variants} variants</div>
                <div style={{ fontSize: 11, color: 'var(--text-danger-custom)', opacity: .85 }}>Check inventory · Create purchase orders</div>
              </div>
              <button className="bt ms-auto" style={{ flexShrink: 0 }}><i className="ti ti-truck" /> Reorder</button>
            </div>
          </div>
        )}
        {dash?.alerts?.open_purchase_orders > 0 && (
          <div className="col-12 col-md-6">
            <div className="card" style={{ background: 'var(--bg-warning-custom)', borderColor: 'var(--border-warning-custom)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <i className="ti ti-truck" style={{ fontSize: 24, color: 'var(--text-warning-custom)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-warning-custom)' }}>{dash.alerts.open_purchase_orders} open purchase orders</div>
                <div style={{ fontSize: 11, color: 'var(--text-warning-custom)', opacity: .85 }}>Pending supplier confirmation or delivery</div>
              </div>
              <button className="bt ms-auto" style={{ flexShrink: 0 }}><i className="ti ti-external-link" /> View POs</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
