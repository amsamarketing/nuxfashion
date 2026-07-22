import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, SaveBtn } from '../../components/Modal';

const EMPTY = { name:'', phone:'', email:'', date_of_birth:'' };
const TIER_COLOR:Record<string,string> = { bronze:'n', silver:'n', gold:'b', platinum:'b', vip:'b' };
const SAR = (n:number) => `SAR ${n.toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

function Avatar({name,size=46}:{name:string,size?:number}) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:'var(--bg-accent)',display:'flex',
      alignItems:'center',justifyContent:'center',fontSize:size*0.32,fontWeight:800,
      color:'var(--fill-accent)',flexShrink:0,textTransform:'uppercase'}}>
      {name.trim().split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
    </div>
  );
}

export default function Customers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editCust, setEditCust] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({...EMPTY});
  const [editForm, setEditForm] = useState({...EMPTY});
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const { data:customers=[], isLoading } = useQuery<any[]>({
    queryKey:['customers'],
    queryFn:()=>api.get('/customers').then(r=>Array.isArray(r.data)?r.data:[])
  });

  const { data:allOrders=[] } = useQuery<any[]>({
    queryKey:['orders-all'],
    queryFn:()=>api.get('/sales/orders?limit=500').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])
  });

  const { data:custOrders=[] } = useQuery<any[]>({
    queryKey:['customer-orders', selected?.id],
    queryFn:()=>api.get('/sales/orders').then(r=>(Array.isArray(r.data)?r.data:[]).filter((o:any)=>o.customer_id===selected?.id)),
    enabled:!!selected&&showHistory
  });

  // Compute per-customer stats from orders
  const statsMap: Record<string,{spend:number,orders:number,lastVisit:string}> = {};
  (allOrders as any[]).forEach((o:any)=>{
    if(!o.customer_id) return;
    const s = statsMap[o.customer_id] || {spend:0,orders:0,lastVisit:''};
    s.spend += parseFloat(o.total||0);
    s.orders += 1;
    if(!s.lastVisit || o.created_at > s.lastVisit) s.lastVisit = o.created_at;
    statsMap[o.customer_id] = s;
  });

  const getStats = (c:any) => statsMap[c.id] || {spend:parseFloat(c.total_spent||0),orders:parseInt(c.orders_count||0),lastVisit:''};

  const loyaltyMembers = customers.filter((c:any)=>c.loyalty_points>0||c.loyalty_tier&&c.loyalty_tier!=='bronze').length;

  const shown = customers.filter((c:any)=>{
    if(tierFilter!=='all' && (c.loyalty_tier||'bronze')!==tierFilter) return false;
    if(search){ const q=search.toLowerCase(); return c.name?.toLowerCase().includes(q)||c.phone?.includes(search)||c.email?.toLowerCase().includes(q); }
    return true;
  });

  const addMut = useMutation({
    mutationFn:()=>api.post('/customers',{name:form.name,phone:form.phone||undefined,email:form.email||undefined,date_of_birth:form.date_of_birth||undefined}),
    onSuccess:()=>{ toast('Customer added!','success'); qc.invalidateQueries({queryKey:['customers']}); setShowAdd(false); setForm({...EMPTY}); },
    onError:(e:any)=>toast(getErr(e),'error')
  });
  const editMut = useMutation({
    mutationFn:()=>api.patch('/customers/'+editCust.id,{name:editForm.name,phone:editForm.phone||undefined,email:editForm.email||undefined,date_of_birth:editForm.date_of_birth||undefined}),
    onSuccess:(res)=>{ toast('Customer updated!','success'); qc.invalidateQueries({queryKey:['customers']}); setSelected((res as any).data); setEditCust(null); },
    onError:(e:any)=>toast(getErr(e),'error')
  });
  const deleteMut = useMutation({
    mutationFn:(id:string)=>api.delete('/customers/'+id),
    onSuccess:()=>{ toast('Customer deleted','info'); qc.invalidateQueries({queryKey:['customers']}); setSelected(null); },
    onError:(e:any)=>toast(getErr(e),'error')
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleCSV = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase());
    const idx=(t:string[])=>headers.findIndex(h=>t.some(x=>h.includes(x)));
    const ni=idx(['name']), pi=idx(['phone','mobile']), ei=idx(['email']), di=idx(['dob','birth','date']);
    let ok=0, fail=0;
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(',').map(x=>x.replace(/^"|"$/g,'').trim());
      const name=ni>=0?cols[ni]:''; if(!name) continue;
      try {
        await api.post('/customers',{
          name,
          phone: pi>=0&&cols[pi]?cols[pi]:undefined,
          email: ei>=0&&cols[ei]?cols[ei]:undefined,
          date_of_birth: di>=0&&cols[di]?cols[di]:undefined,
        });
        ok++;
      } catch { fail++; }
    }
    setImporting(false);
    qc.invalidateQueries({queryKey:['customers']});
    toast('Imported '+ok+' customers'+(fail?' ('+fail+' failed)':''), ok>0?'success':'error');
    if(fileRef.current) fileRef.current.value='';
  };

  const set=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const eSet=(k:string,v:string)=>setEditForm(p=>({...p,[k]:v}));
  const openEdit=(c:any)=>{ setEditCust(c); setEditForm({name:c.name||'',phone:c.phone||'',email:c.email||'',date_of_birth:c.date_of_birth||''}); };

  const fmtDate=(d:string)=>{
    if(!d) return '—';
    const dt=new Date(d); const now=new Date();
    const diff=Math.floor((now.getTime()-dt.getTime())/86400000);
    if(diff===0) return 'Today'; if(diff===1) return 'Yesterday';
    return dt.toLocaleDateString('en-SA',{day:'numeric',month:'short'});
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:selected?'1fr 320px':'1fr',gap:12}}>
      <div>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div style={{fontSize:14,fontWeight:700}}>Customers</div>
            <div style={{fontSize:11,color:'var(--text-secondary)'}}>
              {customers.length.toLocaleString()} customers &nbsp;·&nbsp; {loyaltyMembers.toLocaleString()} active loyalty members
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <div style={{position:'relative'}}>
              <i className="ti ti-search" style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'var(--text-secondary)',pointerEvents:'none'}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone…"
                style={{padding:'6px 10px 6px 28px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)',width:200}}/>
            </div>
            <button className="bt"><i className="ti ti-filter"/> Segment</button>
            <button className="bt" onClick={()=>fileRef.current?.click()} disabled={importing}>
              {importing?<><div className="spinner-border spinner-border-sm" style={{width:13,height:13}}/> Importing…</>:<><i className="ti ti-upload"/> Import</>}
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleCSV}/>
            <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> Add customer</button>
          </div>
        </div>

        {/* Tier filter */}
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {['all','bronze','silver','gold','platinum'].map(t=>(
            <button key={t} onClick={()=>setTierFilter(t)}
              style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid '+(tierFilter===t?'var(--fill-accent)':'var(--border-color)'),
                background:tierFilter===t?'var(--fill-accent)':'transparent',color:tierFilter===t?'#fff':'var(--text-secondary)',
                cursor:'pointer',fontSize:11,fontWeight:tierFilter===t?700:400,textTransform:'capitalize'}}>
              {t==='all'?`All (${customers.length})`:t+` (${customers.filter((c:any)=>(c.loyalty_tier||'bronze')===t).length})`}
            </button>
          ))}
        </div>

        {isLoading?<div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div>:(
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="tr th" style={{gridTemplateColumns:'1fr 80px 70px 120px 90px 70px'}}>
              {['Customer','Tier','Points','Lifetime spend','Last visit','Orders'].map(h=><span key={h}>{h}</span>)}
            </div>
            {shown.map((c:any)=>{
              const st=getStats(c);
              const tier=c.loyalty_tier||'bronze';
              const pts=c.loyalty_points||0;
              const orders=st.orders||parseInt(c.orders_count||0);
              return (
                <div key={c.id} className="tr" style={{gridTemplateColumns:'1fr 80px 70px 120px 90px 70px',cursor:'pointer',background:selected?.id===c.id?'var(--bg-accent)':''}}
                  onClick={()=>{ setSelected(c); setShowHistory(false); }}>
                  <span>
                    <div style={{fontWeight:600,fontSize:12}}>{c.name}</div>
                    {c.phone&&<div style={{fontSize:10,color:'var(--text-secondary)'}}>{c.phone}</div>}
                  </span>
                  <span><span className={'bx '+(TIER_COLOR[tier]||'n')} style={{fontSize:10,textTransform:'capitalize'}}>{tier}</span></span>
                  <span style={{fontWeight:700,color:'var(--fill-accent)',fontSize:12}}>{pts.toLocaleString()}</span>
                  <span style={{fontWeight:600,fontSize:12}}>{st.spend>0?SAR(st.spend):'—'}</span>
                  <span style={{fontSize:11,color:'var(--text-secondary)'}}>{fmtDate(st.lastVisit)}</span>
                  <span style={{fontWeight:700,fontSize:12,color:orders>0?'var(--fill-accent)':'var(--text-secondary)'}}>{orders||'—'}</span>
                </div>
              );
            })}
            {shown.length===0&&<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)'}}>
              {search||tierFilter!=='all'?'No customers match your filters':'No customers yet'}
            </div>}
          </div>
        )}
      </div>

      {/* Right: Customer profile */}
      {selected&&(
        <div className="card" style={{alignSelf:'start',position:'sticky',top:0}}>
          {!showHistory?(
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700}}>Customer profile</div>
                <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-secondary)'}}>×</button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <Avatar name={selected.name}/>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{selected.name}</div>
                  <div style={{fontSize:11,color:'var(--fill-accent)',textTransform:'capitalize',fontWeight:600}}>{selected.loyalty_tier||'Bronze'} member</div>
                </div>
              </div>
              {(()=>{
                const st=getStats(selected);
                const pts=selected.loyalty_points||0;
                const orders=st.orders||parseInt(selected.orders_count||0);
                const avgBasket=orders>0?st.spend/orders:0;
                const wallet=parseFloat(selected.wallet_balance||0);
                const rows=[
                  ['Phone', selected.phone||'—'],
                  ['Email', selected.email||'—'],
                  ['Points', pts.toLocaleString()+' pts'],
                  ['Wallet balance', SAR(wallet)],
                  ['Total spent', SAR(st.spend)],
                  ['Total orders', orders||'—'],
                  ['Last visit', fmtDate(st.lastVisit)||(selected.last_visit?fmtDate(selected.last_visit):'—')],
                  ['Member since', new Date(selected.created_at).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'numeric'})],
                  ['Avg basket', avgBasket>0?SAR(avgBasket):'—'],
                ];
                return rows.map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border-color)',fontSize:12}}>
                    <span style={{color:'var(--text-secondary)'}}>{l}</span>
                    <span style={{fontWeight:600}}>{v}</span>
                  </div>
                ));
              })()}
              <div className="d-flex gap-2 mt-3">
                <button className="bt" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowHistory(true)}>
                  <i className="ti ti-history"/> History
                </button>
                <button className="bt" style={{flex:1,justifyContent:'center'}} onClick={()=>{ if(selected.phone) window.open('https://wa.me/'+selected.phone.replace(/\D/g,'')); }}>
                  <i className="ti ti-send"/> Message
                </button>
                <button className="bt" style={{flex:1,justifyContent:'center'}} onClick={()=>openEdit(selected)}>
                  <i className="ti ti-edit"/> Edit
                </button>
              </div>
              <button className="bt" style={{width:'100%',justifyContent:'center',marginTop:6,color:'#e74c3c',borderColor:'#e74c3c'}}
                onClick={()=>{ if(confirm('Delete '+selected.name+'?')) deleteMut.mutate(selected.id); }}>
                <i className="ti ti-trash"/> Delete customer
              </button>
            </>
          ):(
            <>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <button className="bt" onClick={()=>setShowHistory(false)}><i className="ti ti-arrow-left"/></button>
                <span style={{fontSize:13,fontWeight:700}}>Purchase history</span>
              </div>
              {custOrders.length===0?<div style={{fontSize:12,color:'var(--text-secondary)',padding:'16px 0',textAlign:'center'}}>No orders found</div>
              :custOrders.map((o:any)=>(
                <div key={o.id} style={{padding:'8px 0',borderBottom:'0.5px solid var(--border-color)',fontSize:12}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontWeight:600,color:'var(--fill-accent)'}}>#{o.order_number}</span>
                    <span style={{fontWeight:700}}>SAR {parseFloat(o.total||0).toFixed(2)}</span>
                  </div>
                  <div style={{fontSize:10,color:'var(--text-secondary)',marginTop:2}}>{new Date(o.created_at).toLocaleString('en-SA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · <span style={{textTransform:'capitalize'}}>{o.status}</span></div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd&&(
        <Modal title="Add new customer" onClose={()=>setShowAdd(false)}>
          <Field label="Full name" required><Inp value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Sara Abdullah"/></Field>
          <Row2>
            <Field label="Mobile"><Inp value={form.phone} onChange={v=>set('phone',v)} placeholder="+966 5x xxx xxxx"/></Field>
            <Field label="Email"><Inp type="email" value={form.email} onChange={v=>set('email',v)} placeholder="email@example.com"/></Field>
          </Row2>
          <Field label="Date of birth"><Inp type="date" value={form.date_of_birth} onChange={v=>set('date_of_birth',v)}/></Field>
          <div style={{padding:'10px 12px',background:'#f0faf0',borderRadius:'var(--radius)',fontSize:12,color:'#27ae60',marginBottom:14}}>
            <i className="ti ti-star"/> Auto-enrolled in Bronze loyalty tier
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <SaveBtn label="Add customer" loading={addMut.isPending} disabled={!form.name} onClick={()=>addMut.mutate()}/>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editCust&&(
        <Modal title={`Edit — ${editCust.name}`} onClose={()=>setEditCust(null)}>
          <Field label="Full name" required><Inp value={editForm.name} onChange={v=>eSet('name',v)}/></Field>
          <Row2>
            <Field label="Mobile"><Inp value={editForm.phone} onChange={v=>eSet('phone',v)}/></Field>
            <Field label="Email"><Inp type="email" value={editForm.email} onChange={v=>eSet('email',v)}/></Field>
          </Row2>
          <Field label="Date of birth"><Inp type="date" value={editForm.date_of_birth} onChange={v=>eSet('date_of_birth',v)}/></Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setEditCust(null)}>Cancel</button>
            <SaveBtn label="Save changes" loading={editMut.isPending} disabled={!editForm.name} onClick={()=>editMut.mutate()}/>
          </div>
        </Modal>
      )}
    </div>
  );
}
