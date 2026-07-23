import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const nav=(s:string)=>window.dispatchEvent(new CustomEvent('nav',{detail:s}));
const fmt=(n:any)=>'SAR '+parseFloat(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});

export default function Inventory(){
  const qc=useQueryClient();
  const [tab,setTab]=useState('stock');
  const [q,setQ]=useState('');
  const [filter,setFilter]=useState('all');
  const [showAdj,setShowAdj]=useState<any>(null);
  const [showTransfer,setShowTransfer]=useState(false);
  const [adj,setAdj]=useState({quantity:'',reason:'adjustment',notes:''});
  const [transfer,setTransfer]=useState({variant_id:'',from_warehouse_id:'',to_warehouse_id:'',quantity:'',notes:''});

  const {data:inv,isLoading}=useQuery({queryKey:['inventory'],queryFn:async()=>{const r=await api.get('/inventory?limit=500');return r.data;}});
  const {data:low}=useQuery({queryKey:['low-stock'],queryFn:async()=>{const r=await api.get('/inventory/low-stock');return r.data;}});
  const {data:moves}=useQuery({queryKey:['movements'],queryFn:async()=>{const r=await api.get('/inventory/movements?limit=100');return r.data;}});
  const {data:whs}=useQuery({queryKey:['warehouses'],queryFn:async()=>{const r=await api.get('/inventory/warehouses');return r.data;}});
  const {data:summary}=useQuery({queryKey:['inv-summary'],queryFn:async()=>{const r=await api.get('/inventory/summary');return r.data;}});

  const adjust=useMutation({mutationFn:()=>api.post('/inventory/adjust',{
    variant_id:showAdj.variant_id,warehouse_id:showAdj.warehouse_id,
    quantity:parseInt(adj.quantity),reason:adj.reason,notes:adj.notes
  }),onSuccess:()=>{qc.invalidateQueries({queryKey:['inventory']});qc.invalidateQueries({queryKey:['movements']});setShowAdj(null);setAdj({quantity:'',reason:'adjustment',notes:''});}});

  const doTransfer=useMutation({mutationFn:()=>api.post('/inventory/transfer',{...transfer,quantity:parseInt(transfer.quantity)}),onSuccess:()=>{qc.invalidateQueries({queryKey:['inventory']});setShowTransfer(false);setTransfer({variant_id:'',from_warehouse_id:'',to_warehouse_id:'',quantity:'',notes:''});}});

  const items:any[]=Array.isArray(inv)?inv:inv?.items||inv?.data||[];
  const lowItems:any[]=Array.isArray(low)?low:low?.items||low?.data||[];
  const movements:any[]=Array.isArray(moves)?moves:moves?.movements||moves?.data||[];
  const warehouses:any[]=Array.isArray(whs)?whs:whs?.warehouses||whs?.data||[];

  const totalValue=items.reduce((s:number,i:any)=>s+((parseFloat(i.cost||i.cost_price||0))*(parseInt(i.quantity)||0)),0);
  const totalUnits=items.reduce((s:number,i:any)=>s+(parseInt(i.quantity)||0),0);
  const outOfStock=items.filter(i=>parseInt(i.quantity)===0).length;

  const filtered=items.filter((i:any)=>{
    const mQ=!q||(i.product_name||i.name||'').toLowerCase().includes(q.toLowerCase())||(i.sku||'').toLowerCase().includes(q.toLowerCase())||(i.color||'').toLowerCase().includes(q.toLowerCase())||(i.size||'').toLowerCase().includes(q.toLowerCase());
    const mF=filter==='all'||(filter==='low'&&parseInt(i.quantity)<=(parseInt(i.reorder_point)||5)&&parseInt(i.quantity)>0)||(filter==='out'&&parseInt(i.quantity)===0)||(filter==='ok'&&parseInt(i.quantity)>(parseInt(i.reorder_point)||5));
    return mQ&&mF;
  });

  const exportCSV=()=>{
    const rows=[['Product','Size','Color','SKU','Warehouse','Qty','Reorder At','Cost','Value'],
      ...items.map(i=>[i.product_name||i.name,i.size||'—',i.color||'—',i.sku||'—',i.warehouse_name||'—',i.quantity,i.reorder_point||5,i.cost||0,((parseFloat(i.cost||0))*(parseInt(i.quantity)||0)).toFixed(2)])];
    const csv=rows.map(r=>r.join(',')).join('\n');
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='inventory.csv';a.click();
  };

  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Inventory</h1><p className="nx-page-sub">Stock management across all warehouses</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost" onClick={()=>setShowTransfer(true)}><i className="ti ti-transfer"/> Transfer Stock</button>
        <button className="btn-nx ghost" onClick={exportCSV}><i className="ti ti-download"/> Export</button>
        <button className="btn-nx primary" onClick={()=>nav('ad-purch')}><i className="ti ti-plus"/> Reorder Stock</button>
      </div>
    </div>

    {/* Stats */}
    <div className="nx-stats cols-4" style={{marginBottom:20}}>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-package"/></div><div className="nx-stat-body"><div className="nx-stat-val">{totalUnits.toLocaleString()}</div><div className="nx-stat-lbl">Total Units</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(totalValue)}</div><div className="nx-stat-lbl">Stock Value</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-alert-triangle"/></div><div className="nx-stat-body"><div className="nx-stat-val">{lowItems.length}</div><div className="nx-stat-lbl">Low Stock</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-circle-x"/></div><div className="nx-stat-body"><div className="nx-stat-val">{outOfStock}</div><div className="nx-stat-lbl">Out of Stock</div></div></div>
    </div>

    <div className="nx-tabs">
      {[['stock','Stock Levels'],['movements','Movement History'],['low','Low Stock Alerts']].map(([id,l])=>(
        <button key={id} className={`nx-tab${tab===id?' on':''}`} onClick={()=>setTab(id)}>{l}</button>
      ))}
    </div>

    {tab==='stock'&&(<>
      <div className="nx-toolbar">
        <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search product, size, color, SKU..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        <div className="nx-toolbar-right" style={{display:'flex',gap:6}}>
          {[['all','All'],['ok','In Stock'],['low','Low'],['out','Out']].map(([id,l])=>(
            <button key={id} className={`btn-nx ${filter===id?'primary':'ghost'} sm`} onClick={()=>setFilter(id)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="nx-table-wrap"><table className="nx-table">
        <thead><tr><th>Product</th><th>Size</th><th>Color</th><th>SKU</th><th>Warehouse</th><th>Qty</th><th>Reserved</th><th>Available</th><th>Reorder At</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{isLoading?<tr><td colSpan={11} style={{textAlign:'center',padding:'32px 0'}}>Loading...</td></tr>:filtered.length===0?<tr><td colSpan={11} style={{textAlign:'center',padding:'32px 0',color:'var(--mu)'}}>No items found</td></tr>:filtered.map((i:any)=>{
          const qty=parseInt(i.quantity)||0;const res=parseInt(i.reserved_quantity)||0;const avail=qty-res;
          const reorder=parseInt(i.reorder_point)||5;
          const isOut=qty===0;const isLow=qty>0&&qty<=reorder;
          return(<tr key={i.id}>
            <td style={{fontWeight:600}}>{i.product_name||i.name||'—'}</td>
            <td>{i.size?<span className="nx-badge teal">{i.size}</span>:'—'}</td>
            <td><span style={{display:'flex',alignItems:'center',gap:5}}>{i.color||'—'}</span></td>
            <td style={{color:'var(--mu)',fontSize:12}}>{i.sku||'—'}</td>
            <td style={{color:'var(--mu)'}}>{i.warehouse_name||'—'}</td>
            <td style={{fontWeight:700,color:isOut?'#ef4444':isLow?'#f59e0b':'inherit'}}>{qty}</td>
            <td style={{color:'var(--mu)'}}>{res}</td>
            <td style={{fontWeight:600,color:avail===0?'#ef4444':avail<=reorder?'#f59e0b':'#10b981'}}>{avail}</td>
            <td style={{color:'var(--mu)'}}>{reorder}</td>
            <td><span className={`nx-badge ${isOut?'danger':isLow?'pending':'active'}`}>{isOut?'Out of Stock':isLow?'Low Stock':'In Stock'}</span></td>
            <td><button className="btn-nx ghost sm" onClick={()=>setShowAdj(i)}><i className="ti ti-adjustments"/> Adjust</button></td>
          </tr>);
        })}</tbody>
      </table></div>
    </>)}

    {tab==='movements'&&(
      <div className="nx-table-wrap"><table className="nx-table">
        <thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty Change</th><th>Reason</th><th>Reference</th><th>By</th></tr></thead>
        <tbody>{movements.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--mu)'}}>No movements recorded</td></tr>:movements.map((m:any)=>(
          <tr key={m.id}>
            <td style={{color:'var(--mu)',fontSize:12}}>{m.created_at?new Date(m.created_at).toLocaleDateString('en-GB'):'-'}</td>
            <td style={{fontWeight:600}}>{m.product_name||m.variant_sku||'—'}</td>
            <td><span className={`nx-badge ${m.movement_type==='in'||m.quantity_change>0?'active':m.movement_type==='out'||m.quantity_change<0?'danger':'teal'}`}>{m.movement_type||'adjustment'}</span></td>
            <td style={{fontWeight:700,color:parseInt(m.quantity_change)>0?'#10b981':'#ef4444'}}>{parseInt(m.quantity_change)>0?'+':''}{m.quantity_change}</td>
            <td style={{color:'var(--mu)'}}>{m.reason||'—'}</td>
            <td style={{color:'var(--mu)',fontSize:12}}>{m.reference_id||m.reference||'—'}</td>
            <td style={{color:'var(--mu)',fontSize:12}}>{m.created_by_name||'System'}</td>
          </tr>
        ))}</tbody>
      </table></div>
    )}

    {tab==='low'&&(
      <div className="nx-table-wrap"><table className="nx-table">
        <thead><tr><th>Product</th><th>Size</th><th>Color</th><th>Current Qty</th><th>Reorder Point</th><th>Reorder Qty</th><th>Action</th></tr></thead>
        <tbody>{lowItems.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--mu)'}}>No low stock items</td></tr>:lowItems.map((i:any)=>(
          <tr key={i.id}>
            <td style={{fontWeight:600}}>{i.product_name||i.name||'—'}</td>
            <td>{i.size?<span className="nx-badge teal">{i.size}</span>:'—'}</td>
            <td>{i.color||'—'}</td>
            <td style={{fontWeight:700,color:'#f59e0b'}}>{i.quantity}</td>
            <td>{i.reorder_point||5}</td>
            <td style={{color:'var(--mu)'}}>{i.reorder_quantity||10}</td>
            <td><button className="btn-nx primary sm" onClick={()=>nav('ad-purch')}><i className="ti ti-truck"/> Reorder</button></td>
          </tr>
        ))}</tbody>
      </table></div>
    )}

    {/* Adjust Modal */}
    {showAdj&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowAdj(null)}>
      <div style={{width:400,background:'var(--cd)',borderRadius:14,padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:700}}>Adjust Stock</h2>
          <button className="btn-nx ghost sm" onClick={()=>setShowAdj(null)}><i className="ti ti-x"/></button>
        </div>
        <div style={{background:'var(--cv)',borderRadius:10,padding:12,marginBottom:16}}>
          <div style={{fontWeight:600}}>{showAdj.product_name||showAdj.name}</div>
          {showAdj.size&&<div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>Size: {showAdj.size} · Color: {showAdj.color||'—'}</div>}
          <div style={{fontSize:13,marginTop:6}}>Current stock: <strong>{showAdj.quantity}</strong> units</div>
        </div>
        <div style={{display:'grid',gap:12}}>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>New Quantity *</label><input className="nx-input" type="number" style={{width:'100%'}} value={adj.quantity} onChange={e=>setAdj(a=>({...a,quantity:e.target.value}))} placeholder={`Current: ${showAdj.quantity}`}/></div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Reason</label>
            <select className="nx-select" style={{width:'100%'}} value={adj.reason} onChange={e=>setAdj(a=>({...a,reason:e.target.value}))}>
              {['adjustment','damage','theft','return','recount','promotion','write-off'].map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Notes</label><input className="nx-input" style={{width:'100%'}} value={adj.notes} onChange={e=>setAdj(a=>({...a,notes:e.target.value}))} placeholder="Optional notes..."/></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn-nx ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdj(null)}>Cancel</button>
          <button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>adjust.mutate()} disabled={!adj.quantity||adjust.isPending}>{adjust.isPending?'Saving...':'Save Adjustment'}</button>
        </div>
      </div>
    </div>)}

    {/* Transfer Modal */}
    {showTransfer&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowTransfer(false)}>
      <div style={{width:440,background:'var(--cd)',borderRadius:14,padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:700}}>Transfer Stock Between Warehouses</h2>
          <button className="btn-nx ghost sm" onClick={()=>setShowTransfer(false)}><i className="ti ti-x"/></button>
        </div>
        <div style={{display:'grid',gap:12}}>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>From Warehouse *</label>
            <select className="nx-select" style={{width:'100%'}} value={transfer.from_warehouse_id} onChange={e=>setTransfer(t=>({...t,from_warehouse_id:e.target.value}))}>
              <option value="">Select warehouse</option>
              {warehouses.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>To Warehouse *</label>
            <select className="nx-select" style={{width:'100%'}} value={transfer.to_warehouse_id} onChange={e=>setTransfer(t=>({...t,to_warehouse_id:e.target.value}))}>
              <option value="">Select warehouse</option>
              {warehouses.filter(w=>w.id!==transfer.from_warehouse_id).map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Quantity *</label><input className="nx-input" type="number" style={{width:'100%'}} value={transfer.quantity} onChange={e=>setTransfer(t=>({...t,quantity:e.target.value}))} placeholder="0"/></div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Notes</label><input className="nx-input" style={{width:'100%'}} value={transfer.notes} onChange={e=>setTransfer(t=>({...t,notes:e.target.value}))} placeholder="Optional..."/></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn-nx ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowTransfer(false)}>Cancel</button>
          <button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>doTransfer.mutate()} disabled={!transfer.from_warehouse_id||!transfer.to_warehouse_id||!transfer.quantity||doTransfer.isPending}>{doTransfer.isPending?'Transferring...':'Transfer'}</button>
        </div>
      </div>
    </div>)}
  </div>);
}
