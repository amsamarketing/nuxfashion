import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
export default function Products(){
  const qc=useQueryClient();
  const [q,setQ]=useState('');const [sel,setSel]=useState<any>(null);const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:'',sku_prefix:'',price:'',cost:'',category_id:'',description:''});
  const {data,isLoading}=useQuery({queryKey:['products'],queryFn:async()=>{const r=await api.get('/catalog/products?limit=200');return r.data;}});
  const {data:cats}=useQuery({queryKey:['categories'],queryFn:async()=>{const r=await api.get('/catalog/categories');return r.data;}});
  const del=useMutation({mutationFn:(id:string)=>api.delete(`/catalog/products/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['products']});setSel(null);}});
  const add=useMutation({mutationFn:()=>api.post('/catalog/products',{...form,price:parseFloat(form.price),cost:parseFloat(form.cost)}),onSuccess:()=>{qc.invalidateQueries({queryKey:['products']});setShowAdd(false);setForm({name:'',sku_prefix:'',price:'',cost:'',category_id:'',description:''});}});
  const raw:any[]=Array.isArray(data)?data:data?.products||data?.data||[];
  const products=raw.filter((p:any)=>!q||p.name?.toLowerCase().includes(q.toLowerCase())||(p.sku_prefix||'').toLowerCase().includes(q.toLowerCase()));
  const categories:any[]=Array.isArray(cats)?cats:cats?.categories||cats?.data||[];
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Products</h1><p className="nx-page-sub">{products.length} products</p></div>
      <button className="btn-nx primary" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> Add Product</button>
    </div>
    <div className="nx-toolbar">
      <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search products..." value={q} onChange={e=>setQ(e.target.value)}/></div>
    </div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th><th>Actions</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0'}}>Loading...</td></tr>:products.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No products found</td></tr>:products.map((p:any)=>{
        const price=parseFloat(p.price||p.base_price||0);const cost=parseFloat(p.cost||p.cost_price||0);
        const margin=price>0?Math.round((price-cost)/price*100):0;
        return(<tr key={p.id}>
          <td style={{fontWeight:600}}>{p.name}</td>
          <td style={{color:'var(--muted)',fontSize:12}}>{p.sku_prefix||'—'}</td>
          <td style={{color:'var(--muted)'}}>{p.category_name||'—'}</td>
          <td style={{fontWeight:600}}>SAR {price.toFixed(2)}</td>
          <td style={{color:'var(--muted)'}}>SAR {cost.toFixed(2)}</td>
          <td><span className={`nx-badge ${margin>30?'active':margin>10?'teal':'amber'}`}>{margin}%</span></td>
          <td>
            <button className="btn-nx ghost sm" onClick={()=>setSel(p)}><i className="ti ti-eye"/> View</button>
            <button className="btn-nx danger sm" style={{marginLeft:4}} onClick={()=>{if(confirm('Delete '+p.name+'?'))del.mutate(p.id)}}><i className="ti ti-trash"/></button>
          </td>
        </tr>);
      })}</tbody>
    </table></div>

    {sel&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}} onClick={()=>setSel(null)}>
      <div style={{width:400,height:'100vh',background:'var(--cd)',padding:24,overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{sel.name}</h2>
          <button className="btn-nx ghost sm" onClick={()=>setSel(null)}><i className="ti ti-x"/></button>
        </div>
        <div style={{display:'grid',gap:10}}>
          {[['SKU',sel.sku_prefix],['Category',sel.category_name],['Price','SAR '+(parseFloat(sel.price||sel.base_price||0)).toFixed(2)],['Cost','SAR '+(parseFloat(sel.cost||sel.cost_price||0)).toFixed(2)],['Description',sel.description||'—']].map(([k,v])=>(
            <div key={k}><div style={{fontSize:11,color:'var(--muted)',marginBottom:2}}>{k}</div><div style={{fontWeight:500}}>{v}</div></div>
          ))}
        </div>
        <button className="btn-nx danger" style={{width:'100%',justifyContent:'center',marginTop:20}} onClick={()=>{if(confirm('Delete '+sel.name+'?')){del.mutate(sel.id)}}}>Delete Product</button>
      </div>
    </div>)}

    {showAdd&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowAdd(false)}>
      <div style={{width:440,background:'var(--cd)',borderRadius:12,padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Add Product</h2>
          <button className="btn-nx ghost sm" onClick={()=>setShowAdd(false)}><i className="ti ti-x"/></button>
        </div>
        <div style={{display:'grid',gap:10}}>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Name *</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>SKU Prefix</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.sku_prefix} onChange={e=>setForm(f=>({...f,sku_prefix:e.target.value}))}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div><label style={{fontSize:12,color:'var(--muted)'}}>Price (SAR) *</label><input className="nx-input" type="number" style={{width:'100%',marginTop:4}} value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/></div>
            <div><label style={{fontSize:12,color:'var(--muted)'}}>Cost (SAR)</label><input className="nx-input" type="number" style={{width:'100%',marginTop:4}} value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}/></div>
          </div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Category</label>
            <select className="nx-select" style={{width:'100%',marginTop:4}} value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))}>
              <option value="">Select category</option>
              {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Description</label><textarea className="nx-input" style={{width:'100%',marginTop:4,height:80,resize:'none'}} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn-nx ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</button>
          <button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>add.mutate()} disabled={!form.name||!form.price}>Save Product</button>
        </div>
      </div>
    </div>)}
  </div>);
}
