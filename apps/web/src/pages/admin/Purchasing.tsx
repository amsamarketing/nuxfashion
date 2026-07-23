import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:any)=>'SAR '+parseFloat(n||0).toFixed(2);
const SC:Record<string,string>={received:'active',approved:'teal',ordered:'pending',cancelled:'danger',draft:'inactive'};
export default function Purchasing(){
  const qc=useQueryClient();
  const [tab,setTab]=useState('all');const [sel,setSel]=useState<any>(null);const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({supplier_id:'',notes:''});
  const {data,isLoading}=useQuery({queryKey:['purchase-orders'],queryFn:async()=>{const r=await api.get('/purchasing/orders?limit=100');return r.data;}});
  const {data:suppliers}=useQuery({queryKey:['suppliers'],queryFn:async()=>{const r=await api.get('/purchasing/suppliers');return r.data;}});
  const approve=useMutation({mutationFn:(id:string)=>api.patch(`/purchasing/orders/${id}/approve`,{}),onSuccess:()=>{qc.invalidateQueries({queryKey:['purchase-orders']});setSel(null);}});
  const cancel=useMutation({mutationFn:(id:string)=>api.patch(`/purchasing/orders/${id}/cancel`,{}),onSuccess:()=>{qc.invalidateQueries({queryKey:['purchase-orders']});setSel(null);}});
  const add=useMutation({mutationFn:()=>api.post('/purchasing/orders',form),onSuccess:()=>{qc.invalidateQueries({queryKey:['purchase-orders']});setShowAdd(false);}});
  const orders:any[]=Array.isArray(data)?data:data?.orders||data?.data||[];
  const supList:any[]=Array.isArray(suppliers)?suppliers:suppliers?.suppliers||suppliers?.data||[];
  const filtered=orders.filter(o=>tab==='all'||o.status===tab);
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Purchasing</h1><p className="nx-page-sub">{orders.length} purchase orders</p></div>
      <button className="btn-nx primary" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> New PO</button>
    </div>
    <div className="nx-tabs">{['all','draft','approved','ordered','received','cancelled'].map(t=><button key={t} className={`nx-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>PO #</th><th>Supplier</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0'}}>Loading...</td></tr>:filtered.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No orders found</td></tr>:filtered.map((o:any)=>(
        <tr key={o.id}>
          <td style={{fontWeight:600,color:'var(--accent)'}}>#{o.po_number||o.id?.slice(-6)}</td>
          <td>{o.supplier_name||'—'}</td>
          <td style={{fontWeight:600}}>{fmt(o.total_amount)}</td>
          <td><span className={`nx-badge ${SC[o.status]||'inactive'}`}>{o.status}</span></td>
          <td style={{color:'var(--muted)',fontSize:12}}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-GB'):'—'}</td>
          <td style={{display:'flex',gap:4}}>
            <button className="btn-nx ghost sm" onClick={()=>setSel(o)}><i className="ti ti-eye"/></button>
            {o.status==='draft'&&<button className="btn-nx primary sm" onClick={()=>approve.mutate(o.id)}>Approve</button>}
            {['draft','approved'].includes(o.status)&&<button className="btn-nx danger sm" onClick={()=>cancel.mutate(o.id)}>Cancel</button>}
          </td>
        </tr>
      ))}</tbody>
    </table></div>
    {sel&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}} onClick={()=>setSel(null)}>
      <div style={{width:400,height:'100vh',background:'var(--cd)',padding:24,overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 style={{margin:0,fontSize:18,fontWeight:700}}>#{sel.po_number||sel.id?.slice(-6)}</h2><button className="btn-nx ghost sm" onClick={()=>setSel(null)}><i className="ti ti-x"/></button></div>
        {[['Supplier',sel.supplier_name||'—'],['Status',sel.status],['Total',fmt(sel.total_amount)],['Notes',sel.notes||'—'],['Date',sel.created_at?new Date(sel.created_at).toLocaleDateString('en-GB'):'—']].map(([k,v])=>(
          <div key={k} style={{marginBottom:12}}><div style={{fontSize:11,color:'var(--muted)'}}>{k}</div><div style={{fontWeight:600}}>{v}</div></div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:16}}>
          {sel.status==='draft'&&<button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>approve.mutate(sel.id)}>Approve</button>}
          {['draft','approved'].includes(sel.status)&&<button className="btn-nx danger" style={{flex:1,justifyContent:'center'}} onClick={()=>cancel.mutate(sel.id)}>Cancel</button>}
        </div>
      </div>
    </div>)}
    {showAdd&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowAdd(false)}>
      <div style={{width:420,background:'var(--cd)',borderRadius:12,padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 style={{margin:0,fontSize:18,fontWeight:700}}>New Purchase Order</h2><button className="btn-nx ghost sm" onClick={()=>setShowAdd(false)}><i className="ti ti-x"/></button></div>
        <div style={{display:'grid',gap:10}}>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Supplier *</label>
            <select className="nx-select" style={{width:'100%',marginTop:4}} value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))}>
              <option value="">Select supplier</option>
              {supList.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Notes</label><textarea className="nx-input" style={{width:'100%',marginTop:4,height:80,resize:'none'}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn-nx ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</button>
          <button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>add.mutate()} disabled={!form.supplier_id}>Create PO</button>
        </div>
      </div>
    </div>)}
  </div>);
}
