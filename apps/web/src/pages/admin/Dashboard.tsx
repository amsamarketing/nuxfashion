
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import StatRow from '../../components/StatRow';

export default function Dashboard() {
  const { data } = useQuery({ queryKey:['dashboard'], queryFn:() => api.get('/reports/dashboard').then(r=>r.data) });
  const fmt = (n:any) => 'SAR ' + parseFloat(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600 }}>Dashboard</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>Live · All branches · NuxFashion KSA</div>
        </div>
        <span className="bx g"><i className="ti ti-circle-dot" /> Live</span>
      </div>
      <StatRow stats={[
        { label:'Today Revenue', value:fmt(data?.today?.revenue), trend: data?.today?.orders ? '+'+data.today.orders+' orders' : '' },
        { label:'Month Revenue', value:fmt(data?.this_month?.revenue) },
        { label:'Inventory Value', value:fmt(data?.inventory?.value) },
        { label:'Total Customers', value:data?.customers?.total || 0 },
        { label:'Low Stock Alerts', value:data?.alerts?.low_stock_variants || 0 },
        { label:'Open POs', value:data?.alerts?.open_purchase_orders || 0 },
      ]} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 200px', gap:8, marginBottom:10 }}>
        <div className="card">
          <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Monthly summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, textAlign:'center' }}>
            {[['Orders', data?.this_month?.orders||0], ['Revenue', fmt(data?.this_month?.revenue)], ['Discounts', fmt(data?.this_month?.discounts)]].map(([l,v])=>(
              <div key={l as string}><div style={{ fontSize:18, fontWeight:700, color:'var(--fill-accent)' }}>{v}</div><div style={{ fontSize:10, color:'var(--text-secondary)' }}>{l}</div></div>
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Inventory</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:4 }}>{data?.inventory?.variants||0} variants tracked</div>
          <div style={{ fontSize:15, fontWeight:700 }}>{fmt(data?.inventory?.value)}</div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>Total stock value</div>
        </div>
      </div>
      {(data?.alerts?.low_stock_variants > 0 || data?.alerts?.open_purchase_orders > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {data.alerts.low_stock_variants > 0 && (
            <div className="card" style={{ background:'var(--bg-danger)', borderColor:'var(--border-danger)', display:'flex', gap:10, alignItems:'center' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize:20, color:'var(--text-danger)' }} />
              <div><div style={{ fontWeight:600, color:'var(--text-danger)' }}>Low stock alerts</div>
                <div style={{ fontSize:11, color:'var(--text-danger)' }}>{data.alerts.low_stock_variants} variants need restocking</div></div>
            </div>
          )}
          {data.alerts.open_purchase_orders > 0 && (
            <div className="card" style={{ background:'var(--bg-warning)', borderColor:'var(--border-warning)', display:'flex', gap:10, alignItems:'center' }}>
              <i className="ti ti-truck" style={{ fontSize:20, color:'var(--text-warning)' }} />
              <div><div style={{ fontWeight:600, color:'var(--text-warning)' }}>Open purchase orders</div>
                <div style={{ fontSize:11, color:'var(--text-warning)' }}>{data.alerts.open_purchase_orders} pending</div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
