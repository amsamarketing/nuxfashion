import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
export default function Inventory(){
  const [q,setQ]=useState('');
  const {data,isLoading}=useQuery({queryKey:['inventory'],queryFn:async()=>{const r=await fetch('/api/inventory?limit=100');if(!r.ok)return{items:[]};return r.json();}});
  const items:any[]=(data?.items||data?.data||[]).filter((i:any)=>!q||(i.product_name||i.name||'').toLowerCase().includes(q.toLowerCase()));
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Inventory</h1><p className="nx-page-sub">Stock levels across all branches</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost"><i className="ti ti-adjustments"/> Adjust Stock</button>
        <button className="btn-nx primary"><i className="ti ti-transfer"/> Transfer</button>
      </div>
    </div>
    <div className="nx-stats cols-3">
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-package"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.length}</div><div className="nx-stat-lbl">Total SKUs</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-alert-triangle"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.filter((i:any)=>(i.quantity||0)<10).length}</div><div className="nx-stat-lbl">Low Stock</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-circle-x"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.filter((i:any)=>(i.quantity||0)===0).length}</div><div className="nx-stat-lbl">Out of Stock</div></div></div>
    </div>
    <div className="nx-toolbar">
      <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search product..." value={q} onChange={e=>setQ(e.target.value)}/></div>
    </div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>Quantity</th><th>Min Stock</th><th>Status</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>Loading...</td></tr>:items.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No inventory records</td></tr>:items.map((i:any)=>{
        const qty=i.quantity||i.stock_quantity||0;const min=i.min_stock||i.reorder_level||10;
        return(<tr key={i.id}>
          <td style={{fontWeight:600}}>{i.product_name||i.name}</td>
          <td style={{color:'var(--muted)',fontFamily:'monospace',fontSize:12}}>{i.sku||'—'}</td>
          <td style={{color:'var(--muted)'}}>{i.warehouse_name||i.branch_name||'—'}</td>
          <td style={{fontWeight:600,color:qty===0?'var(--red)':qty<min?'var(--amber)':'inherit'}}>{qty}</td>
          <td style={{color:'var(--muted)'}}>{min}</td>
          <td><span className={`nx-badge ${qty===0?'danger':qty<min?'pending':'active'}`}>{qty===0?'Out of Stock':qty<min?'Low Stock':'In Stock'}</span></td>
        </tr>);
      })}</tbody>
    </table></div>
  </div>);
}