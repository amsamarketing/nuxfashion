import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:any)=>'SAR '+parseFloat(n||0).toFixed(2);
export default function Customers(){
  const qc=useQueryClient();
  const [q,setQ]=useState('');const [sel,setSel]=useState<any>(null);const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:'',phone:'',email:'',tier:'regular'});
  const {data,isLoading}=useQuery({queryKey:['customers'],queryFn:async()=>{const r=await api.get('/customers?limit=100');return r.data;}});
  const add=useMutation({mutationFn:()=>api.post('/customers',form),onSuccess:()=>{qc.invalidateQueries({queryKey:['customers']});setShowAdd(false);setForm({name:'',phone:'',email:'',tier:'regular'});}});
  const customers:any[]=Array.isArray(data)?data:data?.customers||data?.data||[];
  const filtered=customers.filter((c:any)=>!q||c.name?.toLowerCase().includes(q.toLowerCase())||(c.phone||'').includes(q)||(c.email||'').toLowerCase().includes(q.toLowerCase()));
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Customers</h1><p className="nx-page-sub">{customers.length} total customers</p></div>
      <button className="btn-nx primary" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> Add Customer</button>
    </div>
    <div className="nx-toolbar"><div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search name, phone, email..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Tier</th><th>Points</th><th>Total Spent</th><th>Actions</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0'}}>Loading...</td></tr>:filtered.map((c:any)=>(
        <tr key={c.id}>
          <td style={{fontWeight:600}}>{c.name}</td>
          <td style={{color:'var(--muted)'}}>{c.phone||'—'}</td>
          <td style={{color:'var(--muted)'}}>{c.email||'—'}</td>
          <td><span className={`nx-badge ${c.tier==='vip'?'active':c.tier==='gold'?'teal':'inactive'}`}>{c.tier||'regular'}</span></td>
          <td>{c.loyalty_points||0}</td>
          <td style={{fontWeight:600}}>{fmt(c.total_spent)}</td>
          <td><button className="btn-nx ghost sm" onClick={()=>setSel(c)}><i className="ti ti-eye"/> View</button></td>
        </tr>
      ))}</tbody>
    </table></div>
    {sel&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}} onClick={()=>setSel(null)}>
      <div style={{width:400,height:'100vh',background:'var(--cd)',padding:24,overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{sel.name}</h2>
          <button className="btn-nx ghost sm" onClick={()=>setSel(null)}><i className="ti ti-x"/></button>
        </div>
        {[['Phone',sel.phone||'—'],['Email',sel.email||'—'],['Tier',sel.tier||'regular'],['Loyalty Points',sel.loyalty_points||0],['Total Spent',fmt(sel.total_spent)],['Member Since',sel.created_at?new Date(sel.created_at).toLocaleDateString('en-GB'):'—']].map(([k,v])=>(
          <div key={k} style={{marginBottom:12}}><div style={{fontSize:11,color:'var(--muted)'}}>{k}</div><div style={{fontWeight:600}}>{v}</div></div>
        ))}
      </div>
    </div>)}
    {showAdd&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowAdd(false)}>
      <div style={{width:420,background:'var(--cd)',borderRadius:12,padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 style={{margin:0,fontSize:18,fontWeight:700}}>Add Customer</h2><button className="btn-nx ghost sm" onClick={()=>setShowAdd(false)}><i className="ti ti-x"/></button></div>
        <div style={{display:'grid',gap:10}}>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Name *</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Phone</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Email</label><input className="nx-input" style={{width:'100%',marginTop:4}} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
          <div><label style={{fontSize:12,color:'var(--muted)'}}>Tier</label>
            <select className="nx-select" style={{width:'100%',marginTop:4}} value={form.tier} onChange={e=>setForm(f=>({...f,tier:e.target.value}))}>
              {['regular','silver','gold','vip'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn-nx ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowAdd(false)}>Cancel</button>
          <button className="btn-nx primary" style={{flex:1,justifyContent:'center'}} onClick={()=>add.mutate()} disabled={!form.name}>Save</button>
        </div>
      </div>
    </div>)}
  </div>);
}
