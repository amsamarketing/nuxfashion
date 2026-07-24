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
  const [financeFor,setFinanceFor]=useState<any>(null);
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
          <button className="btn-nx ghost sm" onClick={()=>setFinanceFor(b)}><i className="ti ti-wallet"/> Finance Setup</button>
          <button className="btn-nx primary sm" onClick={()=>setUsersFor(b)}><i className="ti ti-users"/> Assign POS Users</button>
        </div>
      </article>)}
      {!isLoading&&!branches.length&&<div className="nx-card">No branches found. Add your first branch to create its POS warehouse.</div>}
    </div>
    {editing&&<BranchModal branch={editing} onClose={()=>setEditing(null)} onSave={(f:any)=>save.mutate(f)} saving={save.isPending}/>}
    {usersFor&&<UserModal branch={usersFor} users={users} onClose={()=>setUsersFor(null)} onSave={(ids:string[])=>assign.mutate(ids)} saving={assign.isPending}/>}
    {financeFor&&<FinanceModal branch={financeFor} onClose={()=>setFinanceFor(null)}/>}
  </div>;
}

function FinanceModal({branch,onClose}:any){
  const qc=useQueryClient();const {toast}=useToast();const [tab,setTab]=useState('accounts');
  const [partner,setPartner]=useState<any>(null);const [account,setAccount]=useState<any>(null);const [adjust,setAdjust]=useState<any>(null);
  const {data,isLoading}=useQuery<any>({queryKey:['branch-finance',branch.id],queryFn:()=>api.get(`/branches/${branch.id}/finance`).then(r=>r.data)});
  const refresh=()=>{qc.invalidateQueries({queryKey:['branch-finance',branch.id]});qc.invalidateQueries({queryKey:['branches']})};
  const partnerSave=useMutation({mutationFn:(f:any)=>f.id?api.patch(`/branches/${branch.id}/partners/${f.id}`,f):api.post(`/branches/${branch.id}/partners`,f),onSuccess:()=>{refresh();setPartner(null);toast('Partner saved')},onError:(e:any)=>toast(e?.response?.data?.message||'Could not save partner','error')});
  const accountSave=useMutation({mutationFn:(f:any)=>f.id?api.patch(`/branches/${branch.id}/accounts/${f.id}`,f):api.post(`/branches/${branch.id}/accounts`,f),onSuccess:()=>{refresh();setAccount(null);toast('Payment account saved')},onError:(e:any)=>toast(e?.response?.data?.message||'Could not save account','error')});
  const adjustment=useMutation({mutationFn:(f:any)=>api.post(`/branches/${branch.id}/accounts/${adjust.id}/adjustments`,f),onSuccess:()=>{refresh();setAdjust(null);toast('Account balance adjusted')},onError:(e:any)=>toast(e?.response?.data?.message||'Could not post adjustment','error')});
  return <div className="branch-modal-shade" onClick={onClose}><div className="branch-finance-modal" onClick={e=>e.stopPropagation()}>
    <header><div><span className="finance-kicker">Branch Finance</span><h2>{branch.name}</h2><p>Partners, payment channels and branch account balances</p></div><button onClick={onClose}><i className="ti ti-x"/></button></header>
    <nav>{[['accounts','Payment Accounts'],['partners','Partners'],['ledger','Account Ledger']].map(([id,label])=><button className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    <main>
      {isLoading?<div className="finance-empty">Loading financial setup…</div>:<>
        {tab==='accounts'&&<section>
          <div className="finance-section-head"><div><h3>Branch Payment Accounts</h3><p>POS payments post to the matching default account automatically.</p></div><button className="btn-nx primary sm" onClick={()=>setAccount({name:'',method:'cash',provider:'',account_reference:'',opening_balance:0,is_default:false,is_active:true})}><i className="ti ti-plus"/> Add Account</button></div>
          <div className="payment-account-grid">{(data?.accounts||[]).map((a:any)=><article key={a.id}>
            <div className={`payment-method-icon ${a.method}`}><i className={`ti ${paymentIcon(a.method)}`}/></div>
            <div className="payment-account-title"><b>{a.name}</b><span>{String(a.method).replace(/_/g,' ')}{a.provider?` · ${a.provider}`:''}</span></div>
            <strong>{money(a.balance)}</strong>
            <div className="payment-account-meta"><span>{a.is_default?'Default POS account':'Additional account'}</span><span>{a.transaction_count||0} entries</span></div>
            <div className="payment-account-actions"><button onClick={()=>setAdjust(a)}>Adjust</button><button onClick={()=>setAccount(a)}>Edit</button></div>
          </article>)}</div>
        </section>}
        {tab==='partners'&&<section>
          <div className="finance-section-head"><div><h3>Branch Partners</h3><p>Active ownership total: <b className={Number(data?.ownership_total)>100?'bad':''}>{Number(data?.ownership_total||0).toFixed(2)}%</b></p></div><button className="btn-nx primary sm" onClick={()=>setPartner({name:'',phone:'',email:'',ownership_percent:0,capital_contribution:0,notes:'',is_active:true})}><i className="ti ti-plus"/> Add Partner</button></div>
          <div className="partner-table"><div className="partner-row head"><span>Partner</span><span>Ownership</span><span>Capital</span><span>Status</span><span/></div>
          {(data?.partners||[]).map((p:any)=><div className="partner-row" key={p.id}><span><b>{p.name}</b><small>{p.phone||p.email||'No contact'}</small></span><strong>{Number(p.ownership_percent).toFixed(2)}%</strong><span>{money(p.capital_contribution)}</span><span className={`nx-badge ${p.is_active?'active':'inactive'}`}>{p.is_active?'Active':'Inactive'}</span><button onClick={()=>setPartner(p)}>Edit</button></div>)}</div>
          {!(data?.partners||[]).length&&<div className="finance-empty">No partners added for this branch.</div>}
        </section>}
        {tab==='ledger'&&<section>
          <div className="finance-section-head"><div><h3>Account Ledger</h3><p>Automatic POS collections, refunds and manual adjustments.</p></div></div>
          <div className="ledger-table"><div className="ledger-row head"><span>Date</span><span>Account</span><span>Reference</span><span>Debit</span><span>Credit</span></div>
          {(data?.ledger||[]).map((t:any)=><div className="ledger-row" key={t.id}><span>{new Date(t.created_at).toLocaleString('en-GB')}</span><span><b>{t.account_name}</b><small>{t.method}</small></span><span>{t.note||t.reference_type||'—'}</span><strong className="debit">{t.direction==='debit'?money(t.amount):'—'}</strong><strong className="credit">{t.direction==='credit'?money(t.amount):'—'}</strong></div>)}</div>
          {!(data?.ledger||[]).length&&<div className="finance-empty">No account transactions yet.</div>}
        </section>}
      </>}
    </main>
    {partner&&<PartnerForm value={partner} close={()=>setPartner(null)} save={(f:any)=>partnerSave.mutate(f)} saving={partnerSave.isPending}/>}
    {account&&<AccountForm value={account} close={()=>setAccount(null)} save={(f:any)=>accountSave.mutate(f)} saving={accountSave.isPending}/>}
    {adjust&&<AdjustmentForm account={adjust} close={()=>setAdjust(null)} save={(f:any)=>adjustment.mutate(f)} saving={adjustment.isPending}/>}
  </div></div>;
}

const paymentIcon=(m:string)=>m==='cash'?'ti-cash':m==='bank_transfer'?'ti-building-bank':m==='tabby'||m==='tamara'?'ti-calendar-dollar':'ti-credit-card';
function SubForm({title,children,close,save,saving,disabled}:any){return <div className="finance-subshade" onClick={close}><div className="finance-subform" onClick={e=>e.stopPropagation()}><header><h3>{title}</h3><button onClick={close}><i className="ti ti-x"/></button></header><div>{children}</div><footer><button className="btn-nx ghost" onClick={close}>Cancel</button><button className="btn-nx primary" disabled={saving||disabled} onClick={save}>{saving?'Saving…':'Save'}</button></footer></div></div>}
function PartnerForm({value,close,save,saving}:any){const [f,setF]=useState(value),set=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));return <SubForm title={f.id?'Edit Partner':'Add Partner'} close={close} save={()=>save(f)} saving={saving} disabled={!f.name}><div className="finance-form"><Field label="Partner Name *"><input value={f.name} onChange={e=>set('name',e.target.value)}/></Field><Field label="Ownership % *"><input type="number" min="0" max="100" step=".01" value={f.ownership_percent} onChange={e=>set('ownership_percent',e.target.value)}/></Field><Field label="Capital Contribution"><input type="number" min="0" value={f.capital_contribution} onChange={e=>set('capital_contribution',e.target.value)}/></Field><Field label="Phone"><input value={f.phone||''} onChange={e=>set('phone',e.target.value)}/></Field><Field label="Email"><input type="email" value={f.email||''} onChange={e=>set('email',e.target.value)}/></Field><Field label="Notes" full><textarea rows={3} value={f.notes||''} onChange={e=>set('notes',e.target.value)}/></Field><label className="branch-check"><input type="checkbox" checked={f.is_active!==false} onChange={e=>set('is_active',e.target.checked)}/> Active partner</label></div></SubForm>}
function AccountForm({value,close,save,saving}:any){const [f,setF]=useState(value),set=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));return <SubForm title={f.id?'Edit Payment Account':'Add Payment Account'} close={close} save={()=>save(f)} saving={saving} disabled={!f.name||!f.method}><div className="finance-form"><Field label="Account Name *"><input value={f.name} onChange={e=>set('name',e.target.value)}/></Field><Field label="Payment Method *"><select value={f.method} onChange={e=>set('method',e.target.value)}>{['cash','card','mada','apple_pay','stc_pay','tabby','tamara','bank_transfer'].map(x=><option key={x} value={x}>{x.replace(/_/g,' ')}</option>)}</select></Field><Field label="Bank / Provider"><input value={f.provider||''} onChange={e=>set('provider',e.target.value)}/></Field><Field label="IBAN / Terminal Reference"><input value={f.account_reference||''} onChange={e=>set('account_reference',e.target.value)}/></Field><Field label="Opening Balance"><input type="number" value={f.opening_balance||0} onChange={e=>set('opening_balance',e.target.value)}/></Field><label className="branch-check"><input type="checkbox" checked={f.is_default===true} onChange={e=>set('is_default',e.target.checked)}/> Default for this payment method</label><label className="branch-check"><input type="checkbox" checked={f.is_active!==false} onChange={e=>set('is_active',e.target.checked)}/> Active account</label></div></SubForm>}
function AdjustmentForm({account,close,save,saving}:any){const [f,setF]=useState({direction:'credit',amount:'',note:''});return <SubForm title={`Adjust ${account.name}`} close={close} save={()=>save({...f,amount:Number(f.amount)})} saving={saving} disabled={!Number(f.amount)}><div className="finance-form"><Field label="Entry Type"><select value={f.direction} onChange={e=>setF(x=>({...x,direction:e.target.value}))}><option value="credit">Money In / Credit</option><option value="debit">Money Out / Debit</option></select></Field><Field label="Amount *"><input autoFocus type="number" min=".01" value={f.amount} onChange={e=>setF(x=>({...x,amount:e.target.value}))}/></Field><Field label="Reason / Reference" full><textarea rows={3} value={f.note} onChange={e=>setF(x=>({...x,note:e.target.value}))}/></Field></div></SubForm>}

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
