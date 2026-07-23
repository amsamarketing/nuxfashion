import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
export default function Inventory(){
  const qc=useQueryClient();
  const [q,setQ]=useState('');const [tab,setTab]=useState('all');const [showAdj,setShowAdj]=useState<any>(null);
  const [adj,setAdj]=useState({quantity:'',reason:'adjustment'});
  const {data,isLoading}=useQuery({queryKey:['inventory'],queryFn:async()=>{const r=await api.get('/inventory?limit=200');return r.data;}});
  const {data:low}=useQuery({queryKey:['low-stock'],queryFn:async()=>{const r=await api.get('/inventory/low-stock');return r.data;}});
  const adjust=useMutation({mutationFn:()=>api.post('/inventory/adjust',{variant_id:showAdj.variant_id,warehouse_id:showAdj.warehouse_id,quantity:parseInt(adj.quantity),reason:adj.reason}),onSuccess:()=>{qc.invalidateQueries({queryKey:['inventory']});setShowAdj(null);setAdj({quantity:'',reason:'adjustment'});}});
  const items:any[]=Array.isArray(data)?data:data?.items||data?.data||[];
  const lowItems:any[]=Array.isArray(low)?low:low?.items||[];
  const filtered=items.filter((i:any)=>{
    const matchQ=!q||(i.product_name||i.name||'').toLowerCase().includes(q.toLowerCase())||(i.sku||'').toLowerCase().includes(q.toLowerCase());
    const matchTab=tab==='all'||(tab==='low'&&i.quantity<=(i.reorder_point||5))||(tab==='out'&&i.quantity===0);
    return matchQ&&matchTab;
  });
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Inventory</h1><p className="nx-page-sub">{items.length} variants tracked · {lowItems.length} low stock</p></div>
      <button className="btn-nx ghost" onClick={()=>{const csv=[['Product','SKU','Qty','Reorder'],...items.map(i=>[i.product_name||i.name,i.sku,i.quantity,i.reorder_point])].map(r=>r.join(',')).join('\n');const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='inventory.csv';a.click();}}><i className="ti ti-download"/> Export</button>
    </div>
    <div className="nx-tabs">{[['all','All'],['low','Low Stock'],['out','Out of Stock']].map(([id,l])=><button key={id} className={`nx-tab${tab===id?' on':''}`} onClick={()=>setTab(id)}>{l}</button>)}</div>
    <div className="nx-toolbar"><div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search product or SKU..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>Qty</th><th>Reorder At</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0'}}>Loading...</td></tr>:filtered.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No items found</td></tr>:filtered.map((i:any)=>{
        const isLow=i.quantity<=(i.reorder_point||5);const isOut=i.quantity===0;
        return(<tr key={i.id}>
          <td style={{fontWeight:600}}>{i.product_name||i.name||'—'}</td>
          <td style={{color:'var(--muted)',fontSize:12}}>{i.sku||'—'}</td>
          <td style={{color:'var(--muted)'}}>{i.warehouse_name||'—'}</td>
          <td style={{fontWeight:700,color:isOut?'var(--red)':isLow?'var(--amber)':'inherit'}}>{i.quantity}</td>
          <td style={{color:'var(--muted)'}}>{i.reorder_point||5}</td>
          <td><span className={`nx-badge ${isOut?'danger':isLow?'pending':'active'}`}>{isOut?'Out of Stock':isLow?'Low Stock':'In Stock'}</span></td>
          <td><button className="btn-nx ghost sm" onClick={()=>setShowAdj(i)}><i className="ti ti-adjustments"/> Adjust</button></td>
        </tr>);
      })}</tbody>
    </table></div>
    {showAdj&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowAdj(null)}>
      <div style={{width:380,background:'var(--cd)',borderRadius:12,padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><h2 style={{margin:0,fontSize:16,fontWeight:700}}>Adjust Stock — {showAdj.product_name||showAdj.name}</h2><button className="btn-nx ghost sm" onClick={()=>setShowAdj(null)}><i className="ti ti-x"/></button></div>
        <div style={{marginBottom:8,color:'var(--muted)'}}>Current qty: <strong>{showAdj.quantity}</strong></div>
        <div style={{display:'grid',gap:10}}>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>New Quantity *</label><input className="nx-input" type="number" style={{width:'100%',marginTop:4}} value={adj.quantity} onChange={e=>setAdj(a=>({...a,quantity:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Reason</label>
            <select className="nx-select" style={{width:'100%',marginTop:4}} value={adj.reason} onChange={e=>setAdj(a=>({...a,reason:e.target.value}))}>
              {['adjustment','damage','theft','return','recount'].map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn-nx ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdj(null)}>Cancel</button>
          <button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>adjust.mutate()} disabled={!adj.quantity}>Save</button>
        </div>
      </div>
    </div>)}
  </div>);
}
