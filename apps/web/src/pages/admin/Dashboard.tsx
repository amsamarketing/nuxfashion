import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
const nav=(s:string)=>window.dispatchEvent(new CustomEvent('nav',{detail:s}));
const fmt=(n:number)=>'SAR '+n.toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const SC:Record<string,string>={completed:'active',paid:'active',pending:'pending',cancelled:'danger',draft:'inactive'};
export default function Dashboard(){
  const {data:stats}=useQuery({queryKey:['dash-stats'],queryFn:async()=>{const r=await api.get('/reports/dashboard');return r.data;}});
  const {data:recent}=useQuery({queryKey:['dash-recent'],queryFn:async()=>{const r=await api.get('/sales/orders?limit=8');return r.data;}});
  const s=stats||{};
  const orders:any[]=recent?.orders||recent?.data||[];
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Dashboard</h1><p className="nx-page-sub">Welcome back — here's what's happening today.</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost" onClick={()=>nav('ad-rep')}><i className="ti ti-chart-bar"/> Reports</button>
        <button className="btn-nx primary" onClick={()=>nav('ad-orders')}><i className="ti ti-plus"/> New Order</button>
      </div>
    </div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(s.today_revenue||s.today_sales||0)}</div><div className="nx-stat-lbl">Today's Sales</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-shopping-bag"/></div><div className="nx-stat-body"><div className="nx-stat-val">{s.today_orders||0}</div><div className="nx-stat-lbl">Orders Today</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-users"/></div><div className="nx-stat-body"><div className="nx-stat-val">{s.total_customers||s.active_customers||0}</div><div className="nx-stat-lbl">Active Customers</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-alert-triangle"/></div><div className="nx-stat-body"><div className="nx-stat-val">{s.low_stock_count||s.low_stock||0}</div><div className="nx-stat-lbl">Low Stock Items</div></div></div>
    </div>
    <div className="nx-quick">
      {[{icon:'ti-shopping-cart',l:'New Sale',s:'pos-sale'},{icon:'ti-users',l:'Customers',s:'ad-crm'},{icon:'ti-package',l:'Inventory',s:'ad-inv'},{icon:'ti-truck',l:'Purchasing',s:'ad-purch'},{icon:'ti-id',l:'HR',s:'ad-hr'},{icon:'ti-report-money',l:'Accounting',s:'ad-acct'},{icon:'ti-file-check',l:'ZATCA',s:'ad-zatca'},{icon:'ti-settings',l:'Settings',s:'ad-set'}].map(q=>(
        <button key={q.s} className="nx-qa-btn" onClick={()=>nav(q.s)}><i className={`ti ${q.icon}`}/>{q.l}</button>
      ))}
    </div>
    <div style={{marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontWeight:700,fontSize:15}}>Recent Orders</span>
      <button className="btn-nx ghost sm" onClick={()=>nav('ad-orders')}>View all <i className="ti ti-arrow-right"/></button>
    </div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>{orders.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No orders yet</td></tr>:orders.map((o:any)=>(
        <tr key={o.id}>
          <td><span style={{fontWeight:600,color:'var(--accent)'}}>#{o.order_number||o.id?.slice(-6)}</span></td>
          <td>{o.customer_name||'Walk-in'}</td>
          <td style={{color:'var(--muted)'}}>{o.item_count||'—'}</td>
          <td style={{fontWeight:600}}>{fmt(parseFloat(o.total_amount||o.total||0))}</td>
          <td><span className={`nx-badge ${SC[o.status]||'inactive'}`}>{o.status}</span></td>
          <td style={{color:'var(--muted)',fontSize:12}}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-GB'):'—'}</td>
        </tr>
      ))}</tbody>
    </table></div>
  </div>);
}
