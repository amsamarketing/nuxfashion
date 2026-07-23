import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:number)=>'SAR '+parseFloat(n+'').toFixed(2);
export default function Customers(){
  const [q,setQ]=useState('');
  const {data,isLoading}=useQuery({queryKey:['customers'],queryFn:async()=>{const r=await fetch('/api/customers?limit=100');if(!r.ok)return{customers:[]};return r.json();}});
  const items:any[]=(data?.customers||data?.data||[]).filter((c:any)=>!q||(c.name||'').toLowerCase().includes(q.toLowerCase())||(c.phone||'').includes(q)||(c.email||'').toLowerCase().includes(q.toLowerCase()));
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Customers</h1><p className="nx-page-sub">{data?.total||items.length} registered customers</p></div>
      <button className="btn-nx primary"><i className="ti ti-plus"/> Add Customer</button>
    </div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-users"/></div><div className="nx-stat-body"><div className="nx-stat-val">{data?.total||items.length}</div><div className="nx-stat-lbl">Total Customers</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-user-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.filter((c:any)=>c.status==='active').length}</div><div className="nx-stat-lbl">Active</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-star"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.filter((c:any)=>(c.loyalty_points||0)>0).length}</div><div className="nx-stat-lbl">Loyalty Members</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon blue"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(items.reduce((a:number,c:any)=>a+parseFloat(c.total_spent||0),0))}</div><div className="nx-stat-lbl">Total Spend</div></div></div>
    </div>
    <div className="nx-toolbar">
      <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search name, phone, email..." value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="nx-toolbar-right"><button className="btn-nx ghost"><i className="ti ti-download"/> Export</button></div>
    </div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Orders</th><th>Total Spend</th><th>Points</th><th>Status</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>Loading...</td></tr>:items.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No customers found</td></tr>:items.map((c:any)=>(
        <tr key={c.id}><td style={{fontWeight:600}}>{c.name}</td><td style={{color:'var(--muted)'}}>{c.phone||'—'}</td><td style={{color:'var(--muted)',fontSize:12}}>{c.email||'—'}</td><td style={{color:'var(--muted)'}}>{c.order_count||'—'}</td><td style={{fontWeight:600}}>{fmt(parseFloat(c.total_spent||0))}</td><td><span style={{color:'var(--accent)',fontWeight:600}}>{c.loyalty_points||0} pts</span></td><td><span className={`nx-badge ${c.status==='active'?'active':'inactive'}`}>{c.status||'active'}</span></td></tr>
      ))}</tbody>
    </table></div>
  </div>);
}