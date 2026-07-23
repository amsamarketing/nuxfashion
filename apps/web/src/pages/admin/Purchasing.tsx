import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:number)=>'SAR '+n.toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const SC:Record<string,string>={received:'active',ordered:'pending',cancelled:'danger',draft:'inactive'};
export default function Purchasing(){
  const [tab,setTab]=useState('all');
  const {data,isLoading}=useQuery({queryKey:['purchase-orders'],queryFn:async()=>{const r=await api.get('/purchasing/orders?limit=50'); return r.data;}});
  const items:any[]=(data?.orders||data?.data||[]).filter((o:any)=>tab==='all'||o.status===tab);
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Purchasing</h1><p className="nx-page-sub">Purchase orders & supplier management</p></div>
      <button className="btn-nx primary"><i className="ti ti-plus"/> New PO</button>
    </div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-truck"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.length}</div><div className="nx-stat-lbl">Total POs</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-clock"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.filter((o:any)=>o.status==='ordered').length}</div><div className="nx-stat-lbl">Pending</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.filter((o:any)=>o.status==='received').length}</div><div className="nx-stat-lbl">Received</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon blue"><i className="ti ti-report-money"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(items.reduce((a:number,o:any)=>a+parseFloat(o.total||0),0))}</div><div className="nx-stat-lbl">Total Value</div></div></div>
    </div>
    <div className="nx-tabs">{['all','draft','ordered','received','cancelled'].map(t=><button key={t} className={`nx-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>PO #</th><th>Supplier</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>Loading...</td></tr>:items.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No purchase orders</td></tr>:items.map((o:any)=>(
        <tr key={o.id}><td><span style={{fontWeight:600,color:'var(--accent)'}}>#{o.po_number||o.id?.slice(-6)}</span></td><td style={{fontWeight:600}}>{o.supplier_name||'—'}</td><td style={{color:'var(--muted)'}}>{o.item_count||'—'}</td><td style={{fontWeight:600}}>{fmt(parseFloat(o.total||0))}</td><td><span className={`nx-badge ${SC[o.status]||'inactive'}`}>{o.status}</span></td><td style={{color:'var(--muted)',fontSize:12}}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-GB'):'—'}</td></tr>
      ))}</tbody>
    </table></div>
  </div>);
}