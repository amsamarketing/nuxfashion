import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

const ACCT_TYPE_COLOR:{[k:string]:string}={asset:'indigo',liability:'red',equity:'purple',revenue:'green',expense:'amber'};
const ACCT_TYPE_ICON:{[k:string]:string}={asset:'ti-building-bank',liability:'ti-arrow-up-circle',equity:'ti-chart-pie',revenue:'ti-trending-up',expense:'ti-trending-down'};
const PAY_METHOD:{[k:string]:string}={cash:'💵 Cash',card:'💳 Card',bank_transfer:'🏦 Bank Transfer'};
const inp=(label:string,el:React.ReactNode)=>(<div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>{label}</label>{el}</div>);

const fmt=(n:number)=>'SAR '+(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK=(n:number)=>{const abs=Math.abs(n||0);return (n<0?'-':'')+( abs>=1000?'SAR '+(abs/1000).toFixed(1)+'k':'SAR '+abs.toFixed(0));};

function ProgressBar({value,max,color}:{value:number;max:number;color:string}){
  const pct=max>0?Math.min(100,(value/max)*100):0;
  return <div style={{height:6,background:'var(--bg)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',background:color,borderRadius:3,transition:'width .3s'}}/></div>;
}

/* ── Account Modal ── */
function AccountModal({acct,accounts,onClose}:{acct:any;accounts:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({code:acct?.code||'',name:acct?.name||'',type:acct?.type||'asset',category:acct?.category||'',parent_id:acct?.parent_id||''});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const parents=accounts.filter(a=>a.type===form.type&&a.id!==acct?.id&&!a.parent_id);
  const save=useMutation({
    mutationFn:()=>api.post('/finance/accounts',{...form,parent_id:form.parent_id||undefined}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['fin-accounts']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(480px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>{acct?.id?'Edit Account':'New Account'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:10}}>
            {inp('Code *',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.code} onChange={e=>F('code',e.target.value)} placeholder="1001"/>)}
            {inp('Account Name *',<input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Cash & Cash Equivalents"/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Type *',<select className="nx-select" style={{width:'100%'}} value={form.type} onChange={e=>F('type',e.target.value)}>
              <option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option>
            </select>)}
            {inp('Category',<input className="nx-input" style={{width:'100%'}} value={form.category} onChange={e=>F('category',e.target.value)} placeholder="Current Assets"/>)}
          </div>
          {inp('Parent Account',<select className="nx-select" style={{width:'100%'}} value={form.parent_id} onChange={e=>F('parent_id',e.target.value)}>
            <option value="">— None (Root) —</option>{parents.map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>)}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.code||!form.name||save.isPending}>{save.isPending?'Saving...':'Save Account'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Expense Modal ── */
function ExpenseModal({categories,branches,onClose}:{categories:any[];branches:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({branch_id:'',category_id:'',date:new Date().toISOString().slice(0,10),description:'',amount:'',tax_amount:'',payment_method:'cash',vendor:'',receipt_ref:'',notes:''});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const save=useMutation({
    mutationFn:()=>api.post('/finance/expenses',{...form,amount:parseFloat(form.amount),tax_amount:parseFloat(form.tax_amount)||undefined,category_id:form.category_id||undefined,branch_id:form.branch_id||undefined}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['expenses']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(560px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>Record Expense</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          {inp('Branch / Profit Centre',<select className="nx-select" style={{width:'100%'}} value={form.branch_id} onChange={e=>F('branch_id',e.target.value)}><option value="">— Head Office / Unallocated —</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select>)}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Date *',<input className="nx-input" type="date" style={{width:'100%'}} value={form.date} onChange={e=>F('date',e.target.value)}/>)}
            {inp('Category',<select className="nx-select" style={{width:'100%'}} value={form.category_id} onChange={e=>F('category_id',e.target.value)}><option value="">— Uncategorized —</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
          </div>
          {inp('Description *',<input className="nx-input" style={{width:'100%'}} value={form.description} onChange={e=>F('description',e.target.value)} placeholder="Office supplies, rent, utilities..."/>)}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Amount (SAR) *',<input className="nx-input" type="number" style={{width:'100%'}} value={form.amount} onChange={e=>F('amount',e.target.value)} placeholder="0.00"/>)}
            {inp('VAT Amount (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.tax_amount} onChange={e=>F('tax_amount',e.target.value)} placeholder="0.00"/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Payment Method',<select className="nx-select" style={{width:'100%'}} value={form.payment_method} onChange={e=>F('payment_method',e.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option></select>)}
            {inp('Vendor / Supplier',<input className="nx-input" style={{width:'100%'}} value={form.vendor} onChange={e=>F('vendor',e.target.value)} placeholder="Vendor name"/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Receipt / Ref #',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.receipt_ref} onChange={e=>F('receipt_ref',e.target.value)} placeholder="INV-2024-001"/>)}
            {inp('Notes',<input className="nx-input" style={{width:'100%'}} value={form.notes} onChange={e=>F('notes',e.target.value)}/>)}
          </div>
          {form.amount&&form.tax_amount&&<div style={{padding:'8px 12px',background:'var(--acg)',borderRadius:8,display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span style={{color:'var(--mu)'}}>Total incl. VAT</span>
            <span style={{fontWeight:700,color:'var(--ac)'}}>SAR {(parseFloat(form.amount)+parseFloat(form.tax_amount)).toFixed(2)}</span>
          </div>}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.description||!form.amount||!form.date||save.isPending}>{save.isPending?'Saving...':'Save Expense'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Journal Entry Modal ── */
function JournalModal({accounts,onClose}:{accounts:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),description:'',reference_type:'manual',lines:[{account_id:'',description:'',debit:'',credit:''},{account_id:'',description:'',debit:'',credit:''}]});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const setLine=(i:number,k:string,v:string)=>setForm(f=>{const lines=[...f.lines];lines[i]={...lines[i],[k]:v};return{...f,lines};});
  const addLine=()=>setForm(f=>({...f,lines:[...f.lines,{account_id:'',description:'',debit:'',credit:''}]}));
  const removeLine=(i:number)=>setForm(f=>({...f,lines:f.lines.filter((_,j)=>j!==i)}));
  const totalDebit=form.lines.reduce((s,l)=>s+parseFloat(l.debit||'0'),0);
  const totalCredit=form.lines.reduce((s,l)=>s+parseFloat(l.credit||'0'),0);
  const balanced=Math.abs(totalDebit-totalCredit)<0.01&&totalDebit>0;
  const save=useMutation({
    mutationFn:()=>api.post('/finance/journal',{date:form.date,description:form.description,reference_type:form.reference_type||undefined,lines:form.lines.filter(l=>l.account_id).map(l=>({account_id:l.account_id,description:l.description||undefined,debit:parseFloat(l.debit||'0'),credit:parseFloat(l.credit||'0')}))}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['journal']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(780px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>New Journal Entry</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,flex:1,overflowY:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
            {inp('Date *',<input className="nx-input" type="date" style={{width:'100%'}} value={form.date} onChange={e=>F('date',e.target.value)}/>)}
            {inp('Reference Type',<select className="nx-select" style={{width:'100%'}} value={form.reference_type} onChange={e=>F('reference_type',e.target.value)}><option value="manual">Manual</option><option value="sale">Sale</option><option value="purchase">Purchase</option><option value="expense">Expense</option><option value="payroll">Payroll</option><option value="adjustment">Adjustment</option></select>)}
            {inp('Description *',<input className="nx-input" style={{width:'100%'}} value={form.description} onChange={e=>F('description',e.target.value)} placeholder="Month-end accrual..."/>)}
          </div>
          <div style={{marginBottom:10,overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
                <th style={{padding:'8px 10px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600,width:'35%'}}>Account</th>
                <th style={{padding:'8px 10px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600,width:'25%'}}>Description</th>
                <th style={{padding:'8px 10px',textAlign:'right',fontSize:11,color:'var(--mu)',fontWeight:600,width:'15%'}}>Debit (SAR)</th>
                <th style={{padding:'8px 10px',textAlign:'right',fontSize:11,color:'var(--mu)',fontWeight:600,width:'15%'}}>Credit (SAR)</th>
                <th style={{width:'5%'}}></th>
              </tr></thead>
              <tbody>
                {form.lines.map((l,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid var(--bd)'}}>
                    <td style={{padding:'6px 10px'}}>
                      <select className="nx-select" style={{width:'100%',fontSize:12}} value={l.account_id} onChange={e=>setLine(i,'account_id',e.target.value)}>
                        <option value="">Select account...</option>
                        {['asset','liability','equity','revenue','expense'].map(type=>(
                          <optgroup key={type} label={type.toUpperCase()}>
                            {accounts.filter(a=>a.type===type).map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td style={{padding:'6px 10px'}}><input className="nx-input" style={{width:'100%',fontSize:12}} value={l.description} onChange={e=>setLine(i,'description',e.target.value)} placeholder="Optional"/></td>
                    <td style={{padding:'6px 10px'}}><input className="nx-input" type="number" style={{width:'100%',fontSize:12,textAlign:'right'}} value={l.debit} onChange={e=>{setLine(i,'debit',e.target.value);if(e.target.value)setLine(i,'credit','');}} placeholder="0.00"/></td>
                    <td style={{padding:'6px 10px'}}><input className="nx-input" type="number" style={{width:'100%',fontSize:12,textAlign:'right'}} value={l.credit} onChange={e=>{setLine(i,'credit',e.target.value);if(e.target.value)setLine(i,'debit','');}} placeholder="0.00"/></td>
                    <td style={{padding:'6px 10px'}}>{form.lines.length>2&&<button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>removeLine(i)}><i className="ti ti-trash"/></button>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:'2px solid var(--bd)',background:'var(--bg)'}}>
                  <td colSpan={2} style={{padding:'8px 10px'}}><button className="btn-nx ghost sm" onClick={addLine}><i className="ti ti-plus"/> Add Line</button></td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:14}}>{totalDebit.toFixed(2)}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:14}}>{totalCredit.toFixed(2)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{padding:'10px 14px',borderRadius:8,background:balanced?'#d1fae5':'#fee2e2',color:balanced?'#065f46':'#991b1b',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
            <i className={`ti ${balanced?'ti-check':'ti-alert-circle'}`}/>
            {balanced?'✓ Entry is balanced':'Entry is not balanced — Debits must equal Credits'}
            {!balanced&&totalDebit>0&&<span style={{marginLeft:'auto',fontSize:12}}>Difference: SAR {Math.abs(totalDebit-totalCredit).toFixed(2)}</span>}
          </div>
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end',flexShrink:0}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!balanced||!form.description||save.isPending}>{save.isPending?'Posting...':'Post Journal Entry'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Category Modal ── */
function ExpCatModal({accounts,onClose}:{accounts:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({name:'',description:'',account_id:''});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const save=useMutation({
    mutationFn:()=>api.post('/finance/expense-categories',{...form,account_id:form.account_id||undefined}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['exp-categories']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(440px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>New Expense Category</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          {inp('Category Name *',<input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Rent & Utilities"/>)}
          {inp('Description',<textarea className="nx-input" style={{width:'100%',height:52,resize:'none'}} value={form.description} onChange={e=>F('description',e.target.value)}/>)}
          {inp('Linked GL Account',<select className="nx-select" style={{width:'100%'}} value={form.account_id} onChange={e=>F('account_id',e.target.value)}><option value="">— None —</option>{accounts.filter(a=>a.type==='expense').map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select>)}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||save.isPending}>{save.isPending?'Saving...':'Save'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function Accounting(){
  const [tab,setTab]=useState('dashboard');
  const [reportTab,setReportTab]=useState('pl');
  const [dateFrom,setDateFrom]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10));
  const [dateTo,setDateTo]=useState(new Date().toISOString().slice(0,10));
  const [expSearch,setExpSearch]=useState('');
  const [expCat,setExpCat]=useState('');
  const [jSearch,setJSearch]=useState('');
  const [showJournal,setShowJournal]=useState(false);
  const [showExpense,setShowExpense]=useState(false);
  const [showAccount,setShowAccount]=useState(false);
  const [showExpCat,setShowExpCat]=useState(false);
  const [selectedJournal,setSelectedJournal]=useState<any>(null);

  const {data:acctData}=useQuery({queryKey:['fin-accounts'],queryFn:async()=>{const r=await api.get('/finance/accounts');return r.data;}});
  const {data:journalData,isLoading:jLoading}=useQuery({queryKey:['journal'],queryFn:async()=>{const r=await api.get('/finance/journal');return r.data;},enabled:tab==='journal'||tab==='dashboard'});
  const {data:expData,isLoading:expLoading}=useQuery({queryKey:['expenses'],queryFn:async()=>{const r=await api.get('/finance/expenses');return r.data;},enabled:tab==='expenses'||tab==='dashboard'});
  const {data:expCatData}=useQuery({queryKey:['exp-categories'],queryFn:async()=>{const r=await api.get('/finance/expense-categories');return r.data;}});
  const {data:branchData=[]}=useQuery<any[]>({queryKey:['branches'],queryFn:async()=>{const r=await api.get('/branches');return Array.isArray(r.data)?r.data:[];}});
  const {data:plData}=useQuery({queryKey:['pl',dateFrom,dateTo],queryFn:async()=>{const r=await api.get(`/finance/reports/profit-loss?from=${dateFrom}&to=${dateTo}`);return r.data;},enabled:tab==='reports'&&reportTab==='pl'});
  const {data:bsData}=useQuery({queryKey:['bs'],queryFn:async()=>{const r=await api.get('/finance/reports/balance-sheet');return r.data;},enabled:tab==='reports'&&reportTab==='bs'});
  const {data:vatData}=useQuery({queryKey:['vat',dateFrom,dateTo],queryFn:async()=>{const r=await api.get(`/finance/reports/vat?from=${dateFrom}&to=${dateTo}`);return r.data;},enabled:tab==='reports'&&reportTab==='vat'});
  const {data:cfData}=useQuery({queryKey:['cf',dateFrom,dateTo],queryFn:async()=>{const r=await api.get(`/finance/reports/cash-flow?from=${dateFrom}&to=${dateTo}`);return r.data;},enabled:tab==='reports'&&reportTab==='cf'});

  const accounts:any[]=Array.isArray(acctData)?acctData:acctData?.accounts||acctData?.data||[];
  const journal:any[]=Array.isArray(journalData)?journalData:journalData?.entries||journalData?.data||[];
  const expenses:any[]=Array.isArray(expData)?expData:expData?.expenses||expData?.data||[];
  const expCategories:any[]=Array.isArray(expCatData)?expCatData:expCatData?.categories||expCatData?.data||[];
  const branches:any[]=Array.isArray(branchData)?branchData:[];
  const acctMap=Object.fromEntries(accounts.map(a=>[a.id,a]));
  const catMap=Object.fromEntries(expCategories.map(c=>[c.id,c.name]));

  const totalExpenses=expenses.reduce((s,e)=>s+(e.amount||0),0);
  const totalVAT=expenses.reduce((s,e)=>s+(e.tax_amount||0),0);
  const recentJournal=journal.slice(0,5);
  const recentExpenses=expenses.slice(0,5);

  const filteredExp=useMemo(()=>{
    let list=expenses;
    if(expCat) list=list.filter(e=>e.category_id===expCat);
    if(expSearch) list=list.filter(e=>e.description?.toLowerCase().includes(expSearch.toLowerCase())||e.vendor?.toLowerCase().includes(expSearch.toLowerCase())||e.receipt_ref?.toLowerCase().includes(expSearch.toLowerCase()));
    return list;
  },[expenses,expCat,expSearch]);

  const filteredJournal=useMemo(()=>journal.filter(j=>!jSearch||j.description?.toLowerCase().includes(jSearch.toLowerCase())||j.reference_type?.toLowerCase().includes(jSearch.toLowerCase())),[journal,jSearch]);

  const expByCat=useMemo(()=>{
    const map:{[k:string]:number}={};
    expenses.forEach(e=>{const k=catMap[e.category_id]||'Uncategorized';map[k]=(map[k]||0)+(e.amount||0);});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
  },[expenses,catMap]);

  const groupedAccounts=useMemo(()=>{
    const g:{[k:string]:any[]}={asset:[],liability:[],equity:[],revenue:[],expense:[]};
    accounts.forEach(a=>{if(g[a.type])g[a.type].push(a);});
    return g;
  },[accounts]);

  const setQuick=(period:string)=>{
    const now=new Date();
    if(period==='month'){setDateFrom(new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10));setDateTo(new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10));}
    if(period==='quarter'){const q=Math.floor(now.getMonth()/3);setDateFrom(new Date(now.getFullYear(),q*3,1).toISOString().slice(0,10));setDateTo(new Date(now.getFullYear(),q*3+3,0).toISOString().slice(0,10));}
    if(period==='year'){setDateFrom(new Date(now.getFullYear(),0,1).toISOString().slice(0,10));setDateTo(new Date(now.getFullYear(),11,31).toISOString().slice(0,10));}
  };

  const ReportSection=({title,data,color}:{title:string;data:any[];color:string})=>{
    const safeData=Array.isArray(data)?data:[];const total=safeData.reduce((s,r)=>s+(r.amount||r.balance||r.total||0),0);
    return safeData.length===0?(<div style={{padding:16,textAlign:"center",color:"var(--mu)",fontSize:13}}>No data for this period</div>):(<div style={{marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>{title}</span><span style={{color}}>{fmt(total)}</span>
      </div>
      {safeData.map((r:any,i:number)=>{
        const val=r.amount||r.balance||r.total||0;
        return(<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--bd)',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13}}>{r.name||r.account||r.category||'—'}</div>
            {r.account_code&&<div style={{fontSize:11,color:'var(--mu)',fontFamily:'monospace'}}>{r.account_code}</div>}
          </div>
          <div style={{width:120,flexShrink:0}}><ProgressBar value={val} max={total} color={color}/></div>
          <div style={{fontWeight:600,fontSize:13,minWidth:100,textAlign:'right'}}>{fmt(val)}</div>
        </div>);
      })}
    </div>);
  };

  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Accounting & Finance</h1><p className="nx-page-sub">{accounts.length} GL accounts · {journal.length} journal entries</p></div>
      <div style={{display:'flex',gap:8}}>
        {tab==='journal'&&<button className="btn-nx primary" onClick={()=>setShowJournal(true)}><i className="ti ti-plus"/> Journal Entry</button>}
        {tab==='expenses'&&<><button className="btn-nx ghost" onClick={()=>setShowExpCat(true)}><i className="ti ti-plus"/> Category</button><button className="btn-nx primary" onClick={()=>setShowExpense(true)}><i className="ti ti-plus"/> Expense</button></>}
        {tab==='accounts'&&<button className="btn-nx primary" onClick={()=>setShowAccount(true)}><i className="ti ti-plus"/> New Account</button>}
        {tab==='dashboard'&&<><button className="btn-nx ghost" onClick={()=>setShowExpense(true)}><i className="ti ti-receipt"/> Add Expense</button><button className="btn-nx primary" onClick={()=>setShowJournal(true)}><i className="ti ti-plus"/> Journal Entry</button></>}
      </div>
    </div>

    <div className="nx-stats cols-4" style={{marginBottom:16}}>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-trending-up"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmtK((plData as any)?.total_revenue||0)}</div><div className="nx-stat-lbl">Total Revenue</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-trending-down"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmtK(totalExpenses)}</div><div className="nx-stat-lbl">Total Expenses</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-chart-bar"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmtK(((plData as any)?.net_profit)||0)}</div><div className="nx-stat-lbl">Net Profit</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-file-invoice"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmtK(totalVAT)}</div><div className="nx-stat-lbl">VAT (Input)</div></div></div>
    </div>

    <div style={{display:'flex',gap:4,marginBottom:14,borderBottom:'1px solid var(--bd)'}}>
      {[['dashboard','📊 Dashboard'],['journal','📒 Journal'],['expenses','🧾 Expenses'],['accounts','📂 Chart of Accounts'],['reports','📈 Reports']].map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:'8px 16px',border:'none',background:'none',borderBottom:tab===id?'2px solid var(--ac)':'2px solid transparent',color:tab===id?'var(--ac)':'var(--mu)',fontWeight:tab===id?600:400,cursor:'pointer',fontSize:13}}>{l}</button>
      ))}
    </div>

    {/* DASHBOARD */}
    {tab==='dashboard'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div className="nx-card">
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Expenses by Category</div>
        {expByCat.length===0?<div style={{color:'var(--mu)',fontSize:13,textAlign:'center',padding:24}}>No expense data</div>:expByCat.map(([cat,amt])=>(
          <div key={cat} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>{cat}</span><span style={{fontWeight:600}}>{fmt(amt)}</span></div>
            <ProgressBar value={amt} max={expByCat[0][1]} color="var(--ac)"/>
          </div>
        ))}
      </div>
      <div className="nx-card">
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Recent Journal Entries</div>
        {recentJournal.length===0?<div style={{color:'var(--mu)',fontSize:13,textAlign:'center',padding:24}}>No entries yet</div>:recentJournal.map((j:any)=>(
          <div key={j.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--bd)'}}>
            <div><div style={{fontSize:13,fontWeight:600}}>{j.description}</div><div style={{fontSize:11,color:'var(--mu)'}}>{j.date?new Date(j.date).toLocaleDateString():'—'} · {j.reference_type}</div></div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--ac)'}}>{fmt(j.total_debit||0)}</div>
          </div>
        ))}
      </div>
      <div className="nx-card">
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Recent Expenses</div>
        {recentExpenses.length===0?<div style={{color:'var(--mu)',fontSize:13,textAlign:'center',padding:24}}>No expenses yet</div>:recentExpenses.map((e:any)=>(
          <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--bd)'}}>
            <div><div style={{fontSize:13,fontWeight:600}}>{e.description}</div><div style={{fontSize:11,color:'var(--mu)'}}>{e.date?new Date(e.date).toLocaleDateString():'—'} · {e.vendor||catMap[e.category_id]||'Uncategorized'}</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:13,fontWeight:700,color:'#ef4444'}}>{fmt(e.amount)}</div><div style={{fontSize:10,color:'var(--mu)'}}>{PAY_METHOD[e.payment_method]||e.payment_method}</div></div>
          </div>
        ))}
      </div>
      <div className="nx-card">
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Account Summary</div>
        {(['asset','liability','equity','revenue','expense'] as const).map(type=>{
          const accts=accounts.filter(a=>a.type===type);
          return accts.length>0?(<div key={type} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--bd)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><i className={`ti ${ACCT_TYPE_ICON[type]}`} style={{color:`var(--${ACCT_TYPE_COLOR[type]==='red'?'ac':ACCT_TYPE_COLOR[type]})`,fontSize:16}}/><span style={{fontSize:13,textTransform:'capitalize'}}>{type}</span></div>
            <span className={`nx-badge ${ACCT_TYPE_COLOR[type]}`}>{accts.length} accounts</span>
          </div>):null;
        })}
      </div>
    </div>)}

    {/* JOURNAL */}
    {tab==='journal'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input className="nx-input" placeholder="Search entries..." value={jSearch} onChange={e=>setJSearch(e.target.value)} style={{width:240}}/>
        <button className="btn-nx primary sm" style={{marginLeft:'auto'}} onClick={()=>setShowJournal(true)}><i className="ti ti-plus"/> New Entry</button>
      </div>
      {jLoading?<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading...</div>:(
        <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
              {['Date','Description','Ref Type','Lines','Debit','Credit',''].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredJournal.length===0?<tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'var(--mu)'}}>No journal entries yet</td></tr>:filteredJournal.map((j:any)=>(
                <tr key={j.id} style={{borderBottom:'1px solid var(--bd)',cursor:'pointer'}} onClick={()=>setSelectedJournal(selectedJournal?.id===j.id?null:j)}>
                  <td style={{padding:'10px 12px',fontSize:12,color:'var(--mu)'}}>{j.date?new Date(j.date).toLocaleDateString():'—'}</td>
                  <td style={{padding:'10px 12px',fontWeight:600,fontSize:13}}>{j.description}</td>
                  <td style={{padding:'10px 12px'}}><span className="nx-badge grey">{j.reference_type||'manual'}</span></td>
                  <td style={{padding:'10px 12px',fontSize:12,textAlign:'center'}}>{(j.lines||[]).length}</td>
                  <td style={{padding:'10px 12px',fontWeight:600,color:'#22c55e'}}>{fmt(j.total_debit||0)}</td>
                  <td style={{padding:'10px 12px',fontWeight:600,color:'#ef4444'}}>{fmt(j.total_credit||0)}</td>
                  <td style={{padding:'10px 12px'}}><i className={`ti ti-chevron-${selectedJournal?.id===j.id?'up':'down'}`} style={{color:'var(--mu)'}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedJournal&&(
            <div style={{borderTop:'2px solid var(--ac)',padding:14,background:'var(--acg)'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:'var(--ac)'}}>Journal Lines — {selectedJournal.description}</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr><th style={{textAlign:'left',padding:'4px 8px',color:'var(--mu)'}}>Account</th><th style={{textAlign:'left',padding:'4px 8px',color:'var(--mu)'}}>Description</th><th style={{textAlign:'right',padding:'4px 8px',color:'var(--mu)'}}>Debit</th><th style={{textAlign:'right',padding:'4px 8px',color:'var(--mu)'}}>Credit</th></tr></thead>
                <tbody>
                  {(selectedJournal.lines||[]).map((l:any,i:number)=>{
                    const acct=acctMap[l.account_id];
                    return(<tr key={i} style={{borderBottom:'1px solid var(--bd)'}}><td style={{padding:'6px 8px',fontWeight:500}}>{acct?`${acct.code} — ${acct.name}`:'—'}</td><td style={{padding:'6px 8px',color:'var(--mu)'}}>{l.description||'—'}</td><td style={{padding:'6px 8px',textAlign:'right',color:'#22c55e',fontWeight:600}}>{l.debit>0?fmt(l.debit):'—'}</td><td style={{padding:'6px 8px',textAlign:'right',color:'#ef4444',fontWeight:600}}>{l.credit>0?fmt(l.credit):'—'}</td></tr>);
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>)}

    {/* EXPENSES */}
    {tab==='expenses'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <input className="nx-input" placeholder="Search expenses..." value={expSearch} onChange={e=>setExpSearch(e.target.value)} style={{width:200}}/>
        <select className="nx-select" value={expCat} onChange={e=>setExpCat(e.target.value)}><option value="">All Categories</option>{expCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <div style={{marginLeft:'auto',padding:'6px 12px',background:'var(--acg)',borderRadius:8,fontSize:13,fontWeight:600,color:'var(--ac)'}}>Total: {fmt(filteredExp.reduce((s,e)=>s+(e.amount||0),0))}</div>
      </div>
      {expLoading?<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading...</div>:(
        <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
              {['Date','Description','Branch','Category','Vendor','Payment','Amount','VAT','Receipt'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredExp.length===0?<tr><td colSpan={9} style={{padding:32,textAlign:'center',color:'var(--mu)'}}>No expenses found</td></tr>:filteredExp.map((e:any)=>(
                <tr key={e.id} style={{borderBottom:'1px solid var(--bd)'}}>
                  <td style={{padding:'10px 12px',fontSize:12,color:'var(--mu)',whiteSpace:'nowrap'}}>{e.date?new Date(e.date).toLocaleDateString():'—'}</td>
                  <td style={{padding:'10px 12px',fontWeight:600,fontSize:13}}>{e.description}</td>
                  <td style={{padding:'10px 12px',fontSize:11}}>{e.branch_name||'Head Office'}</td>
                  <td style={{padding:'10px 12px'}}><span className="nx-badge grey">{catMap[e.category_id]||'—'}</span></td>
                  <td style={{padding:'10px 12px',fontSize:12}}>{e.vendor||'—'}</td>
                  <td style={{padding:'10px 12px',fontSize:12}}>{PAY_METHOD[e.payment_method]||e.payment_method||'—'}</td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:'#ef4444'}}>{fmt(e.amount)}</td>
                  <td style={{padding:'10px 12px',fontSize:12,color:'var(--mu)'}}>{e.tax_amount?fmt(e.tax_amount):'—'}</td>
                  <td style={{padding:'10px 12px',fontSize:11,fontFamily:'monospace',color:'var(--mu)'}}>{e.receipt_ref||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>)}

    {/* CHART OF ACCOUNTS */}
    {tab==='accounts'&&(<div>
      {(['asset','liability','equity','revenue','expense'] as const).map(type=>{
        const accts=groupedAccounts[type];
        if(accts.length===0) return null;
        const roots=accts.filter(a=>!a.parent_id);
        const subs=accts.filter(a=>a.parent_id);
        return(<div key={type} style={{marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <i className={`ti ${ACCT_TYPE_ICON[type]}`} style={{fontSize:18}}/><span style={{fontWeight:700,fontSize:15,textTransform:'capitalize'}}>{type}s</span>
            <span className={`nx-badge ${ACCT_TYPE_COLOR[type]}`}>{accts.length}</span>
          </div>
          <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody>
                {roots.map(a=>[
                  <tr key={a.id} style={{borderBottom:'1px solid var(--bd)',background:'var(--bg)'}}>
                    <td style={{padding:'8px 14px',fontFamily:'monospace',fontSize:12,color:'var(--mu)',width:80}}>{a.code}</td>
                    <td style={{padding:'8px 14px',fontWeight:700,fontSize:13}}>{a.name}</td>
                    <td style={{padding:'8px 14px',fontSize:11,color:'var(--mu)'}}>{a.category||'—'}</td>
                    <td style={{padding:'8px 14px'}}><span className={`nx-badge ${ACCT_TYPE_COLOR[type]}`}>{type}</span></td>
                  </tr>,
                  ...subs.filter(s=>s.parent_id===a.id).map(s=>(
                    <tr key={s.id} style={{borderBottom:'1px solid var(--bd)'}}>
                      <td style={{padding:'8px 14px 8px 28px',fontFamily:'monospace',fontSize:12,color:'var(--mu)'}}>{s.code}</td>
                      <td style={{padding:'8px 14px',fontSize:13}}>↳ {s.name}</td>
                      <td style={{padding:'8px 14px',fontSize:11,color:'var(--mu)'}}>{s.category||'—'}</td>
                      <td style={{padding:'8px 14px'}}/>
                    </tr>
                  ))
                ])}
              </tbody>
            </table>
          </div>
        </div>);
      })}
      {accounts.length===0&&<div className="nx-card" style={{textAlign:'center',padding:48,color:'var(--mu)'}}>
        <div style={{fontSize:40,marginBottom:8}}>📂</div><p style={{fontWeight:600}}>No accounts yet</p>
        <button className="btn-nx primary" style={{marginTop:8}} onClick={()=>setShowAccount(true)}>Add First Account</button>
      </div>}
    </div>)}

    {/* REPORTS */}
    {tab==='reports'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input type="date" className="nx-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{width:150}}/>
        <span style={{color:'var(--mu)'}}>to</span>
        <input type="date" className="nx-input" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{width:150}}/>
        {['month','quarter','year'].map(p=><button key={p} className="btn-nx ghost sm" onClick={()=>setQuick(p)} style={{textTransform:'capitalize'}}>{p}</button>)}
      </div>
      <div style={{display:'flex',gap:4,marginBottom:14}}>
        {[['pl','Profit & Loss'],['bs','Balance Sheet'],['vat','VAT Report'],['cf','Cash Flow']].map(([id,l])=>(
          <button key={id} onClick={()=>setReportTab(id)} className={`btn-nx ${reportTab===id?'primary':'ghost'} sm`}>{l}</button>
        ))}
      </div>

      {reportTab==='pl'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="nx-card">
          {(plData as any)?.revenue?<ReportSection title="Revenue" data={(plData as any).revenue} color="#22c55e"/>:<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading P&L data...</div>}
        </div>
        <div className="nx-card">
          {(plData as any)?.expenses?<ReportSection title="Expenses" data={(plData as any).expenses} color="#ef4444"/>:<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading P&L data...</div>}
          {(plData as any)?.net_profit!==undefined&&<div style={{padding:'14px 0',marginTop:10,borderTop:'2px solid var(--bd)',display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:800}}>
            <span>Net Profit</span><span style={{color:(plData as any).net_profit>=0?'#22c55e':'#ef4444'}}>{fmt((plData as any).net_profit)}</span>
          </div>}
        </div>
      </div>)}

      {reportTab==='bs'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="nx-card">
          {(bsData as any)?.assets?<ReportSection title="Assets" data={(bsData as any).assets} color="#6366f1"/>:<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading Balance Sheet...</div>}
        </div>
        <div className="nx-card">
          {(bsData as any)?.liabilities&&<ReportSection title="Liabilities" data={(bsData as any).liabilities} color="#ef4444"/>}
          {(bsData as any)?.equity&&<ReportSection title="Equity" data={(bsData as any).equity} color="#a855f7"/>}
        </div>
      </div>)}

      {reportTab==='vat'&&(<div className="nx-card">
        {!(vatData as any)?.output_vat&&!(vatData as any)?.input_vat?<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading VAT data...</div>:(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
            <div><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Output VAT (Sales)</div><div style={{fontSize:28,fontWeight:800,color:'#22c55e'}}>{fmt((vatData as any)?.output_vat||0)}</div><div style={{fontSize:12,color:'var(--mu)',marginTop:4}}>VAT collected from customers</div></div>
            <div><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Input VAT (Purchases)</div><div style={{fontSize:28,fontWeight:800,color:'#ef4444'}}>{fmt((vatData as any)?.input_vat||0)}</div><div style={{fontSize:12,color:'var(--mu)',marginTop:4}}>VAT paid to suppliers</div></div>
            <div style={{padding:16,background:'var(--acg)',borderRadius:10}}><div style={{fontWeight:700,fontSize:14,marginBottom:12,color:'var(--ac)'}}>VAT Payable / Refundable</div><div style={{fontSize:28,fontWeight:800,color:'var(--ac)'}}>{fmt(((vatData as any)?.output_vat||0)-((vatData as any)?.input_vat||0))}</div><div style={{fontSize:12,color:'var(--mu)',marginTop:4}}>Positive = payable to GAZT</div></div>
          </div>
        )}
      </div>)}

      {reportTab==='cf'&&(<div className="nx-card">
        {!(cfData as any)?.operating&&!(cfData as any)?.total?<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading Cash Flow data...</div>:(
          <div style={{display:'grid',gap:16}}>
            {[['operating','💼 Operating Activities','#6366f1'],['investing','📊 Investing Activities','#f59e0b'],['financing','🏦 Financing Activities','#22c55e']].map(([k,l,c])=>(
              (cfData as any)?.[k]!==undefined&&<div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid var(--bd)'}}>
                <div style={{fontSize:14,fontWeight:600}}>{l}</div>
                <div style={{fontSize:18,fontWeight:800,color:String(c)}}>{fmt((cfData as any)[k]||0)}</div>
              </div>
            ))}
            {(cfData as any)?.total!==undefined&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',fontSize:16,fontWeight:800}}>
              <span>Net Cash Flow</span><span style={{color:(cfData as any).total>=0?'#22c55e':'#ef4444'}}>{fmt((cfData as any).total)}</span>
            </div>}
          </div>
        )}
      </div>)}
    </div>)}

    {showJournal&&<JournalModal accounts={accounts} onClose={()=>setShowJournal(false)}/>}
    {showExpense&&<ExpenseModal categories={expCategories} branches={branches} onClose={()=>setShowExpense(false)}/>}
    {showAccount&&<AccountModal acct={null} accounts={accounts} onClose={()=>setShowAccount(false)}/>}
    {showExpCat&&<ExpCatModal accounts={accounts} onClose={()=>setShowExpCat(false)}/>}
  </div>);
}
