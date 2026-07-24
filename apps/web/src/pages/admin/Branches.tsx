import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';

const money=(v:any)=>`SAR ${Number(v||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const blank={name:'',code:'',invoice_prefix:'',city:'',address:'',phone:'',manager_name:'',is_active:true};

export default function Branches(){
  const qc=useQueryClient();const {toast}=useToast();
  const [editing,setEditing]=useState<any>(null);
  const [usersFor,setUsersFor]=useState<any>(null);
  const {data=[],isLoading}=useQuery<any[]>({queryKey:['branches'],queryFn:()=>api.get('/branches').then(r=>r.data)});
  const {data:users=[]}=useQuery<any[]>({queryKey:['branch-users'],queryFn:()=>api.get('/branches/users').then(r=>r.data)});
  const branches=Array.isArray(data)?data:[];
  const totals=branches.reduce((a:any,b:any)=>({sales:a.sales+Number(b.sales_total||0),stock:a.stock+Number(b.total_units||0)}),{sales:0,stock:0});
  const save=useMutation({
    mutationFn:(form:any)=>editing?.id?api.patch(`/branches/${editing.id}`,form):api.post('/branches',form),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['branches']});setEditing(null);toast('Branch saved');},
    onError:(e:any)=>toast(e?.response?.data?.message||'Could not save branch','error'),
  });
  const assign=useMutation({
    mutationFn:(ids:string[])=>api.post(`/branches/${usersFor.id}/users`,{user_ids:ids}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['branches']});setUsersFor(null);toast('POS users assigned');},
    onError:()=>toast('Could not assign users','error'),
  });
  return <div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Branch Management</h1><p className="nx-page-sub">One company, separate POS locations and branch performance</p></div>
      <button className="btn-nx primary" onClick={()=>setEditing({...blank})}><i className="ti ti-plus"/> Add Branch</button>
    </div>
    <div className="nx-stats cols-4" style={{marginBottom:20}}>
      <Stat icon="ti-building-store" tone="indigo" label="Total Branches" value={branches.length}/>
      <Stat icon="ti-circle-check" tone="green" label="Active Branches" value={branches.filter(b=>b.is_active).length}/>
      <Stat icon="ti-package" tone="amber" label="Stock Units" value={totals.stock.toLocaleString()}/>
      <Stat icon="ti-cash" tone="teal" label="Recorded Sales" value={money(totals.sales)}/>
    </div>
    <div className="branch-grid">
      {isLoading?<div className="nx-card">Loading branches…</div>:branches.map((b:any)=><article className="branch-card" key={b.id}>
        <div className="branch-card-head">
          <div className="branch-avatar"><i className="ti ti-building-store"/></div>
          <div><h3>{b.name}</h3><p>{b.code} · Invoice {b.invoice_prefix}-00001</p></div>
          <span className={`nx-badge ${b.is_active?'active':'inactive'}`}>{b.is_active?'Active':'Inactive'}</span>
        </div>
        <div className="branch-location"><i className="ti ti-map-pin"/>{b.city||'City not set'}{b.manager_name?` · ${b.manager_name}`:''}</div>
        <div className="branch-metrics">
          <div><span>Sales</span><strong>{money(b.sales_total)}</strong></div>
          <div><span>Orders</span><strong>{Number(b.order_count||0).toLocaleString()}</strong></div>
          <div><span>Stock</span><strong>{Number(b.total_units||0).toLocaleString()}</strong></div>
          <div><span>POS Users</span><strong>{b.user_count||0}</strong></div>
        </div>
        <div className="branch-users">{(b.assigned_users||[]).slice(0,3).map((u:any)=><span key={u.id}>{u.name||u.email}</span>)}{!b.user_count&&<em>No POS users assigned</em>}</div>
        <div className="branch-actions">
          <button className="btn-nx ghost sm" onClick={()=>setEditing(b)}><i className="ti ti-edit"/> Edit</button>
          <button className="btn-nx primary sm" onClick={()=>setUsersFor(b)}><i className="ti ti-users"/> Assign POS Users</button>
        </div>
      </article>)}
      {!isLoading&&!branches.length&&<div className="nx-card">No branches found. Add your first branch to create its POS warehouse.</div>}
    </div>
    {editing&&<BranchModal branch={editing} onClose={()=>setEditing(null)} onSave={(f:any)=>save.mutate(f)} saving={save.isPending}/>}
    {usersFor&&<UserModal branch={usersFor} users={users} onClose={()=>setUsersFor(null)} onSave={(ids:string[])=>assign.mutate(ids)} saving={assign.isPending}/>}
  </div>;
}

function Stat({icon,tone,label,value}:any){return <div className="nx-stat"><div className={`nx-stat-icon ${tone}`}><i className={`ti ${icon}`}/></div><div className="nx-stat-body"><div className="nx-stat-val">{value}</div><div className="nx-stat-lbl">{label}</div></div></div>}

function BranchModal({branch,onClose,onSave,saving}:any){
  const [f,setF]=useState({...blank,...branch});const set=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));
  const isNew=!branch.id;
  return <div className="branch-modal-shade" onClick={onClose}><div className="branch-modal" onClick={e=>e.stopPropagation()}>
    <header><div><h2>{isNew?'Add New Branch':'Edit Branch'}</h2><p>A separate warehouse and POS identity will be linked automatically.</p></div><button onClick={onClose}><i className="ti ti-x"/></button></header>
    <div className="branch-form">
      <Field label="Branch Name *"><input value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Riyadh Olaya Branch"/></Field>
      <Field label="Branch Code *"><input value={f.code} onChange={e=>set('code',e.target.value.toUpperCase())} placeholder="RYD01" disabled={!isNew}/></Field>
      <Field label="Invoice Prefix *"><input value={f.invoice_prefix} onChange={e=>set('invoice_prefix',e.target.value.toUpperCase())} placeholder="RYD"/></Field>
      <Field label="City"><input value={f.city||''} onChange={e=>set('city',e.target.value)} placeholder="Riyadh"/></Field>
      <Field label="Manager"><input value={f.manager_name||''} onChange={e=>set('manager_name',e.target.value)} placeholder="Branch manager"/></Field>
      <Field label="Phone"><input value={f.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="+966 5X XXX XXXX"/></Field>
      <Field label="Address" full><textarea rows={3} value={f.address||''} onChange={e=>set('address',e.target.value)} placeholder="Full branch address"/></Field>
      <label className="branch-check"><input type="checkbox" checked={f.is_active!==false} onChange={e=>set('is_active',e.target.checked)}/> Active branch and POS</label>
    </div>
    <footer><button className="btn-nx ghost" onClick={onClose}>Cancel</button><button className="btn-nx primary" disabled={!f.name||!f.code||!f.invoice_prefix||saving} onClick={()=>onSave(f)}>{saving?'Saving…':'Save Branch'}</button></footer>
  </div></div>;
}

function Field({label,full,children}:any){return <label className={full?'full':''}><span>{label}</span>{children}</label>}

function UserModal({branch,users,onClose,onSave,saving}:any){
  const initial=(branch.assigned_users||[]).map((x:any)=>x.id);const [selected,setSelected]=useState<string[]>(initial);
  useEffect(()=>setSelected(initial),[branch.id]);
  const toggle=(id:string)=>setSelected(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id]);
  return <div className="branch-modal-shade" onClick={onClose}><div className="branch-modal small" onClick={e=>e.stopPropagation()}>
    <header><div><h2>Assign POS Users</h2><p>{branch.name} · Selected users will use this branch POS.</p></div><button onClick={onClose}><i className="ti ti-x"/></button></header>
    <div className="branch-user-list">{users.map((u:any)=><label key={u.id}><input type="checkbox" checked={selected.includes(u.id)} onChange={()=>toggle(u.id)}/><span><b>{u.name||'User'}</b><small>{u.email}</small></span></label>)}</div>
    <footer><button className="btn-nx ghost" onClick={onClose}>Cancel</button><button className="btn-nx primary" disabled={saving} onClick={()=>onSave(selected)}>{saving?'Assigning…':'Save Assignments'}</button></footer>
  </div></div>;
}
