import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:number)=>'SAR '+n.toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const SC:Record<string,string>={completed:'active',paid:'active',pending:'pending',cancelled:'danger',draft:'inactive'};
export default function Orders(){
  const [q,setQ]=useState('');const [tab,setTab]=useState('all');
  const {data,isLoading}=useQuery({queryKey:['orders',tab],queryFn:async()=>{const r=await fetch('/api/orders?limit=50&sort=desc');if(!r.ok)return{orders:[]};return r.json();}});
  const orders:any[]=(data?.orders||data?.data||[]).filter((o:any)=>!q||(o.order_number||'').toLowerCase().includes(q.toLowerCase())||(o.customer_name||'').toLowerCase().includes(q.toLowerCase())).filter((o:any)=>tab==='all'||o.status===tab);
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Orders</h1><p className="nx-page-sub">{data?.total||orders.length} total orders</p></div>
      <button className="btn-nx primary"><i className="ti ti-plus"/> New Order</button>
    </div>
    <div className="nx-tabs">{['all','pending','completed','cancelled'].map(t=><button key={t} className={`nx-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
    <div className="nx-toolbar">
      <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search order or customer..." value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="nx-toolbar-right"><button className="btn-nx ghost"><i className="ti ti-download"/> Export</button></div>
    </div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Order #</th><th>Customer</th><th>Branch</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>Loading...</td></tr>:orders.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No orders found</td></tr>:orders.map((o:any)=>(
        <tr key={o.id}>
          <td><span style={{fontWeight:600,color:'var(--accent)'}}>#{o.order_number||o.id?.slice(-6)}</span></td>
          <td>{o.customer_name||'Walk-in'}</td>
          <td style={{color:'var(--muted)'}}>{o.branch_name||'—'}</td>
          <td style={{color:'var(--muted)'}}>{o.item_count||'—'}</td>
          <td style={{fontWeight:600}}>{fmt(parseFloat(o.total_amount||o.total||0))}</td>
          <td><span className={`nx-badge ${SC[o.status]||'inactive'}`}>{o.status}</span></td>
          <td style={{color:'var(--muted)',fontSize:12}}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-GB'):'—'}</td>
        </tr>
      ))}</tbody>
    </table></div>
  </div>);
}