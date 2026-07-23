import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const nav=(s:string)=>window.dispatchEvent(new CustomEvent('nav',{detail:s}));

function WhForm({wh,onClose}:{wh:any,onClose:()=>void}){
  const qc=useQueryClient();
  const isEdit=!!wh?.id;
  const [form,setForm]=useState({
    name:wh?.name||'', code:wh?.code||'', type:wh?.type||'main',
    address:wh?.address||'', city:wh?.city||'', region:wh?.region||'',
    phone:wh?.phone||'', manager_name:wh?.manager_name||'',
    capacity:wh?.capacity||'', is_active:wh?.is_active!==false,
  });
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const save=useMutation({
    mutationFn:()=>isEdit?api.patch(`/inventory/warehouses/${wh.id}`,form):api.post('/inventory/warehouses',form),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['warehouses']});onClose();}
  });
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
    <div style={{width:'min(560px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{isEdit?'Edit Warehouse':'Add Warehouse'}</h2>
        <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
      </div>
      <div style={{padding:24,display:'grid',gap:14,maxHeight:'70vh',overflowY:'auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Warehouse Name *</label><input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Main Warehouse"/></div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Code</label><input className="nx-input" style={{width:'100%'}} value={form.code} onChange={e=>F('code',e.target.value)} placeholder="WH-01"/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Type</label>
            <select className="nx-select" style={{width:'100%'}} value={form.type} onChange={e=>F('type',e.target.value)}>
              {['main','branch','store','returns','transit'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Capacity (units)</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.capacity} onChange={e=>F('capacity',e.target.value)} placeholder="5000"/></div>
        </div>
        <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Address</label><input className="nx-input" style={{width:'100%'}} value={form.address} onChange={e=>F('address',e.target.value)} placeholder="Street address"/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>City</label><input className="nx-input" style={{width:'100%'}} value={form.city} onChange={e=>F('city',e.target.value)} placeholder="Riyadh"/></div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Region</label>
            <select className="nx-select" style={{width:'100%'}} value={form.region} onChange={e=>F('region',e.target.value)}>
              <option value="">Select region</option>
              {['Riyadh','Jeddah','Makkah','Madinah','Dammam','Khobar','Dhahran','Abha','Taif','Tabuk','Qassim','Hail','Jizan','Najran','Al Bahah','Al Jawf','Northern Borders'].map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Manager Name</label><input className="nx-input" style={{width:'100%'}} value={form.manager_name} onChange={e=>F('manager_name',e.target.value)} placeholder="Ahmed Al-Rashid"/></div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Phone</label><input className="nx-input" style={{width:'100%'}} value={form.phone} onChange={e=>F('phone',e.target.value)} placeholder="+966 5X XXX XXXX"/></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <input type="checkbox" id="active" checked={form.is_active} onChange={e=>F('is_active',e.target.checked)} style={{width:16,height:16}}/>
          <label htmlFor="active" style={{fontSize:13,cursor:'pointer'}}>Active warehouse</label>
        </div>
      </div>
      <div style={{padding:'16px 24px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
        <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||save.isPending}>{save.isPending?'Saving...':'Save Warehouse'}</button>
      </div>
    </div>
  </div>);
}

export default function Warehouses(){
  const qc=useQueryClient();
  const [sel,setSel]=useState<any>(null);const [showForm,setShowForm]=useState(false);const [editWh,setEditWh]=useState<any>(null);
  const [selTab,setSelTab]=useState('info');

  const {data,isLoading}=useQuery({queryKey:['warehouses'],queryFn:async()=>{const r=await api.get('/inventory/warehouses');return r.data;}});
  const {data:whStock}=useQuery({queryKey:['wh-stock',sel?.id],queryFn:async()=>{if(!sel?.id)return[];const r=await api.get(`/inventory/warehouses/${sel.id}/stock`);return r.data;},enabled:!!sel?.id});

  const warehouses:any[]=Array.isArray(data)?data:data?.warehouses||data?.data||[];
  const stock:any[]=Array.isArray(whStock)?whStock:whStock?.items||whStock?.data||[];

  const totalStock=warehouses.reduce((s:number,w:any)=>s+(w.total_items||w.stock_count||0),0);
  const activeWhs=warehouses.filter(w=>w.is_active).length;

  const TYPE_COLOR:Record<string,string>={main:'indigo',branch:'teal',store:'green',returns:'amber',transit:'blue'};

  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Warehouses</h1><p className="nx-page-sub">{warehouses.length} locations · {activeWhs} active</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost" onClick={()=>nav('ad-inv')}><i className="ti ti-transfer"/> Transfer Stock</button>
        <button className="btn-nx primary" onClick={()=>{setEditWh(null);setShowForm(true);}}><i className="ti ti-plus"/> Add Warehouse</button>
      </div>
    </div>

    <div className="nx-stats cols-4" style={{marginBottom:20}}>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-building-warehouse"/></div><div className="nx-stat-body"><div className="nx-stat-val">{warehouses.length}</div><div className="nx-stat-lbl">Total Locations</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-circle-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{activeWhs}</div><div className="nx-stat-lbl">Active</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-package"/></div><div className="nx-stat-body"><div className="nx-stat-val">{totalStock.toLocaleString()}</div><div className="nx-stat-lbl">Total Stock Units</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-map-pin"/></div><div className="nx-stat-body"><div className="nx-stat-val">{[...new Set(warehouses.map(w=>w.city).filter(Boolean))].length}</div><div className="nx-stat-lbl">Cities</div></div></div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:sel?'1fr 380px':'1fr',gap:16,alignItems:'start'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
        {isLoading?<div style={{color:'var(--mu)'}}>Loading...</div>:warehouses.length===0?<div style={{color:'var(--mu)'}}>No warehouses yet</div>:warehouses.map((w:any)=>(
          <div key={w.id} className="nx-card" style={{cursor:'pointer',border:sel?.id===w.id?'2px solid var(--ac)':'2px solid transparent'}} onClick={()=>{setSel(w);setSelTab('info');}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
              <div style={{width:44,height:44,borderRadius:12,background:'var(--acg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-building-warehouse" style={{fontSize:22,color:'var(--ac)'}}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                <span className={`nx-badge ${w.is_active?'active':'inactive'}`}>{w.is_active?'Active':'Inactive'}</span>
                <span className={`nx-badge ${TYPE_COLOR[w.type||'main']||'teal'}`} style={{fontSize:10}}>{w.type||'main'}</span>
              </div>
            </div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:2}}>{w.name}</div>
            <div style={{color:'var(--mu)',fontSize:12,marginBottom:10}}>{w.code||'—'} · {w.city||'—'}{w.region?', '+w.region:''}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,borderTop:'1px solid var(--bd)',paddingTop:10}}>
              <div><div style={{fontSize:10,color:'var(--mu)'}}>STOCK</div><div style={{fontWeight:700,fontSize:15}}>{w.total_items||'—'}</div></div>
              <div><div style={{fontSize:10,color:'var(--mu)'}}>MANAGER</div><div style={{fontWeight:500,fontSize:12}}>{w.manager_name||'—'}</div></div>
            </div>
            <div style={{display:'flex',gap:6,marginTop:12}}>
              <button className="btn-nx ghost sm" style={{flex:1,justifyContent:'center'}} onClick={e=>{e.stopPropagation();setEditWh(w);setShowForm(true);}}><i className="ti ti-edit"/> Edit</button>
              <button className="btn-nx ghost sm" style={{flex:1,justifyContent:'center'}} onClick={e=>{e.stopPropagation();setSel(w);setSelTab('stock');}}><i className="ti ti-package"/> Stock</button>
            </div>
          </div>
        ))}
      </div>

      {sel&&(<div style={{background:'var(--cd)',borderRadius:14,border:'1px solid var(--bd)',overflow:'hidden',position:'sticky',top:80}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>{sel.name}</div>
            <div style={{fontSize:12,color:'var(--mu)'}}>{sel.code||'—'}</div>
          </div>
          <button className="btn-nx ghost sm" onClick={()=>setSel(null)}><i className="ti ti-x"/></button>
        </div>
        <div style={{display:'flex',borderBottom:'1px solid var(--bd)'}}>
          {[['info','Info'],['stock','Stock']].map(([id,l])=>(
            <button key={id} onClick={()=>setSelTab(id)} style={{flex:1,padding:'10px 0',border:'none',background:'none',borderBottom:selTab===id?'2px solid var(--ac)':'2px solid transparent',color:selTab===id?'var(--ac)':'var(--mu)',fontWeight:selTab===id?600:400,cursor:'pointer',fontSize:13}}>{l}</button>
          ))}
        </div>
        <div style={{padding:20,maxHeight:500,overflowY:'auto'}}>
          {selTab==='info'&&(<div style={{display:'grid',gap:14}}>
            {[['Type',sel.type||'main'],['City',sel.city||'—'],['Region',sel.region||'—'],['Address',sel.address||'—'],['Manager',sel.manager_name||'—'],['Phone',sel.phone||'—'],['Capacity',sel.capacity?sel.capacity+' units':'—'],['Status',sel.is_active?'Active':'Inactive']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',paddingBottom:10,borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontSize:12,color:'var(--mu)'}}>{k}</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ))}
            <button className="btn-nx primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>{setEditWh(sel);setShowForm(true);}}><i className="ti ti-edit"/> Edit Warehouse</button>
          </div>)}
          {selTab==='stock'&&(<div>
            {stock.length===0?(<div style={{textAlign:'center',padding:'32px 0',color:'var(--mu)'}}><i className="ti ti-package" style={{fontSize:32,display:'block',marginBottom:8}}/><div>No stock data</div></div>):(
              stock.map((s:any,i:number)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--bd)'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{s.product_name||s.name||'—'}</div>
                    <div style={{fontSize:11,color:'var(--mu)'}}>{s.size?`Size: ${s.size}`:''}{s.color?` · ${s.color}`:''}{s.sku?` · ${s.sku}`:''}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,fontSize:15,color:parseInt(s.quantity)===0?'#ef4444':parseInt(s.quantity)<=5?'#f59e0b':'#10b981'}}>{s.quantity}</div>
                    <div style={{fontSize:10,color:'var(--mu)'}}>units</div>
                  </div>
                </div>
              ))
            )}
          </div>)}
        </div>
      </div>)}
    </div>

    {showForm&&<WhForm wh={editWh} onClose={()=>setShowForm(false)}/>}
  </div>);
}
