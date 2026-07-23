import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:any)=>'SAR '+parseFloat(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const SC:Record<string,string>={completed:'active',paid:'active',pending:'pending',cancelled:'danger',draft:'inactive'};
const nav=(s:string)=>window.dispatchEvent(new CustomEvent('nav',{detail:s}));
export default function Orders(){
  const qc=useQueryClient();
  const [q,setQ]=useState('');const [tab,setTab]=useState('all');const [sel,setSel]=useState<any>(null);
  const {data,isLoading}=useQuery({queryKey:['orders'],queryFn:async()=>{const r=await api.get('/sales/orders?limit=100');return r.data;}});
  const cancel=useMutation({mutationFn:(id:string)=>api.patch(`/sales/orders/${id}/cancel`,{}),onSuccess:()=>{qc.invalidateQueries({queryKey:['orders']});setSel(null);}});
  const orders:any[]=(Array.isArray(data)?data:data?.orders||[]).filter((o:any)=>tab==='all'||o.status===tab).filter((o:any)=>!q||(o.order_number||'').toLowerCase().includes(q.toLowerCase())||(o.customer_name||'').toLowerCase().includes(q.toLowerCase()));
  const exportCSV=()=>{
    const rows=[['Order#','Customer','Total','Status','Date'],...orders.map(o=>[o.order_number,o.customer_name||'Walk-in',o.total_amount,o.status,o.created_at?.slice(0,10)])];
    const csv=rows.map(r=>r.join(',')).join('\n');
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='orders.csv';a.click();
  };
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Orders</h1><p className="nx-page-sub">{orders.length} orders</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost" onClick={exportCSV}><i className="ti ti-download"/> Export CSV</button>
        <button className="btn-nx primary" onClick={()=>nav('pos-sale')}><i className="ti ti-plus"/> New Order</button>
      </div>
    </div>
    <div className="nx-tabs">{['all','pending','paid','completed','cancelled'].map(t=><button key={t} className={`nx-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
    <div className="nx-toolbar">
      <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search order or customer..." value={q} onChange={e=>setQ(e.target.value)}/></div>
    </div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>VAT</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={8} style={{textAlign:'center',padding:'32px 0'}}>Loading...</td></tr>:orders.length===0?<tr><td colSpan={8} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No orders found</td></tr>:orders.map((o:any)=>(
        <tr key={o.id} style={{cursor:'pointer'}} onClick={()=>setSel(o)}>
          <td><span style={{fontWeight:600,color:'var(--accent)'}}>#{o.order_number||o.id?.slice(-6)}</span></td>
          <td>{o.customer_name||'Walk-in'}</td>
          <td style={{color:'var(--muted)'}}>{o.item_count||'—'}</td>
          <td style={{fontWeight:600}}>{fmt(o.total_amount)}</td>
          <td style={{color:'var(--muted)'}}>{fmt(o.vat_amount||0)}</td>
          <td><span className={`nx-badge ${SC[o.status]||'inactive'}`}>{o.status}</span></td>
          <td style={{color:'var(--muted)',fontSize:12}}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-GB'):'—'}</td>
          <td onClick={e=>e.stopPropagation()}>
            <button className="btn-nx ghost sm" onClick={()=>setSel(o)}><i className="ti ti-eye"/> View</button>
            {o.status==='pending'&&<button className="btn-nx danger sm" style={{marginLeft:4}} onClick={()=>cancel.mutate(o.id)}><i className="ti ti-x"/> Cancel</button>}
          </td>
        </tr>
      ))}</tbody>
    </table></div>
    {sel&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}} onClick={()=>setSel(null)}>
      <div style={{width:420,height:'100vh',background:'var(--cd)',padding:24,overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>#{sel.order_number}</h2>
          <button className="btn-nx ghost sm" onClick={()=>setSel(null)}><i className="ti ti-x"/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          <div><div style={{fontSize:11,color:'var(--muted)'}}>Status</div><span className={`nx-badge ${SC[sel.status]||'inactive'}`}>{sel.status}</span></div>
          <div><div style={{fontSize:11,color:'var(--muted)'}}>Date</div><div style={{fontWeight:600}}>{sel.created_at?new Date(sel.created_at).toLocaleDateString('en-GB'):'—'}</div></div>
          <div><div style={{fontSize:11,color:'var(--muted)'}}>Customer</div><div style={{fontWeight:600}}>{sel.customer_name||'Walk-in'}</div></div>
          <div><div style={{fontSize:11,color:'var(--muted)'}}>Payment</div><div style={{fontWeight:600}}>{sel.payment_method||'—'}</div></div>
        </div>
        <div style={{borderTop:'1px solid var(--bd)',paddingTop:12,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'var(--muted)'}}>Subtotal</span><span>{fmt(sel.sub_total||sel.total_amount)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'var(--muted)'}}>VAT (15%)</span><span>{fmt(sel.vat_amount||0)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:16}}><span>Total</span><span style={{color:'var(--accent)'}}>{fmt(sel.total_amount)}</span></div>
        </div>
        {sel.status==='pending'&&<button className="btn-nx danger" style={{width:'100%',justifyContent:'center'}} onClick={()=>cancel.mutate(sel.id)}>Cancel Order</button>}
      </div>
    </div>)}
  </div>);
}
