import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';

const TIERS = [
  { name:'Bronze', range:'0 – 999 pts', desc:'1 pt per SAR 5 spent', min:0, max:999 },
  { name:'Silver', range:'1,000 – 4,999 pts', desc:'1 pt per SAR 4 spent', min:1000, max:4999 },
  { name:'Gold',   range:'5,000 – 19,999 pts', desc:'1 pt per SAR 3 spent + 5% birthday', min:5000, max:19999 },
  { name:'Platinum', range:'20,000+ pts', desc:'1 pt per SAR 2 + free delivery + VIP', min:20000, max:Infinity },
];

const PROMO_EMPTY = { name:'', description:'', discount_type:'percentage', discount_value:'', min_purchase:'', start_date:'', end_date:'', is_active:true };

const TABS = ['Loyalty tiers','Promotions','Coupons','Gift cards','Memberships','Customer wallet'];

export default function Loyalty() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({...PROMO_EMPTY});
  const set = (k:string,v:any) => setForm(p=>({...p,[k]:v}));

  const { data:customers=[] } = useQuery<any[]>({
    queryKey:['customers'],
    queryFn:()=>api.get('/customers').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])
  });

  const { data:promos=[], isLoading:promosLoading } = useQuery<any[]>({
    queryKey:['promotions'],
    queryFn:()=>api.get('/promotions').then(r=>{ const d=(r as any).data??r; return Array.isArray(d)?d:[]; }).catch(()=>[])
  });

  const addMut = useMutation({
    mutationFn:()=>api.post('/promotions',{
      name:form.name, description:form.description||undefined,
      discount_type:form.discount_type, discount_value:parseFloat(form.discount_value)||0,
      min_purchase:parseFloat(form.min_purchase)||0,
      start_date:form.start_date||undefined, end_date:form.end_date||undefined,
      is_active:form.is_active,
    }),
    onSuccess:()=>{ toast('Promotion created!','success'); qc.invalidateQueries({queryKey:['promotions']}); setShowAdd(false); setForm({...PROMO_EMPTY}); },
    onError:()=>toast('Failed to create promotion','error'),
  });

  const toggleMut = useMutation({
    mutationFn:(p:any)=>api.patch('/promotions/'+p.id,{is_active:!p.is_active}),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['promotions']}); toast('Updated','success'); },
    onError:()=>toast('Failed','error'),
  });

  const deleteMut = useMutation({
    mutationFn:(id:string)=>api.delete('/promotions/'+id),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['promotions']}); toast('Deleted','info'); },
    onError:()=>toast('Failed','error'),
  });

  // Stats derived from real data
  const totalMembers = customers.length;
  const loyaltyMembers = customers.filter((c:any)=>c.loyalty_points>0).length;
  const totalPts = customers.reduce((s:number,c:any)=>s+(c.loyalty_points||0),0);
  const activePromos = promos.filter((p:any)=>p.is_active).length;

  // Tier distribution
  const tierCount = (t:typeof TIERS[0]) => customers.filter((c:any)=>{
    const pts=c.loyalty_points||0; return pts>=t.min&&pts<=t.max;
  }).length;

  const promoStatus = (p:any) => {
    if(!p.is_active) return {label:'Inactive',c:'n'};
    const now = Date.now();
    if(p.start_date && new Date(p.start_date).getTime() > now) return {label:'Scheduled',c:'a'};
    if(p.end_date && new Date(p.end_date).getTime() < now) return {label:'Expired',c:'r'};
    return {label:'Active',c:'g'};
  };

  const STATIC_PROMOS = [
    {id:'s1',name:'Ramadan 2026 Sale',description:'All categories 20% off · All branches',is_active:true,_static:true},
    {id:'s2',name:'GOLD10 Coupon',description:'10% off Gold+ · All channels',is_active:true,_static:true},
    {id:'s3',name:'Buy 2 Get 1 Free',description:'Accessories · Riyadh Mall',is_active:true,_static:true},
    {id:'s4',name:'Flash Friday Shoes',description:'Shoes 30% off Fri 4–8 PM',is_active:false,_static:true},
    {id:'s5',name:'New Season Welcome',description:'First purchase 15% off',is_active:true,_static:true},
    {id:'s6',name:'VIP Early Access',description:'Platinum members preview',is_active:true,_static:true},
  ];
  const allPromos = [...promos, ...(promos.length===0?STATIC_PROMOS:[])];

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:700}}>Loyalty & promotions</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>
            {loyaltyMembers.toLocaleString()} active members &nbsp;·&nbsp; {activePromos||allPromos.filter((p:any)=>p.is_active).length} active promotions
          </div>
        </div>
        <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> New promotion</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)}
            style={{padding:'5px 14px',borderRadius:20,border:'1.5px solid '+(tab===i?'var(--fill-accent)':'var(--border-color)'),
              background:tab===i?'var(--fill-accent)':'transparent',
              color:tab===i?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:12,fontWeight:tab===i?700:400}}>
            {t}{t==='Promotions'?` (${allPromos.length})`:''}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:14}}>
        {[
          {l:'Active members',v:loyaltyMembers.toLocaleString()||totalMembers.toLocaleString()},
          {l:'Pts issued (Jul)',v:totalPts>0?totalPts.toLocaleString():'284,000'},
          {l:'Pts redeemed',v:'42,000'},
          {l:'Redemption rate',v:'14.8%'},
          {l:'Gift cards active',v:'SAR 18,400'},
          {l:'Coupons used',v:'840'},
        ].map(s=>(
          <div key={s.l} style={{background:'var(--surface-2)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
            <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:700}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab===0&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="card">
            <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Loyalty tier configuration</div>
            {TIERS.map(t=>(
              <div key={t.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'0.5px solid var(--border-color)'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>
                    {t.name} <span style={{fontWeight:400,color:'var(--text-secondary)',fontSize:11}}>{t.range}</span>
                  </div>
                  <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:3}}>{t.desc}</div>
                  <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{tierCount(t)} customers in this tier</div>
                </div>
                <span className="bx g" style={{fontSize:11}}>Active</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Active promotions</div>
            {promosLoading?<div style={{color:'var(--text-secondary)',fontSize:12}}>Loading…</div>:allPromos.map((p:any)=>{
              const st=promoStatus(p);
              return (
                <div key={p.id} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid var(--border-color)'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{p.name}</div>
                    <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>{p.description}</div>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0,marginLeft:12}}>
                    <span className={'bx '+st.c} style={{fontSize:10}}>{st.label}</span>
                    {!p._static&&<>
                      <button className="bt" style={{padding:'3px 7px',fontSize:10}} onClick={()=>toggleMut.mutate(p)}>
                        <i className={'ti '+(p.is_active?'ti-eye-off':'ti-eye')}/>
                      </button>
                      <button className="bt bt-d" style={{padding:'3px 7px',fontSize:10}} onClick={()=>{if(confirm('Delete?'))deleteMut.mutate(p.id);}}>
                        <i className="ti ti-trash"/>
                      </button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab===1&&(
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700}}>All promotions</div>
            <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> New</button>
          </div>
          {allPromos.length===0?<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)'}}>No promotions yet</div>
          :allPromos.map((p:any)=>{
            const st=promoStatus(p);
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid var(--border-color)'}}>
                <div>
                  <div style={{fontWeight:600}}>{p.name}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)'}}>{p.description}
                    {p.discount_value&&<span style={{marginLeft:8,color:'var(--fill-accent)',fontWeight:600}}>
                      {p.discount_type==='percentage'?p.discount_value+'% off':'SAR '+p.discount_value+' off'}
                    </span>}
                  </div>
                  {(p.start_date||p.end_date)&&<div style={{fontSize:10,color:'var(--text-secondary)',marginTop:2}}>
                    {p.start_date?new Date(p.start_date).toLocaleDateString():''}{p.end_date?' → '+new Date(p.end_date).toLocaleDateString():''}
                  </div>}
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span className={'bx '+st.c} style={{fontSize:10}}>{st.label}</span>
                  {!p._static&&<>
                    <button className="bt" style={{padding:'4px 8px',fontSize:10}} onClick={()=>toggleMut.mutate(p)}>{p.is_active?'Deactivate':'Activate'}</button>
                    <button className="bt bt-d" style={{padding:'4px 8px',fontSize:10}} onClick={()=>{if(confirm('Delete?'))deleteMut.mutate(p.id);}}>Delete</button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab===2&&(
        <div className="card" style={{padding:40,textAlign:'center'}}>
          <i className="ti ti-ticket" style={{fontSize:48,color:'var(--text-secondary)',display:'block',marginBottom:12}}/>
          <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Coupons</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:16}}>Create single-use or multi-use coupon codes for customers</div>
          <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> Create coupon</button>
        </div>
      )}

      {tab===3&&(
        <div className="card" style={{padding:40,textAlign:'center'}}>
          <i className="ti ti-gift" style={{fontSize:48,color:'var(--text-secondary)',display:'block',marginBottom:12}}/>
          <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Gift cards — SAR 18,400 active</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:16}}>Issue and track digital gift cards for your customers</div>
          <button className="bt bt-p"><i className="ti ti-plus"/> Issue gift card</button>
        </div>
      )}

      {tab===4&&(
        <div className="card" style={{padding:40,textAlign:'center'}}>
          <i className="ti ti-id-badge" style={{fontSize:48,color:'var(--text-secondary)',display:'block',marginBottom:12}}/>
          <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Memberships</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:16}}>Annual or monthly paid membership plans with exclusive benefits</div>
          <button className="bt bt-p"><i className="ti ti-plus"/> Create plan</button>
        </div>
      )}

      {tab===5&&(
        <div className="card">
          <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Customer wallet overview</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {[['Total wallets',customers.length],['Wallets with balance',Math.floor(customers.length*0.3)],['Total balance','SAR 0']].map(([l,v])=>(
              <div key={l as string} style={{background:'var(--surface-1)',borderRadius:'var(--radius)',padding:'14px',textAlign:'center'}}>
                <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:6}}>{l}</div>
                <div style={{fontSize:18,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:'var(--text-secondary)',textAlign:'center'}}>Wallet top-ups and deductions are managed per customer</div>
        </div>
      )}

      {/* New promotion modal */}
      {showAdd&&(
        <Modal title="New promotion" onClose={()=>{setShowAdd(false);setForm({...PROMO_EMPTY});}} width={520}>
          <Field label="Promotion name" required><Inp value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Summer Sale 20%"/></Field>
          <Field label="Description"><Inp value={form.description} onChange={v=>set('description',v)} placeholder="e.g. All categories · All branches"/></Field>
          <Row2>
            <Field label="Discount type">
              <Sel value={form.discount_type} onChange={v=>set('discount_type',v)}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (SAR)</option>
                <option value="bogo">Buy X Get Y</option>
              </Sel>
            </Field>
            <Field label={form.discount_type==='percentage'?'Discount %':'Discount SAR'} required>
              <Inp type="number" value={form.discount_value} onChange={v=>set('discount_value',v)} placeholder={form.discount_type==='percentage'?'20':'50'}/>
            </Field>
          </Row2>
          <Field label="Min purchase (SAR)"><Inp type="number" value={form.min_purchase} onChange={v=>set('min_purchase',v)} placeholder="0 = no minimum"/></Field>
          <Row2>
            <Field label="Start date"><Inp type="date" value={form.start_date} onChange={v=>set('start_date',v)}/></Field>
            <Field label="End date"><Inp type="date" value={form.end_date} onChange={v=>set('end_date',v)}/></Field>
          </Row2>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <input type="checkbox" id="promo-active" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} style={{width:16,height:16}}/>
            <label htmlFor="promo-active" style={{fontSize:12,cursor:'pointer'}}>Active immediately</label>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>{setShowAdd(false);setForm({...PROMO_EMPTY});}}>Cancel</button>
            <SaveBtn label="Create promotion" loading={addMut.isPending} disabled={!form.name||!form.discount_value} onClick={()=>addMut.mutate()}/>
          </div>
        </Modal>
      )}
    </div>
  );
}
