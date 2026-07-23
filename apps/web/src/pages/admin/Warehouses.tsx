import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
export default function Warehouses(){
  const qc=useQueryClient();
  const [sel,setSel]=useState<any>(null);const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:'',code:'',address:'',city:'',is_active:true});
  const {data,isLoading}=useQuery({queryKey:['warehouses'],queryFn:async()=>{const r=await api.get('/inventory/warehouses');return r.data;}});
  const add=useMutation({mutationFn:()=>api.post('/inventory/warehouses',form),onSuccess:()=>{qc.invalidateQueries({queryKey:['warehouses']});setShowAdd(false);setForm({name:'',code:'',address:'',city:'',is_active:true});}});
  const warehouses:any[]=Array.isArray(data)?data:data?.warehouses||data?.data||[];
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Warehouses</h1><p className="nx-page-sub">{warehouses.length} locations</p></div>
      <button className="btn-nx primary" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> Add Warehouse</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16,marginTop:8}}>
      {isLoading?<div style={{color:'var(--muted)'}}>Loading...</div>:warehouses.map((w:any)=>(
        <div key={w.id} className="nx-card" style={{cursor:'pointer'}} onClick={()=>setSel(w)}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:'var(--acg)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-building-warehouse" style={{fontSize:20,color:'var(--ac)'}}/></div>
            <span className={`nx-badge ${w.is_active?'active':'inactive'}`}>{w.is_active?'Active':'Inactive'}</span>
          </div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{w.name}</div>
          <div style={{color:'var(--muted)',fontSize:12,marginBottom:4}}>{w.code||'—'}</div>
          <div style={{color:'var(--muted)',fontSize:12}}><i className="ti ti-map-pin" style={{marginRight:4}}/>{w.city||w.address||'—'}</div>
        </div>
      ))}
    </div>
    {sel&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}} onClick={()=>setSel(null)}>
      <div style={{width:380,height:'100vh',background:'var(--cd)',padding:24,overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 style={{margin:0,fontSize:18,fontWeight:700}}>{sel.name}</h2><button className="btn-nx ghost sm" onClick={()=>setSel(null)}><i className="ti ti-x"/></button></div>
        {[['Code',sel.code||'—'],['City',sel.city||'—'],['Address',sel.address||'—'],['Status',sel.is_active?'Active':'Inactive'],['Created',sel.created_at?new Date(sel.created_at).toLocaleDateString('en-GB'):'—']].map(([k,v])=>(
          <div key={k} style={{marginBottom:14}}><div style={{fontSize:11,color:'var(--muted)'}}>{k}</div><div style={{fontWeight:600}}>{v}</div></div>
        ))}
      </div>
    </div>)}
    {showAdd&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowAdd(false)}>
      <div style={{width:420,background:'var(--cd)',borderRadius:12,padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 style={{margin:0,fontSize:18,fontWeight:700}}>Add Warehouse</h2><button className="btn-nx ghost sm" onClick={()=>setShowAdd(false)}><i className="ti ti-x"/></button></div>
        <div style={{display:'grid',gap:10}}>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Name *</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Code</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>City</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Address</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn-nx ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</button>
          <button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>add.mutate()} disabled={!form.name}>Save</button>
        </div>
      </div>
    </div>)}
  </div>);
}
