import React, { useState } from 'react';
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

const PROMO_EMPTY = { name:'', description:'', discount_type:'percentage', discount_value:'', min_purchase:'', start_date:'', end_date:'', is_active:true, buy_qty:'1', get_qty:'1', get_discount:'100', branches:['All branches'] };

const TABS = ['Loyalty tiers','Promotions','Coupons','Gift cards','Memberships','Customer wallet'];
const BRANCHES = ['All branches','Riyadh Mall','Jeddah Corniche','Al-Khobar Park','Riyadh Olaya St.','Online Store'];

export default function Loyalty() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [branchFilter, setBranchFilter] = useState('All branches');
  const [showAdd, setShowAdd] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [editPromoForm, setEditPromoForm] = useState({...PROMO_EMPTY});
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

  const editMut = useMutation({
    mutationFn:()=>api.patch('/promotions/'+editPromo.id,{
      name:editPromoForm.name, description:editPromoForm.description||undefined,
      discount_type:editPromoForm.discount_type, discount_value:parseFloat(editPromoForm.discount_value)||0,
      min_purchase:parseFloat(editPromoForm.min_purchase)||0,
      start_date:editPromoForm.start_date||undefined, end_date:editPromoForm.end_date||undefined,
      is_active:editPromoForm.is_active,
    }),
    onSuccess:()=>{ toast('Promotion updated!','success'); qc.invalidateQueries({queryKey:['promotions']}); setEditPromo(null); },
    onError:()=>{
      // If API fails (local promo), update locally
      if(editPromo?.id?.startsWith('s')){
        saveLocalPromos(localPromos.map((lp:any)=>lp.id===editPromo.id?{...lp,...editPromoForm,discount_value:parseFloat(editPromoForm.discount_value)||0}:lp));
        toast('Promotion updated!','success'); setEditPromo(null);
      } else toast('Failed to update','error');
    },
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

  const STATIC_PROMOS_SEED = [
    {id:'s1',name:'Ramadan 2026 Sale',description:'All categories 20% off · All branches',discount_type:'percentage',discount_value:20,is_active:true},
    {id:'s2',name:'GOLD10 Coupon',description:'10% off Gold+ · All channels',discount_type:'percentage',discount_value:10,is_active:true},
    {id:'s3',name:'Buy 2 Get 1 Free',description:'Accessories · Riyadh Mall',discount_type:'bogo',discount_value:0,is_active:true},
    {id:'s4',name:'Flash Friday Shoes',description:'Shoes 30% off Fri 4–8 PM',discount_type:'percentage',discount_value:30,is_active:false},
    {id:'s5',name:'New Season Welcome',description:'First purchase 15% off',discount_type:'percentage',discount_value:15,is_active:true},
    {id:'s6',name:'VIP Early Access',description:'Platinum members preview',discount_type:'percentage',discount_value:0,is_active:true},
  ];
  const [localPromos,setLocalPromos]=React.useState<any[]>(()=>{try{const s=sessionStorage.getItem('localPromos');return s?JSON.parse(s):STATIC_PROMOS_SEED;}catch{return STATIC_PROMOS_SEED;}});
  const saveLocalPromos=(list:any[])=>{setLocalPromos(list);try{sessionStorage.setItem('localPromos',JSON.stringify(list));}catch{}};
  const allPromos = [...promos, ...localPromos];

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
            {promosLoading?<div style={{color:'var(--text-secondary)',fontSize:12}}>Loading…</div>:(allPromos.filter((p:any)=>branchFilter==='All branches'||(p.branches||['All branches']).includes('All branches')||(p.branches||[]).includes(branchFilter))).map((p:any)=>{
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
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:700}}>All promotions <span style={{fontWeight:400,fontSize:11,color:'var(--text-secondary)',marginLeft:6}}>{allPromos.length} total</span></div>
            <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> New</button>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
            {BRANCHES.map(b=>(
              <button key={b} onClick={()=>setBranchFilter(b)}
                style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid '+(branchFilter===b?'var(--fill-accent)':'var(--border-color)'),
                  background:branchFilter===b?'var(--fill-accent)':'transparent',color:branchFilter===b?'#fff':'var(--text-secondary)',
                  cursor:'pointer',fontSize:11,fontWeight:branchFilter===b?700:400}}>
                {b}
              </button>
            ))}
          </div>
          {allPromos.filter((p:any)=>branchFilter==='All branches'||(p.branches||['All branches']).includes('All branches')||(p.branches||[]).includes(branchFilter)).length===0
            ?<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)'}}>No promotions for this branch</div>
          :(allPromos.filter((p:any)=>branchFilter==='All branches'||(p.branches||['All branches']).includes('All branches')||(p.branches||[]).includes(branchFilter))).map((p:any)=>{
            const st=promoStatus(p);
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'0.5px solid var(--border-color)'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{p.name}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>{p.description}
                    {p.discount_value>0&&<span style={{marginLeft:8,color:'var(--fill-accent)',fontWeight:600}}>
                      {p.discount_type==='percentage'?p.discount_value+'% off':'SAR '+p.discount_value+' off'}
                    </span>}
                  </div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
                    {(p.branches||['All branches']).map((b:string)=>(
                      <span key={b} style={{fontSize:10,padding:'1px 7px',borderRadius:10,background:'var(--bg-accent)',color:'var(--fill-accent)',fontWeight:600}}>{b}</span>
                    ))}
                    {(p.start_date||p.end_date)&&<span style={{fontSize:10,color:'var(--text-secondary)',padding:'1px 7px'}}>
                      {p.start_date?new Date(p.start_date).toLocaleDateString():''}{p.end_date?' → '+new Date(p.end_date).toLocaleDateString():''}
                    </span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0,marginLeft:16}}>
                  <span className={'bx '+st.c} style={{fontSize:10}}>{st.label}</span>
                  {!p._static&&<>
                    <button className="bt" style={{padding:'4px 8px',fontSize:11}} onClick={()=>toggleMut.mutate(p)}>
                      <i className={'ti '+(p.is_active?'ti-eye-off':'ti-eye')}/> {p.is_active?'Pause':'Activate'}
                    </button>
                    <button className="bt" style={{padding:'4px 8px',fontSize:11}} onClick={()=>{setEditPromo(p);setEditPromoForm({name:p.name,description:p.description||'',discount_type:p.discount_type||'percentage',discount_value:String(p.discount_value||''),min_purchase:String(p.min_purchase||''),start_date:p.start_date?.slice(0,10)||'',end_date:p.end_date?.slice(0,10)||'',is_active:p.is_active,buy_qty:String(p.buy_qty||'1'),get_qty:String(p.get_qty||'1'),get_discount:String(p.get_discount||'100'),branches:p.branches||['All branches']});}}>
                      <i className="ti ti-edit"/> Edit
                    </button>
                    <button className="bt bt-d" style={{padding:'4px 8px',fontSize:11}} onClick={()=>{if(confirm('Delete "'+p.name+'"?'))deleteMut.mutate(p.id);}}>
                      <i className="ti ti-trash"/> Delete
                    </button>
                  </>}
                  {p._static&&<>
                    <button className="bt" style={{padding:'4px 8px',fontSize:11,opacity:.5}} title="Sample data — connect promotions API to manage">
                      <i className="ti ti-edit"/> Edit
                    </button>
                    <button className="bt bt-d" style={{padding:'4px 8px',fontSize:11,opacity:.5}} title="Sample data">
                      <i className="ti ti-trash"/> Delete
                    </button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab===2&&<CouponsTab/>}

      {tab===3&&<GiftCardsTab/>}

      {tab===4&&<MembershipsTab/>}

      {tab===5&&<CustomerWalletTab customers={customers}/>}

      {/* Edit promotion modal */}
      {editPromo&&(
        <Modal title={'Edit — '+editPromo.name} onClose={()=>setEditPromo(null)} width={520}>
          <Field label="Promotion name" required><Inp value={editPromoForm.name} onChange={v=>setEditPromoForm(p=>({...p,name:v}))}/></Field>
          <Field label="Description"><Inp value={editPromoForm.description} onChange={v=>setEditPromoForm(p=>({...p,description:v}))}/></Field>
          <Row2>
            <Field label="Discount type">
              <Sel value={editPromoForm.discount_type} onChange={v=>setEditPromoForm(p=>({...p,discount_type:v}))}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (SAR)</option>
                <option value="bogo">Buy X Get Y</option>
              </Sel>
            </Field>
            <Field label="Discount value" required>
              <Inp type="number" value={editPromoForm.discount_value} onChange={v=>setEditPromoForm(p=>({...p,discount_value:v}))} placeholder="20"/>
            </Field>
          </Row2>
          <Field label="Min purchase (SAR)"><Inp type="number" value={editPromoForm.min_purchase} onChange={v=>setEditPromoForm(p=>({...p,min_purchase:v}))} placeholder="0"/></Field>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>Apply to branches</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {BRANCHES.map(b=>{
                const sel=(editPromoForm.branches||['All branches']).includes(b);
                const tog=()=>{
                  if(b==='All branches'){setEditPromoForm(p=>({...p,branches:['All branches']}));return;}
                  const cur=(editPromoForm.branches||['All branches']).filter((x:string)=>x!=='All branches');
                  setEditPromoForm(p=>({...p,branches:sel?cur.filter((x:string)=>x!==b):[...cur,b]}));
                };
                return <button key={b} type="button" onClick={tog}
                  style={{padding:'4px 10px',borderRadius:20,border:'1.5px solid '+(sel?'var(--fill-accent)':'var(--border-color)'),
                    background:sel?'var(--fill-accent)':'transparent',color:sel?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:11}}>
                  {b}
                </button>;
              })}
            </div>
          </div>
          <Row2>
            <Field label="Start date"><Inp type="date" value={editPromoForm.start_date} onChange={v=>setEditPromoForm(p=>({...p,start_date:v}))}/></Field>
            <Field label="End date"><Inp type="date" value={editPromoForm.end_date} onChange={v=>setEditPromoForm(p=>({...p,end_date:v}))}/></Field>
          </Row2>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <input type="checkbox" id="ep-active" checked={editPromoForm.is_active} onChange={e=>setEditPromoForm(p=>({...p,is_active:e.target.checked}))} style={{width:16,height:16}}/>
            <label htmlFor="ep-active" style={{fontSize:12,cursor:'pointer'}}>Active</label>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setEditPromo(null)}>Cancel</button>
            <SaveBtn label="Save changes" loading={editMut.isPending} disabled={!editPromoForm.name} onClick={()=>editMut.mutate()}/>
          </div>
        </Modal>
      )}
      {/* New promotion modal */}
      {showAdd&&(
        <Modal title="New promotion" onClose={()=>{setShowAdd(false);setForm({...PROMO_EMPTY});}} width={520}>
          <Field label="Promotion name" required><Inp value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Summer Sale 20%"/></Field>
          <Field label="Description"><Inp value={form.description} onChange={v=>set('description',v)} placeholder="e.g. All categories · All branches"/></Field>
          <Field label="Discount type">
            <Sel value={form.discount_type} onChange={v=>set('discount_type',v)}>
              <option value="percentage">Percentage (%) off</option>
              <option value="fixed">Fixed amount (SAR) off</option>
              <option value="bogo">Buy X Get Y free/discounted</option>
            </Sel>
          </Field>
          {form.discount_type!=='bogo'?(
            <Field label={form.discount_type==='percentage'?'Discount %':'Discount amount (SAR)'} required>
              <Inp type="number" value={form.discount_value} onChange={v=>set('discount_value',v)} placeholder={form.discount_type==='percentage'?'20':'50'}/>
            </Field>
          ):(
            <div style={{background:'var(--surface-1)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:14,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:10}}>BOGO CONFIGURATION</div>
              <Row2>
                <Field label="Customer buys (qty)" required>
                  <Sel value={form.buy_qty} onChange={v=>set('buy_qty',v)}>
                    {['1','2','3','4','5'].map(n=><option key={n} value={n}>Buy {n}</option>)}
                  </Sel>
                </Field>
                <Field label="Customer gets (qty)" required>
                  <Sel value={form.get_qty} onChange={v=>set('get_qty',v)}>
                    {['1','2','3','4','5'].map(n=><option key={n} value={n}>Get {n}</option>)}
                  </Sel>
                </Field>
              </Row2>
              <Field label="Get item discount">
                <Sel value={form.get_discount} onChange={v=>set('get_discount',v)}>
                  <option value="100">Free (100% off)</option>
                  <option value="50">50% off</option>
                  <option value="25">25% off</option>
                  <option value="custom">Custom %</option>
                </Sel>
              </Field>
              {form.get_discount==='custom'&&(
                <Field label="Custom discount %" required>
                  <Inp type="number" value={form.discount_value} onChange={v=>set('discount_value',v)} placeholder="e.g. 30"/>
                </Field>
              )}
              <div style={{marginTop:8,padding:'8px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',fontSize:12,color:'var(--fill-accent)',fontWeight:600}}>
                Buy {form.buy_qty} get {form.get_qty} {form.get_discount==='100'?'free':form.get_discount==='custom'?form.discount_value+'% off':form.get_discount+'% off'}
              </div>
            </div>
          )}
          <Field label="Min purchase (SAR)"><Inp type="number" value={form.min_purchase} onChange={v=>set('min_purchase',v)} placeholder="0 = no minimum"/></Field>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>Apply to branches</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {BRANCHES.map(b=>{
                const sel=(form.branches||[]).includes(b);
                const toggle=()=>{
                  if(b==='All branches'){set('branches',['All branches']);return;}
                  const cur=(form.branches||[]).filter((x:string)=>x!=='All branches');
                  set('branches',sel?cur.filter((x:string)=>x!==b):[...cur,b]);
                };
                return <button key={b} type="button" onClick={toggle}
                  style={{padding:'4px 10px',borderRadius:20,border:'1.5px solid '+(sel?'var(--fill-accent)':'var(--border-color)'),
                    background:sel?'var(--fill-accent)':'transparent',color:sel?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:11,fontWeight:sel?700:400}}>
                  {b}
                </button>;
              })}
            </div>
          </div>
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
            <SaveBtn label="Create promotion" loading={addMut.isPending} disabled={!form.name||(form.discount_type!=='bogo'&&!form.discount_value)} onClick={()=>addMut.mutate()}/>
          </div>
        </Modal>
      )}
    </div>
  );
}

const COUPON_SEED = [
  {id:'c1',code:'SUMMER20',type:'percentage',value:20,min_purchase:100,usage_limit:500,used:142,expires:'2026-08-31',is_active:true},
  {id:'c2',code:'GOLD10',type:'percentage',value:10,min_purchase:0,usage_limit:null,used:89,expires:null,is_active:true},
  {id:'c3',code:'WELCOME50',type:'fixed',value:50,min_purchase:200,usage_limit:1000,used:317,expires:'2026-12-31',is_active:true},
  {id:'c4',code:'VIP100',type:'fixed',value:100,min_purchase:500,usage_limit:100,used:100,expires:'2026-07-01',is_active:false},
  {id:'c5',code:'FLASH15',type:'percentage',value:15,min_purchase:0,usage_limit:200,used:56,expires:'2026-07-25',is_active:true},
];
const CPN_EMPTY={code:'',type:'percentage',value:'',min_purchase:'',usage_limit:'',expires:'',is_active:true};

function CouponsTab(){
  const [coupons,setCoupons]=React.useState<any[]>(()=>{try{const s=sessionStorage.getItem('coupons');return s?JSON.parse(s):COUPON_SEED;}catch{return COUPON_SEED;}});
  const [showCreate,setShowCreate]=React.useState(false);
  const [form,setForm]=React.useState({...CPN_EMPTY});
  const [copied,setCopied]=React.useState('');
  const save=(list:any[])=>{setCoupons(list);try{sessionStorage.setItem('coupons',JSON.stringify(list));}catch{}};
  const set=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const generate=()=>set('code',Math.random().toString(36).slice(2,8).toUpperCase());
  const copy=(code:string)=>{navigator.clipboard.writeText(code).catch(()=>{});setCopied(code);setTimeout(()=>setCopied(''),1500);};
  const toggle=(id:string)=>save(coupons.map(c=>c.id===id?{...c,is_active:!c.is_active}:c));
  const del=(id:string)=>{if(confirm('Delete coupon?'))save(coupons.filter(c=>c.id!==id));};
  const create=()=>{
    if(!form.code||!form.value)return;
    const nc={id:'c'+Date.now(),code:form.code.toUpperCase(),type:form.type,value:parseFloat(form.value),
      min_purchase:parseFloat(form.min_purchase)||0,usage_limit:form.usage_limit?parseInt(form.usage_limit):null,
      used:0,expires:form.expires||null,is_active:form.is_active};
    save([nc,...coupons]);setShowCreate(false);setForm({...CPN_EMPTY});
  };
  const active=coupons.filter(c=>c.is_active).length;
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>Coupons</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>{active} active · {coupons.length} total</div>
        </div>
        <button className="bt bt-p" onClick={()=>setShowCreate(true)}><i className="ti ti-plus"/> Create coupon</button>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div className="tr th" style={{gridTemplateColumns:'130px 80px 80px 110px 100px 110px 80px 120px'}}>
          {['Code','Type','Value','Min purchase','Usage','Expires','Status','Actions'].map(h=><span key={h}>{h}</span>)}
        </div>
        {coupons.map(cp=>{
          const expired=cp.expires&&new Date(cp.expires)<new Date();
          const full=cp.usage_limit&&cp.used>=cp.usage_limit;
          const status=!cp.is_active?{l:'Inactive',c:'n'}:expired?{l:'Expired',c:'r'}:full?{l:'Maxed out',c:'r'}:{l:'Active',c:'g'};
          const pct=cp.usage_limit?Math.round(cp.used/cp.usage_limit*100):null;
          return(
            <div key={cp.id} className="tr" style={{gridTemplateColumns:'130px 80px 80px 110px 100px 110px 80px 120px',opacity:cp.is_active&&!expired?1:.6}}>
              <span>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--fill-accent)'}}>{cp.code}</span>
                  <button onClick={()=>copy(cp.code)} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:'var(--text-secondary)',fontSize:12}}>
                    <i className={'ti '+(copied===cp.code?'ti-check':'ti-copy')} style={{color:copied===cp.code?'#27ae60':undefined}}/>
                  </button>
                </div>
              </span>
              <span><span className="bx n" style={{fontSize:10,textTransform:'capitalize'}}>{cp.type==='percentage'?'%':'SAR'}</span></span>
              <span style={{fontWeight:700}}>{cp.type==='percentage'?cp.value+'%':'SAR '+cp.value}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{cp.min_purchase>0?'SAR '+cp.min_purchase:'No min'}</span>
              <span style={{fontSize:11}}>
                <div>{cp.used}{cp.usage_limit?' / '+cp.usage_limit:' used'}</div>
                {pct!==null&&<div style={{marginTop:3,height:3,background:'var(--border-color)',borderRadius:2}}>
                  <div style={{height:3,background:pct>=90?'#e74c3c':pct>=60?'#f59e0b':'#27ae60',borderRadius:2,width:pct+'%'}}/>
                </div>}
              </span>
              <span style={{fontSize:11,color:expired?'#e74c3c':'var(--text-secondary)'}}>{cp.expires?new Date(cp.expires).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'numeric'}):'No expiry'}</span>
              <span><span className={'bx '+status.c} style={{fontSize:10}}>{status.l}</span></span>
              <span style={{display:'flex',gap:4}}>
                <button className="bt" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>toggle(cp.id)}>{cp.is_active?'Pause':'Activate'}</button>
                <button className="bt bt-d" style={{fontSize:10,padding:'3px 7px'}} onClick={()=>del(cp.id)}><i className="ti ti-trash"/></button>
              </span>
            </div>
          );
        })}
      </div>
      {showCreate&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}>
          <div style={{background:'var(--surface-2)',borderRadius:'var(--radius)',padding:24,width:460,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:14,fontWeight:700}}>Create coupon</span>
              <button onClick={()=>setShowCreate(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-secondary)'}}>×</button>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>Coupon code *</div>
              <div style={{display:'flex',gap:6}}>
                <input value={form.code} onChange={e=>set('code',e.target.value.toUpperCase())} placeholder="e.g. SAVE20"
                  style={{flex:1,padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:13,fontFamily:'monospace',fontWeight:700,background:'var(--surface-1)',color:'var(--text-primary)',letterSpacing:1}}/>
                <button className="bt" onClick={generate}>Generate</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>Discount type *</div>
                <select value={form.type} onChange={e=>set('type',e.target.value)}
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)'}}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (SAR)</option>
                </select>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>{form.type==='percentage'?'Discount %':'Discount SAR'} *</div>
                <input type="number" value={form.value} onChange={e=>set('value',e.target.value)} placeholder={form.type==='percentage'?'20':'50'}
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>Min purchase (SAR)</div>
                <input type="number" value={form.min_purchase} onChange={e=>set('min_purchase',e.target.value)} placeholder="0 = no min"
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>Usage limit</div>
                <input type="number" value={form.usage_limit} onChange={e=>set('usage_limit',e.target.value)} placeholder="Unlimited"
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>Expiry date</div>
              <input type="date" value={form.expires} onChange={e=>set('expires',e.target.value)}
                style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
            </div>
            {form.code&&form.value&&<div style={{padding:'10px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',fontSize:12,color:'var(--fill-accent)',fontWeight:600,marginBottom:14}}>
              Code <span style={{fontFamily:'monospace'}}>{form.code}</span> gives {form.type==='percentage'?form.value+'%':'SAR '+form.value} off{parseFloat(form.min_purchase)>0?' on orders over SAR '+form.min_purchase:''}
            </div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="bt" onClick={()=>setShowCreate(false)}>Cancel</button>
              <button className="bt bt-p" disabled={!form.code||!form.value} onClick={create}>Create coupon</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const GC_SEED = [
  {id:'g1',code:'GC-8F2K-9XL3',recipient:'Sara Abdullah',phone:'+966 50 123 4567',amount:500,balance:320,issued:'2026-06-15',expires:'2027-06-15',is_active:true},
  {id:'g2',code:'GC-3M7P-2QR8',recipient:'Khalid Al-Saud',phone:'+966 55 987 6543',amount:1000,balance:1000,issued:'2026-07-01',expires:'2027-07-01',is_active:true},
  {id:'g3',code:'GC-5T1N-6WJ4',recipient:'Fatima Hassan',phone:'+966 58 234 5678',amount:250,balance:0,issued:'2026-05-10',expires:'2027-05-10',is_active:true},
  {id:'g4',code:'GC-9A4D-1KX7',recipient:'Walk-in customer',phone:'',amount:200,balance:200,issued:'2026-07-20',expires:'2027-07-20',is_active:true},
  {id:'g5',code:'GC-2C6H-8YM5',recipient:'Mohammed Ali',phone:'+966 50 345 6789',amount:750,balance:0,issued:'2025-07-10',expires:'2026-07-10',is_active:false},
];
const GC_EMPTY={recipient:'',phone:'',amount:'',expires:'',note:''};

function GiftCardsTab(){
  const [cards,setCards]=React.useState<any[]>(()=>{try{const s=sessionStorage.getItem('giftcards');return s?JSON.parse(s):GC_SEED;}catch{return GC_SEED;}});
  const [showCreate,setShowCreate]=React.useState(false);
  const [form,setForm]=React.useState({...GC_EMPTY});
  const [copied,setCopied]=React.useState('');
  const save=(list:any[])=>{setCards(list);try{sessionStorage.setItem('giftcards',JSON.stringify(list));}catch{}};
  const set=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const copy=(code:string)=>{navigator.clipboard.writeText(code).catch(()=>{});setCopied(code);setTimeout(()=>setCopied(''),1500);};
  const toggle=(id:string)=>save(cards.map(g=>g.id===id?{...g,is_active:!g.is_active}:g));
  const del=(id:string)=>{if(confirm('Delete gift card?'))save(cards.filter(g=>g.id!==id));};
  const genCode=()=>'GC-'+Math.random().toString(36).slice(2,6).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const issue=()=>{
    if(!form.amount)return;
    const ng={id:'g'+Date.now(),code:genCode(),recipient:form.recipient||'Walk-in customer',phone:form.phone,
      amount:parseFloat(form.amount),balance:parseFloat(form.amount),
      issued:new Date().toISOString().slice(0,10),
      expires:form.expires||(new Date(Date.now()+365*86400000).toISOString().slice(0,10)),
      note:form.note,is_active:true};
    save([ng,...cards]);setShowCreate(false);setForm({...GC_EMPTY});
  };

  const totalActive=cards.filter(g=>g.is_active&&g.balance>0).reduce((s:number,g:any)=>s+g.balance,0);
  const totalIssued=cards.reduce((s:number,g:any)=>s+g.amount,0);

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>Gift cards</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>
            SAR {totalActive.toLocaleString()} active balance &nbsp;·&nbsp; {cards.length} cards issued &nbsp;·&nbsp; SAR {totalIssued.toLocaleString()} total
          </div>
        </div>
        <button className="bt bt-p" onClick={()=>setShowCreate(true)}><i className="ti ti-plus"/> Issue gift card</button>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
        {[
          {l:'Active balance',v:'SAR '+totalActive.toLocaleString()},
          {l:'Cards issued',v:cards.length},
          {l:'Fully redeemed',v:cards.filter(g=>g.balance===0).length},
          {l:'Expired / inactive',v:cards.filter(g=>!g.is_active||new Date(g.expires)<new Date()).length},
        ].map(s=>(
          <div key={s.l} style={{background:'var(--surface-1)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
            <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:4}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:700}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div className="tr th" style={{gridTemplateColumns:'160px 1fr 120px 100px 100px 90px 80px 130px'}}>
          {['Card code','Recipient','Amount','Balance','Issued','Expires','Status','Actions'].map(h=><span key={h}>{h}</span>)}
        </div>
        {cards.map(g=>{
          const expired=new Date(g.expires)<new Date();
          const used=g.balance===0;
          const pctLeft=Math.round(g.balance/g.amount*100);
          const status=!g.is_active?{l:'Inactive',c:'n'}:expired?{l:'Expired',c:'r'}:used?{l:'Used',c:'n'}:{l:'Active',c:'g'};
          return(
            <div key={g.id} className="tr" style={{gridTemplateColumns:'160px 1fr 120px 100px 100px 90px 80px 130px',opacity:g.is_active&&!expired?1:.6}}>
              <span>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:'var(--fill-accent)'}}>{g.code}</span>
                  <button onClick={()=>copy(g.code)} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:'var(--text-secondary)',fontSize:11}}>
                    <i className={'ti '+(copied===g.code?'ti-check':'ti-copy')} style={{color:copied===g.code?'#27ae60':undefined}}/>
                  </button>
                </div>
              </span>
              <span>
                <div style={{fontWeight:600,fontSize:12}}>{g.recipient}</div>
                {g.phone&&<div style={{fontSize:10,color:'var(--text-secondary)'}}>{g.phone}</div>}
              </span>
              <span style={{fontWeight:700}}>SAR {g.amount.toLocaleString()}</span>
              <span>
                <div style={{fontWeight:700,color:g.balance>0?'var(--fill-accent)':'var(--text-secondary)',fontSize:12}}>SAR {g.balance.toLocaleString()}</div>
                <div style={{marginTop:3,height:3,background:'var(--border-color)',borderRadius:2}}>
                  <div style={{height:3,background:pctLeft>50?'#27ae60':pctLeft>20?'#f59e0b':'#e74c3c',borderRadius:2,width:pctLeft+'%'}}/>
                </div>
              </span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{new Date(g.issued).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'numeric'})}</span>
              <span style={{fontSize:11,color:expired?'#e74c3c':'var(--text-secondary)'}}>{new Date(g.expires).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'2-digit'})}</span>
              <span><span className={'bx '+status.c} style={{fontSize:10}}>{status.l}</span></span>
              <span style={{display:'flex',gap:4}}>
                <button className="bt" style={{fontSize:10,padding:'3px 7px'}} onClick={()=>toggle(g.id)}>{g.is_active?'Pause':'Activate'}</button>
                <button className="bt bt-d" style={{fontSize:10,padding:'3px 7px'}} onClick={()=>del(g.id)}><i className="ti ti-trash"/></button>
              </span>
            </div>
          );
        })}
      </div>

      {showCreate&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}>
          <div style={{background:'var(--surface-2)',borderRadius:'var(--radius)',padding:24,width:440,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:14,fontWeight:700}}>Issue gift card</span>
              <button onClick={()=>setShowCreate(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-secondary)'}}>×</button>
            </div>
            {[
              {l:'Amount (SAR) *',k:'amount',t:'number',p:'e.g. 500'},
              {l:'Recipient name',k:'recipient',t:'text',p:'e.g. Sara Abdullah'},
              {l:'Recipient phone',k:'phone',t:'text',p:'+966 5x xxx xxxx'},
              {l:'Expires',k:'expires',t:'date',p:''},
              {l:'Note (optional)',k:'note',t:'text',p:'e.g. Birthday gift'},
            ].map(f=>(
              <div key={f.k} style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>{f.l}</div>
                <input type={f.t} value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.p}
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
              </div>
            ))}
            {form.amount&&<div style={{padding:'10px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',fontSize:12,color:'var(--fill-accent)',fontWeight:600,marginBottom:14}}>
              Gift card for SAR {parseFloat(form.amount||'0').toLocaleString()} · {form.recipient||'Walk-in customer'} · valid 1 year
            </div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="bt" onClick={()=>setShowCreate(false)}>Cancel</button>
              <button className="bt bt-p" disabled={!form.amount} onClick={issue}><i className="ti ti-gift"/> Issue card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MEM_SEED = [
  {id:'m1',name:'Silver Club',price:199,period:'monthly',benefits:'5% discount · Priority support · Early access',members:142,is_active:true},
  {id:'m2',name:'Gold Club',price:499,period:'monthly',benefits:'10% discount · Free delivery · Birthday gift · VIP lounge',members:67,is_active:true},
  {id:'m3',name:'Platinum Annual',price:2999,period:'annual',benefits:'15% discount · Free delivery · Personal stylist · All events',members:23,is_active:true},
  {id:'m4',name:'Student Plan',price:99,period:'monthly',benefits:'8% discount · Student verification required',members:0,is_active:false},
];
const MEM_EMPTY={name:'',price:'',period:'monthly',benefits:'',is_active:true};

function MembershipsTab(){
  const [plans,setPlans]=React.useState<any[]>(()=>{try{const s=sessionStorage.getItem('memberships');return s?JSON.parse(s):MEM_SEED;}catch{return MEM_SEED;}});
  const [showCreate,setShowCreate]=React.useState(false);
  const [editPlan,setEditPlan]=React.useState<any>(null);
  const [form,setForm]=React.useState({...MEM_EMPTY});
  const save=(list:any[])=>{setPlans(list);try{sessionStorage.setItem('memberships',JSON.stringify(list));}catch{}};
  const set=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const toggle=(id:string)=>save(plans.map(p=>p.id===id?{...p,is_active:!p.is_active}:p));
  const del=(id:string)=>{if(confirm('Delete membership plan?'))save(plans.filter(p=>p.id!==id));};
  const create=()=>{
    if(!form.name||!form.price)return;
    save([...plans,{id:'m'+Date.now(),...form,price:parseFloat(form.price),members:0}]);
    setShowCreate(false);setForm({...MEM_EMPTY});
  };
  const saveEdit=()=>{
    save(plans.map(p=>p.id===editPlan.id?{...p,...form,price:parseFloat(form.price)}:p));
    setEditPlan(null);
  };
  const openEdit=(p:any)=>{setEditPlan(p);setForm({name:p.name,price:String(p.price),period:p.period,benefits:p.benefits,is_active:p.is_active});};
  const totalRevenue=plans.reduce((s:number,p:any)=>s+p.price*(p.period==='annual'?1:12)*p.members,0);

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>Membership plans</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>
            {plans.filter(p=>p.is_active).length} active plans · {plans.reduce((s,p)=>s+p.members,0)} total members · SAR {totalRevenue.toLocaleString()} est. annual revenue
          </div>
        </div>
        <button className="bt bt-p" onClick={()=>{setShowCreate(true);setForm({...MEM_EMPTY});}}><i className="ti ti-plus"/> Create plan</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12,marginBottom:16}}>
        {plans.map(p=>(
          <div key={p.id} className="card" style={{opacity:p.is_active?1:.6,position:'relative'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{p.name}</div>
                <div style={{fontSize:18,fontWeight:800,color:'var(--fill-accent)',marginTop:4}}>
                  SAR {p.price.toLocaleString()}<span style={{fontSize:11,fontWeight:400,color:'var(--text-secondary)'}}>/{p.period==='annual'?'year':'month'}</span>
                </div>
              </div>
              <span className={'bx '+(p.is_active?'g':'n')} style={{fontSize:10}}>{p.is_active?'Active':'Inactive'}</span>
            </div>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:12,lineHeight:1.6}}>
              {p.benefits.split('·').map((b:string,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                  <i className="ti ti-check" style={{color:'#27ae60',fontSize:11}}/>{b.trim()}
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'0.5px solid var(--border-color)',paddingTop:10}}>
              <div style={{fontSize:11,color:'var(--text-secondary)'}}><strong>{p.members}</strong> members</div>
              <div style={{display:'flex',gap:6}}>
                <button className="bt" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>toggle(p.id)}>{p.is_active?'Pause':'Activate'}</button>
                <button className="bt" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>openEdit(p)}><i className="ti ti-edit"/></button>
                <button className="bt bt-d" style={{fontSize:10,padding:'3px 7px'}} onClick={()=>del(p.id)}><i className="ti ti-trash"/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(showCreate||editPlan)&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={e=>{if(e.target===e.currentTarget){setShowCreate(false);setEditPlan(null);}}}>
          <div style={{background:'var(--surface-2)',borderRadius:'var(--radius)',padding:24,width:440}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:14,fontWeight:700}}>{editPlan?'Edit plan':'Create membership plan'}</span>
              <button onClick={()=>{setShowCreate(false);setEditPlan(null);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-secondary)'}}>×</button>
            </div>
            {[{l:'Plan name *',k:'name',t:'text',p:'e.g. Gold Club'},{l:'Benefits (separate with ·)',k:'benefits',t:'text',p:'10% discount · Free delivery'}].map(f=>(
              <div key={f.k} style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>{f.l}</div>
                <input value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.p} type={f.t}
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>Price (SAR) *</div>
                <input type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="499"
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,marginBottom:6}}>Billing period</div>
                <select value={form.period} onChange={e=>set('period',e.target.value)}
                  style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)'}}>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <input type="checkbox" id="mem-active" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} style={{width:16,height:16}}/>
              <label htmlFor="mem-active" style={{fontSize:12,cursor:'pointer'}}>Active (visible to customers)</label>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="bt" onClick={()=>{setShowCreate(false);setEditPlan(null);}}>Cancel</button>
              <button className="bt bt-p" disabled={!form.name||!form.price} onClick={editPlan?saveEdit:create}>{editPlan?'Save changes':'Create plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const WALLET_SEED = [
  {id:'w1',customer:'Sara Abdullah',phone:'+966 50 123 4567',balance:120,transactions:[{type:'credit',amount:50,note:'Birthday bonus',date:'2026-07-15'},{type:'credit',amount:100,note:'Top-up',date:'2026-06-20'},{type:'debit',amount:30,note:'Used on order #1784',date:'2026-07-01'}]},
  {id:'w2',customer:'Khalid Al-Saud',phone:'+966 55 987 6543',balance:350,transactions:[{type:'credit',amount:350,note:'Top-up',date:'2026-07-10'}]},
  {id:'w3',customer:'Fatima Hassan',phone:'+966 58 234 5678',balance:0,transactions:[{type:'credit',amount:200,note:'Refund credit',date:'2026-05-01'},{type:'debit',amount:200,note:'Used on order #1650',date:'2026-06-15'}]},
  {id:'w4',customer:'Layla Saad',phone:'+966 54 456 7890',balance:75,transactions:[{type:'credit',amount:75,note:'Loyalty reward',date:'2026-07-18'}]},
];

function CustomerWalletTab({customers}:{customers:any[]}){
  const [wallets,setWallets]=React.useState<any[]>(()=>{
    try{const s=sessionStorage.getItem('wallets');if(s)return JSON.parse(s);}catch{}
    // Merge with real customers
    return customers.length>0
      ? customers.slice(0,10).map((c:any,i:number)=>({id:'w'+c.id,customer:c.name,phone:c.phone||'',balance:parseFloat(c.wallet_balance||0)||(WALLET_SEED[i]?.balance||0),transactions:WALLET_SEED[i]?.transactions||[]}))
      : WALLET_SEED;
  });
  const [selected,setSelected]=React.useState<any>(null);
  const [showTopup,setShowTopup]=React.useState(false);
  const [topupForm,setTopupForm]=React.useState({amount:'',type:'credit',note:''});
  const save=(list:any[])=>{setWallets(list);try{sessionStorage.setItem('wallets',JSON.stringify(list));}catch{}};

  const doTopup=()=>{
    if(!selected||!topupForm.amount)return;
    const amt=parseFloat(topupForm.amount);
    const tx={type:topupForm.type,amount:amt,note:topupForm.note||'Manual adjustment',date:new Date().toISOString().slice(0,10)};
    const updated=wallets.map(w=>w.id===selected.id?{...w,balance:w.balance+(topupForm.type==='credit'?amt:-Math.min(amt,w.balance)),transactions:[tx,...(w.transactions||[])]}:w);
    save(updated);setSelected(updated.find((w:any)=>w.id===selected.id));setShowTopup(false);setTopupForm({amount:'',type:'credit',note:''});
  };

  const totalBalance=wallets.reduce((s,w)=>s+w.balance,0);
  const withBalance=wallets.filter(w=>w.balance>0).length;

  return(
    <div style={{display:'grid',gridTemplateColumns:selected?'1fr 320px':'1fr',gap:12}}>
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>Customer wallets</div>
            <div style={{fontSize:11,color:'var(--text-secondary)'}}>SAR {totalBalance.toLocaleString()} total balance · {withBalance} wallets with funds</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
          {[['Total wallets',wallets.length],['With balance',withBalance],['Total balance','SAR '+totalBalance.toLocaleString()]].map(([l,v])=>(
            <div key={l as string} style={{background:'var(--surface-1)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
              <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:4}}>{l}</div>
              <div style={{fontSize:16,fontWeight:700}}>{v}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="tr th" style={{gridTemplateColumns:'1fr 130px 110px 80px'}}>
            {['Customer','Phone','Balance','Actions'].map(h=><span key={h}>{h}</span>)}
          </div>
          {wallets.map(w=>(
            <div key={w.id} className="tr" style={{gridTemplateColumns:'1fr 130px 110px 80px',cursor:'pointer',background:selected?.id===w.id?'var(--bg-accent)':''}} onClick={()=>setSelected(w)}>
              <span style={{fontWeight:600,fontSize:12}}>{w.customer}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{w.phone||'—'}</span>
              <span style={{fontWeight:700,color:w.balance>0?'var(--fill-accent)':'var(--text-secondary)'}}>SAR {w.balance.toLocaleString()}</span>
              <span><span className={'bx '+(w.balance>0?'g':'n')} style={{fontSize:10}}>{w.balance>0?'Active':'Empty'}</span></span>
            </div>
          ))}
        </div>
      </div>
      {selected&&(
        <div className="card" style={{alignSelf:'start',position:'sticky',top:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700}}>Wallet</div>
            <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-secondary)'}}>×</button>
          </div>
          <div style={{fontSize:14,fontWeight:700}}>{selected.customer}</div>
          <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:12}}>{selected.phone}</div>
          <div style={{background:'var(--bg-accent)',borderRadius:'var(--radius)',padding:'16px',textAlign:'center',marginBottom:12}}>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:4}}>Current balance</div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--fill-accent)'}}>SAR {selected.balance.toLocaleString()}</div>
          </div>
          <button className="bt bt-p" style={{width:'100%',justifyContent:'center',marginBottom:12}} onClick={()=>setShowTopup(true)}>
            <i className="ti ti-wallet"/> Top-up / Deduct
          </button>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:8}}>TRANSACTION HISTORY</div>
          {(selected.transactions||[]).length===0?<div style={{fontSize:12,color:'var(--text-secondary)',textAlign:'center',padding:'12px 0'}}>No transactions</div>
          :(selected.transactions||[]).map((t:any,i:number)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border-color)',fontSize:12}}>
              <div>
                <div style={{fontWeight:500}}>{t.note}</div>
                <div style={{fontSize:10,color:'var(--text-secondary)'}}>{t.date}</div>
              </div>
              <span style={{fontWeight:700,color:t.type==='credit'?'#27ae60':'#e74c3c'}}>
                {t.type==='credit'?'+':'−'}SAR {t.amount}
              </span>
            </div>
          ))}
          {showTopup&&(
            <div style={{marginTop:12,padding:14,background:'var(--surface-1)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Top-up / Deduct</div>
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                {['credit','debit'].map(t=>(
                  <button key={t} onClick={()=>setTopupForm(p=>({...p,type:t}))}
                    style={{flex:1,padding:'6px',borderRadius:'var(--radius)',border:'1.5px solid '+(topupForm.type===t?'var(--fill-accent)':'var(--border-color)'),
                      background:topupForm.type===t?'var(--fill-accent)':'transparent',color:topupForm.type===t?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:12,textTransform:'capitalize'}}>
                    {t==='credit'?'Add funds':'Deduct'}
                  </button>
                ))}
              </div>
              <input type="number" value={topupForm.amount} onChange={e=>setTopupForm(p=>({...p,amount:e.target.value}))} placeholder="Amount (SAR)"
                style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)',boxSizing:'border-box',marginBottom:8}}/>
              <input value={topupForm.note} onChange={e=>setTopupForm(p=>({...p,note:e.target.value}))} placeholder="Note (optional)"
                style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)',boxSizing:'border-box',marginBottom:10}}/>
              <div style={{display:'flex',gap:6}}>
                <button className="bt" style={{flex:1,justifyContent:'center'}} onClick={()=>setShowTopup(false)}>Cancel</button>
                <button className="bt bt-p" style={{flex:1,justifyContent:'center'}} disabled={!topupForm.amount} onClick={doTopup}>Confirm</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
