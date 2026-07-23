import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

const TIER_COLOR:Record<string,string>={regular:'grey',bronze:'grey',silver:'teal',gold:'amber',vip:'indigo',platinum:'indigo'};
const TIER_CONFIG=[
  {key:'regular',label:'Regular',icon:'👤',minSpend:0,pointsRate:20,color:'#9ca3af',perks:['Basic loyalty points','Birthday discount 5%']},
  {key:'silver',label:'Silver',icon:'🥈',minSpend:500,pointsRate:25,color:'#aaa',perks:['25% faster points','Birthday discount 10%','Free shipping on orders 200+']},
  {key:'gold',label:'Gold',icon:'🥇',minSpend:2000,pointsRate:33,color:'#f59e0b',perks:['33% faster points','Birthday discount 15%','Free shipping all orders','Early access to sales']},
  {key:'vip',label:'VIP',icon:'💎',minSpend:5000,pointsRate:50,color:'#6366f1',perks:['50% faster points','Birthday discount 20%','Free shipping + gift wrap','Personal stylist access','Exclusive VIP events']},
];
const OCCASIONS=['None','Eid Al-Fitr','Eid Al-Adha','Ramadan','National Day','Black Friday','Summer Sale','Winter Sale','Clearance','New Year','Valentine\'s Day','Back to School'];
const TYPE_LABEL:Record<string,string>={percentage:'% Off',fixed_amount:'SAR Off',buy_x_get_y:'Buy X Get Y',free_item:'Free Item'};

function MultiSelect({label,options,selected,onToggle}:{label:string;options:{id:string;name:string}[];selected:string[];onToggle:(id:string)=>void}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const filtered=options.filter(o=>o.name.toLowerCase().includes(search.toLowerCase()));
  return(
    <div style={{position:'relative'}}>
      <label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>{label}</label>
      <div onClick={()=>setOpen(o=>!o)} style={{minHeight:38,padding:'6px 10px',border:'1px solid var(--bd)',borderRadius:8,cursor:'pointer',display:'flex',flexWrap:'wrap',gap:4,alignItems:'center',background:'var(--bg)'}}>
        {selected.length===0&&<span style={{color:'var(--mu)',fontSize:13}}>Select...</span>}
        {selected.map(id=>{const o=options.find(x=>x.id===id);return o?(<span key={id} style={{fontSize:11,padding:'2px 8px',borderRadius:12,background:'var(--acg)',color:'var(--ac)'}}>{o.name}</span>):null;})}
      </div>
      {open&&(<div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'var(--cd)',border:'1px solid var(--bd)',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,.15)',maxHeight:200,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <input autoFocus className="nx-input" style={{margin:8,width:'calc(100% - 16px)'}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{overflowY:'auto',flex:1}}>
          {filtered.map(o=>(<div key={o.id} onClick={()=>onToggle(o.id)} style={{padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,background:selected.includes(o.id)?'var(--acg)':'transparent',fontSize:13}}>
            <input type="checkbox" readOnly checked={selected.includes(o.id)} style={{pointerEvents:'none'}}/>
            {o.name}
          </div>))}
          {filtered.length===0&&<div style={{padding:'12px',color:'var(--mu)',fontSize:12,textAlign:'center'}}>No results</div>}
        </div>
      </div>)}
    </div>
  );
}

function DiscountModal({disc,onClose,products,categories}:{disc:any;onClose:()=>void;products:any[];categories:{id:string;name:string}[]}){
  const qc=useQueryClient();
  const [form,setForm]=useState({
    name:disc?.name||'',description:disc?.description||'',
    type:disc?.type||'percentage',scope:disc?.scope||'order',
    value:String(disc?.value||''),min_order_amount:String(disc?.min_order_amount||''),
    is_coupon:disc?.is_coupon||false,coupon_code:disc?.coupon_code||'',
    usage_limit:String(disc?.usage_limit||''),valid_from:disc?.valid_from?.slice(0,10)||'',
    valid_until:disc?.valid_until?.slice(0,10)||'',buy_quantity:String(disc?.buy_quantity||''),
    get_quantity:String(disc?.get_quantity||''),
    applies_to:disc?.applies_to||'all',
    category_ids:(disc?.category_ids||[]) as string[],
    product_ids:(disc?.product_ids||[]) as string[],
    tier_restriction:(disc?.tier_restriction||[]) as string[],
    occasion:disc?.occasion||'None',
    stackable:disc?.stackable??true,
    first_order_only:disc?.first_order_only||false,
    one_per_customer:disc?.one_per_customer||false,
  });
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const toggleArr=(k:string,v:string)=>setForm(f=>({...f,[k]:(f as any)[k].includes(v)?(f as any)[k].filter((x:string)=>x!==v):[...(f as any)[k],v]}));
  const genCode=()=>F('coupon_code',Math.random().toString(36).slice(2,8).toUpperCase());

  const save=useMutation({
    mutationFn:()=>api.post('/sales/discounts',{
      name:form.name,description:form.description,type:form.type,scope:form.scope,
      value:parseFloat(form.value)||0,
      min_order_amount:parseFloat(form.min_order_amount)||undefined,
      is_coupon:form.is_coupon,coupon_code:form.is_coupon?form.coupon_code:undefined,
      usage_limit:parseInt(form.usage_limit)||undefined,
      valid_from:form.valid_from||undefined,valid_until:form.valid_until||undefined,
      buy_quantity:parseInt(form.buy_quantity)||undefined,
      get_quantity:parseInt(form.get_quantity)||undefined,
      applies_to:form.applies_to,
      category_ids:form.applies_to==='category'?form.category_ids:undefined,
      product_ids:form.applies_to==='product'?form.product_ids:undefined,
      tier_restriction:form.applies_to==='tier'?form.tier_restriction:undefined,
      occasion:form.occasion!=='None'?form.occasion:undefined,
      stackable:form.stackable,
      first_order_only:form.first_order_only,
      one_per_customer:form.one_per_customer,
    }),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['discounts']});onClose();},
  });

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(640px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{disc?.id?'Edit Discount':'New Discount / Coupon'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:24,overflowY:'auto',flex:1,display:'grid',gap:16}}>

          {/* Basic info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/3'}}><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Discount Name *</label><input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Summer Sale 20%"/></div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Occasion / Tag</label>
              <select className="nx-select" style={{width:'100%'}} value={form.occasion} onChange={e=>F('occasion',e.target.value)}>
                {OCCASIONS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Description</label><input className="nx-input" style={{width:'100%'}} value={form.description} onChange={e=>F('description',e.target.value)} placeholder="Optional note"/></div>
          </div>

          {/* Type & value */}
          <div style={{border:'1px solid var(--bd)',borderRadius:10,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Discount Type & Value</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Type</label>
                <select className="nx-select" style={{width:'100%'}} value={form.type} onChange={e=>F('type',e.target.value)}>
                  <option value="percentage">Percentage % Off</option>
                  <option value="fixed_amount">Fixed Amount SAR Off</option>
                  <option value="buy_x_get_y">Buy X Get Y Free</option>
                  <option value="free_item">Free Item</option>
                </select>
              </div>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Applies On</label>
                <select className="nx-select" style={{width:'100%'}} value={form.scope} onChange={e=>F('scope',e.target.value)}>
                  <option value="order">Entire Order</option>
                  <option value="item">Per Item</option>
                </select>
              </div>
              {['percentage','fixed_amount'].includes(form.type)&&<>
                <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>{form.type==='percentage'?'Discount %':'Discount Amount (SAR)'}</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.value} onChange={e=>F('value',e.target.value)} placeholder={form.type==='percentage'?'10':'50'}/></div>
                <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Min Order Amount (SAR)</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.min_order_amount} onChange={e=>F('min_order_amount',e.target.value)} placeholder="0"/></div>
              </>}
              {form.type==='buy_x_get_y'&&<>
                <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Buy Quantity</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.buy_quantity} onChange={e=>F('buy_quantity',e.target.value)} placeholder="2"/></div>
                <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Get Quantity Free</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.get_quantity} onChange={e=>F('get_quantity',e.target.value)} placeholder="1"/></div>
              </>}
            </div>
          </div>

          {/* Applies To */}
          <div style={{border:'1px solid var(--bd)',borderRadius:10,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Applies To</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:form.applies_to!=='all'?12:0}}>
              {([['all','All Products','🌐'],['category','By Category','📂'],['product','By Product','👕'],['tier','By Tier','👑']] as const).map(([k,l,ic])=>(
                <button key={k} onClick={()=>F('applies_to',k)} style={{padding:'10px 6px',border:`2px solid ${form.applies_to===k?'var(--ac)':'var(--bd)'}`,borderRadius:8,background:form.applies_to===k?'var(--acg)':'transparent',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <span style={{fontSize:18}}>{ic}</span>{l}
                </button>
              ))}
            </div>
            {form.applies_to==='category'&&(
              <MultiSelect label="Select Categories" options={categories} selected={form.category_ids} onToggle={id=>toggleArr('category_ids',id)}/>
            )}
            {form.applies_to==='product'&&(
              <MultiSelect label="Select Products" options={products.map(p=>({id:String(p.id),name:`${p.name}${p.sku?' ('+p.sku+')':''}`}))} selected={form.product_ids} onToggle={id=>toggleArr('product_ids',id)}/>
            )}
            {form.applies_to==='tier'&&(
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:8}}>Eligible Tiers</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {TIER_CONFIG.map(t=>(
                    <label key={t.key} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',border:`2px solid ${form.tier_restriction.includes(t.key)?t.color:'var(--bd)'}`,borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:600,background:form.tier_restriction.includes(t.key)?t.color+'22':'transparent'}}>
                      <input type="checkbox" style={{display:'none'}} checked={form.tier_restriction.includes(t.key)} onChange={()=>toggleArr('tier_restriction',t.key)}/>{t.icon} {t.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Validity & limits */}
          <div style={{border:'1px solid var(--bd)',borderRadius:10,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Validity & Limits</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Valid From</label><input className="nx-input" type="date" style={{width:'100%'}} value={form.valid_from} onChange={e=>F('valid_from',e.target.value)}/></div>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Valid Until</label><input className="nx-input" type="date" style={{width:'100%'}} value={form.valid_until} onChange={e=>F('valid_until',e.target.value)}/></div>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Total Usage Limit</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.usage_limit} onChange={e=>F('usage_limit',e.target.value)} placeholder="Unlimited"/></div>
            </div>
          </div>

          {/* Coupon code */}
          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'12px 14px',border:`2px solid ${form.is_coupon?'var(--ac)':'var(--bd)'}`,borderRadius:10,background:form.is_coupon?'var(--acg)':'transparent'}}>
            <input type="checkbox" checked={form.is_coupon} onChange={e=>F('is_coupon',e.target.checked)}/>
            <div><div style={{fontWeight:600,fontSize:13}}>🎟 Make this a coupon code</div><div style={{fontSize:11,color:'var(--mu)'}}>Customer must enter a code at checkout to activate</div></div>
          </label>
          {form.is_coupon&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end'}}>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Coupon Code</label>
                <input className="nx-input" style={{width:'100%',fontFamily:'monospace',fontWeight:700,letterSpacing:2,textTransform:'uppercase',fontSize:15}} value={form.coupon_code} onChange={e=>F('coupon_code',e.target.value.toUpperCase())} placeholder="SUMMER20"/>
              </div>
              <button className="btn-nx ghost" onClick={genCode} style={{height:38}}>✨ Generate</button>
            </div>
          )}

          {/* Extra options */}
          <div style={{border:'1px solid var(--bd)',borderRadius:10,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Extra Options</div>
            <div style={{display:'grid',gap:8}}>
              {[
                ['stackable','🔗 Stackable with other discounts','Can be combined with other active promos'],
                ['first_order_only','🆕 First order only','Only applies to customer\'s first purchase'],
                ['one_per_customer','👤 One per customer','Each customer can only use this once'],
              ].map(([k,l,d])=>(
                <label key={k} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 12px',borderRadius:8,background:'var(--bg)'}}>
                  <input type="checkbox" checked={(form as any)[k]} onChange={e=>F(k,e.target.checked)}/>
                  <div><div style={{fontWeight:600,fontSize:13}}>{l}</div><div style={{fontSize:11,color:'var(--mu)'}}>{d}</div></div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{padding:'16px 24px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end',flexShrink:0}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||save.isPending}>{save.isPending?'Saving...':'Save Discount'}</button>
        </div>
      </div>
    </div>
  );
}

function GiftCardModal({onClose}:{onClose:()=>void}){
  const [form,setForm]=useState({code:'',balance:'',expires:'',recipient_name:'',recipient_email:'',is_active:true});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const genCode=()=>F('code','GC-'+Math.random().toString(36).slice(2,6).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase());
  const save=()=>{
    const gcs=JSON.parse(sessionStorage.getItem('giftcards')||'[]');
    gcs.push({...form,id:'gc-'+Date.now(),balance:parseFloat(form.balance),created_at:new Date().toISOString()});
    sessionStorage.setItem('giftcards',JSON.stringify(gcs));
    onClose();
  };
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(460px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Issue Gift Card</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:24,display:'grid',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end'}}>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Gift Card Code</label>
              <input className="nx-input" style={{width:'100%',fontFamily:'monospace',fontWeight:700,letterSpacing:1}} value={form.code} onChange={e=>F('code',e.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX"/>
            </div>
            <button className="btn-nx ghost sm" style={{height:38}} onClick={genCode}>Generate</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Balance (SAR)</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.balance} onChange={e=>F('balance',e.target.value)} placeholder="500"/></div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Expires</label><input className="nx-input" type="date" style={{width:'100%'}} value={form.expires} onChange={e=>F('expires',e.target.value)}/></div>
          </div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Recipient Name</label><input className="nx-input" style={{width:'100%'}} value={form.recipient_name} onChange={e=>F('recipient_name',e.target.value)}/></div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Recipient Email</label><input className="nx-input" type="email" style={{width:'100%'}} value={form.recipient_email} onChange={e=>F('recipient_email',e.target.value)}/></div>
        </div>
        <div style={{padding:'16px 24px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={save} disabled={!form.code||!form.balance}>Issue Gift Card</button>
        </div>
      </div>
    </div>
  );
}

function DiscountCard({d,cats,onEdit}:{d:any;cats:{id:string;name:string}[];onEdit:()=>void}){
  const now=new Date();
  const started=!d.valid_from||new Date(d.valid_from)<=now;
  const expired=d.valid_until&&new Date(d.valid_until)<now;
  const status=expired?'expired':!started?'scheduled':'active';
  const STATUS_STYLE:Record<string,{bg:string;color:string;label:string}>={
    active:{bg:'#d1fae5',color:'#065f46',label:'Active'},
    expired:{bg:'#fee2e2',color:'#991b1b',label:'Expired'},
    scheduled:{bg:'#dbeafe',color:'#1e40af',label:'Scheduled'},
  };
  const st=STATUS_STYLE[status];
  const scopeLabel=d.applies_to==='category'?`📂 ${(d.category_ids||[]).map((id:string)=>cats.find(c=>c.id===id)?.name||id).join(', ')||'Category'}`:d.applies_to==='product'?`👕 ${(d.product_ids||[]).length} product(s)`:d.applies_to==='tier'?`👑 ${(d.tier_restriction||[]).join('/')||'Tiers'}`:'🌐 All Products';

  return(
    <div className="nx-card" style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{width:40,height:40,borderRadius:10,background:'var(--acg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{d.is_coupon?'🎟':'🏷'}</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
          <span style={{fontSize:11,padding:'3px 8px',borderRadius:12,background:st.bg,color:st.color,fontWeight:700}}>{st.label}</span>
          {d.occasion&&d.occasion!=='None'&&<span style={{fontSize:11,padding:'3px 8px',borderRadius:12,background:'var(--acg)',color:'var(--ac)',fontWeight:600}}>{d.occasion}</span>}
        </div>
      </div>
      <div>
        <div style={{fontWeight:700,fontSize:15}}>{d.name}</div>
        {d.description&&<div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{d.description}</div>}
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        <span style={{fontSize:11,padding:'3px 8px',borderRadius:12,background:'#e0e7ff',color:'#3730a3',fontWeight:600}}>{TYPE_LABEL[d.type]||d.type}</span>
        <span style={{fontSize:11,padding:'3px 8px',borderRadius:12,background:'var(--bg)',color:'var(--mu)',fontWeight:600,border:'1px solid var(--bd)'}}>{scopeLabel}</span>
        {d.scope==='item'&&<span style={{fontSize:11,padding:'3px 8px',borderRadius:12,background:'#fef9c3',color:'#854d0e',fontWeight:600}}>Per Item</span>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:12}}>
        <div style={{padding:'6px 8px',background:'var(--bg)',borderRadius:6}}>
          <div style={{color:'var(--mu)',fontSize:10,marginBottom:2}}>VALUE</div>
          <div style={{fontWeight:700,fontSize:15,color:'var(--ac)'}}>{d.type==='percentage'?d.value+'%':'SAR '+d.value}</div>
        </div>
        {d.is_coupon&&<div style={{padding:'6px 8px',background:'var(--bg)',borderRadius:6}}>
          <div style={{color:'var(--mu)',fontSize:10,marginBottom:2}}>CODE</div>
          <div style={{fontWeight:700,fontFamily:'monospace',letterSpacing:1,color:'var(--ac)'}}>{d.coupon_code}</div>
        </div>}
        {d.min_order_amount>0&&<div style={{padding:'6px 8px',background:'var(--bg)',borderRadius:6}}>
          <div style={{color:'var(--mu)',fontSize:10,marginBottom:2}}>MIN ORDER</div>
          <div style={{fontWeight:600}}>SAR {d.min_order_amount}</div>
        </div>}
        {d.usage_limit&&<div style={{padding:'6px 8px',background:'var(--bg)',borderRadius:6}}>
          <div style={{color:'var(--mu)',fontSize:10,marginBottom:2}}>USAGE</div>
          <div style={{fontWeight:600}}>{d.usage_count||0} / {d.usage_limit}</div>
        </div>}
      </div>
      {d.valid_until&&<div style={{fontSize:11,color:expired?'#ef4444':'var(--mu)'}}>⏱ {expired?'Expired':'Expires'} {new Date(d.valid_until).toLocaleDateString()}</div>}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:2}}>
        {d.stackable===false&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:8,background:'#fee2e2',color:'#991b1b'}}>Non-stackable</span>}
        {d.first_order_only&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:8,background:'#dbeafe',color:'#1e40af'}}>First order</span>}
        {d.one_per_customer&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:8,background:'#f3e8ff',color:'#7e22ce'}}>1 per customer</span>}
      </div>
      <button className="btn-nx ghost sm" style={{width:'100%',justifyContent:'center',marginTop:4}} onClick={onEdit}><i className="ti ti-edit"/> Edit</button>
    </div>
  );
}

export default function Loyalty(){
  const [tab,setTab]=useState('members');
  const [showDisc,setShowDisc]=useState(false);
  const [showGC,setShowGC]=useState(false);
  const [editDisc,setEditDisc]=useState<any>(null);
  const [discFilter,setDiscFilter]=useState('all');
  const [discSearch,setDiscSearch]=useState('');

  const {data:custData}=useQuery({queryKey:['customers'],queryFn:async()=>{const r=await api.get('/customers?limit=500');return r.data;}});
  const {data:discData,isLoading:discLoading}=useQuery({queryKey:['discounts'],queryFn:async()=>{const r=await api.get('/sales/discounts');return r.data;}});
  const {data:prodData}=useQuery({queryKey:['products-all'],queryFn:async()=>{const r=await api.get('/products?limit=300');return r.data;}});
  const [giftCards,setGiftCards]=useState<any[]>(()=>{try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return[];}});

  const customers:any[]=Array.isArray(custData)?custData:custData?.customers||custData?.data||[];
  const discounts:any[]=Array.isArray(discData)?discData:discData?.discounts||discData?.data||[];
  const products:any[]=Array.isArray(prodData)?prodData:prodData?.products||prodData?.data||[];

  const categories:{id:string;name:string}[]=useMemo(()=>{
    const seen=new Set<string>();
    const cats:{id:string;name:string}[]=[];
    products.forEach(p=>{if(p.category&&!seen.has(p.category)){seen.add(p.category);cats.push({id:p.category,name:p.category});}});
    return cats;
  },[products]);

  const tierCounts=TIER_CONFIG.reduce((acc,t)=>({...acc,[t.key]:customers.filter(c=>(c.loyalty_tier||'regular')===t.key).length}),{} as Record<string,number>);
  const totalPoints=customers.reduce((s,c)=>s+(c.loyalty_points||0),0);
  const now=new Date();
  const activeCoupons=discounts.filter(d=>d.is_coupon&&(!d.valid_until||new Date(d.valid_until)>now)).length;
  const activePromos=discounts.filter(d=>!d.is_coupon&&(!d.valid_until||new Date(d.valid_until)>now)).length;

  const filteredDiscounts=useMemo(()=>{
    let list=discounts;
    if(discFilter==='active') list=list.filter(d=>(!d.valid_until||new Date(d.valid_until)>now)&&(!d.valid_from||new Date(d.valid_from)<=now));
    if(discFilter==='coupons') list=list.filter(d=>d.is_coupon);
    if(discFilter==='promos') list=list.filter(d=>!d.is_coupon);
    if(discFilter==='expired') list=list.filter(d=>d.valid_until&&new Date(d.valid_until)<now);
    if(discFilter==='category') list=list.filter(d=>d.applies_to==='category');
    if(discFilter==='product') list=list.filter(d=>d.applies_to==='product');
    if(discFilter==='tier') list=list.filter(d=>d.applies_to==='tier');
    if(discSearch) list=list.filter(d=>d.name?.toLowerCase().includes(discSearch.toLowerCase())||d.coupon_code?.toLowerCase().includes(discSearch.toLowerCase()));
    return list;
  },[discounts,discFilter,discSearch,now]);

  const delGC=(id:string)=>{const n=giftCards.filter(g=>g.id!==id);sessionStorage.setItem('giftcards',JSON.stringify(n));setGiftCards(n);};

  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Loyalty & Promotions</h1><p className="nx-page-sub">{customers.length} members · {discounts.length} discounts</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost" onClick={()=>setShowGC(true)}><i className="ti ti-gift"/> Issue Gift Card</button>
        <button className="btn-nx primary" onClick={()=>{setEditDisc(null);setShowDisc(true);}}><i className="ti ti-plus"/> New Discount</button>
      </div>
    </div>

    <div className="nx-stats cols-4" style={{marginBottom:20}}>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-users"/></div><div className="nx-stat-body"><div className="nx-stat-val">{customers.length}</div><div className="nx-stat-lbl">Total Members</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-star"/></div><div className="nx-stat-body"><div className="nx-stat-val">{totalPoints.toLocaleString()}</div><div className="nx-stat-lbl">Points Issued</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-tag"/></div><div className="nx-stat-body"><div className="nx-stat-val">{activePromos}</div><div className="nx-stat-lbl">Active Promos</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-barcode"/></div><div className="nx-stat-body"><div className="nx-stat-val">{activeCoupons}</div><div className="nx-stat-lbl">Active Coupons</div></div></div>
    </div>

    <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--bd)'}}>
      {[['members','👥 Members'],['discounts','🏷 Discounts & Coupons'],['tiers','👑 Tier Settings'],['giftcards','🎁 Gift Cards']].map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:'8px 16px',border:'none',background:'none',borderBottom:tab===id?'2px solid var(--ac)':'2px solid transparent',color:tab===id?'var(--ac)':'var(--mu)',fontWeight:tab===id?600:400,cursor:'pointer',fontSize:13}}>{l}</button>
      ))}
    </div>

    {tab==='members'&&(<div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {TIER_CONFIG.map(t=>(
          <div key={t.key} className="nx-card" style={{textAlign:'center',borderTop:`3px solid ${t.color}`}}>
            <div style={{fontSize:28,marginBottom:4}}>{t.icon}</div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{t.label}</div>
            <div style={{fontSize:28,fontWeight:900,color:t.color}}>{(tierCounts as any)[t.key]||0}</div>
            <div style={{fontSize:11,color:'var(--mu)'}}>members</div>
          </div>
        ))}
      </div>
      <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
            {['Customer','Phone','Tier','Points','Wallet','Total Spent','Joined'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {customers.slice(0,50).map((c:any)=>(
              <tr key={c.id} style={{borderBottom:'1px solid var(--bd)'}}>
                <td style={{padding:'10px 14px',fontWeight:600,fontSize:13}}>{c.name}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'var(--mu)'}}>{c.phone||'—'}</td>
                <td style={{padding:'10px 14px'}}><span className={`nx-badge ${TIER_COLOR[c.loyalty_tier||'regular']}`}>{c.loyalty_tier||'regular'}</span></td>
                <td style={{padding:'10px 14px',fontWeight:600}}>{(c.loyalty_points||0).toLocaleString()}</td>
                <td style={{padding:'10px 14px',fontSize:13}}>SAR {parseFloat(c.wallet_balance||0).toFixed(2)}</td>
                <td style={{padding:'10px 14px',fontWeight:600}}>SAR {parseFloat(c.total_spent||0).toFixed(2)}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'var(--mu)'}}>{c.created_at?new Date(c.created_at).toLocaleDateString():'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>)}

    {tab==='discounts'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input className="nx-input" placeholder="Search name or code..." value={discSearch} onChange={e=>setDiscSearch(e.target.value)} style={{width:200}}/>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {[['all','All'],['active','Active'],['coupons','🎟 Coupons'],['promos','🏷 Auto-Apply'],['expired','Expired'],['category','📂 Category'],['product','👕 Product'],['tier','👑 Tier']].map(([k,l])=>(
            <button key={k} onClick={()=>setDiscFilter(k)} className={`btn-nx ${discFilter===k?'primary':'ghost'} sm`}>{l}</button>
          ))}
        </div>
        <button className="btn-nx primary sm" style={{marginLeft:'auto'}} onClick={()=>{setEditDisc(null);setShowDisc(true);}}><i className="ti ti-plus"/> New</button>
      </div>
      {discLoading?<div style={{padding:40,textAlign:'center',color:'var(--mu)'}}>Loading...</div>:filteredDiscounts.length===0?<div className="nx-card" style={{textAlign:'center',padding:'48px 0',color:'var(--mu)'}}><div style={{fontSize:40,marginBottom:8}}>🏷</div><p style={{fontWeight:600}}>No discounts found</p></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {filteredDiscounts.map((d:any)=><DiscountCard key={d.id} d={d} cats={categories} onEdit={()=>{setEditDisc(d);setShowDisc(true);}}/>)}
        </div>
      )}
    </div>)}

    {tab==='tiers'&&(<div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {TIER_CONFIG.map(t=>(
          <div key={t.key} className="nx-card" style={{borderTop:`4px solid ${t.color}`}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              <div style={{fontSize:32}}>{t.icon}</div>
              <div><div style={{fontWeight:700,fontSize:17}}>{t.label}</div><div style={{fontSize:12,color:'var(--mu)'}}>{(tierCounts as any)[t.key]||0} members</div></div>
              <span style={{marginLeft:'auto',fontSize:11,padding:'3px 10px',borderRadius:20,background:t.color+'22',color:t.color,fontWeight:700}}>{t.pointsRate}% rate</span>
            </div>
            <div style={{marginBottom:12,paddingBottom:12,borderBottom:'1px solid var(--bd)'}}>
              <div style={{fontSize:11,color:'var(--mu)',marginBottom:4}}>MIN SPEND TO QUALIFY</div>
              <div style={{fontWeight:700,fontSize:16}}>SAR {t.minSpend.toLocaleString()}</div>
            </div>
            <div style={{fontSize:11,color:'var(--mu)',marginBottom:6,fontWeight:600}}>PERKS</div>
            {t.perks.map(p=><div key={p} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,marginBottom:6}}><i className="ti ti-check" style={{color:'#10b981',fontSize:13}}/>{p}</div>)}
          </div>
        ))}
      </div>
      <div className="nx-card" style={{marginTop:16,padding:20}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Points Redemption Rule</div>
        <div style={{fontSize:13,color:'var(--mu)',marginBottom:14}}>How customers convert points to SAR value</div>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'var(--bg)',borderRadius:10,fontSize:14}}>
          <span style={{fontSize:20}}>⭐</span><strong>10 points</strong><span style={{color:'var(--mu)'}}>= </span><strong>SAR 1.00</strong><span style={{color:'var(--mu)',marginLeft:'auto',fontSize:12}}>Min. 10 points to redeem</span>
        </div>
      </div>
    </div>)}

    {tab==='giftcards'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button className="btn-nx primary sm" onClick={()=>setShowGC(true)}><i className="ti ti-plus"/> Issue Gift Card</button>
      </div>
      {giftCards.length===0?<div className="nx-card" style={{textAlign:'center',padding:'48px 0',color:'var(--mu)'}}><div style={{fontSize:40,marginBottom:8}}>🎁</div><p style={{fontWeight:600}}>No gift cards yet</p></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {giftCards.map((g:any)=>{
            const expired=g.expires&&new Date(g.expires)<now;
            return(<div key={g.id} className="nx-card" style={{background:'linear-gradient(135deg,var(--acg),var(--cd))'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={{fontSize:24}}>🎁</span>
                <span className={`nx-badge ${expired?'inactive':g.balance>0?'active':'grey'}`}>{expired?'Expired':g.balance>0?'Active':'Used'}</span>
              </div>
              <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,letterSpacing:2,marginBottom:8}}>{g.code}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                <div><div style={{fontSize:10,color:'var(--mu)'}}>BALANCE</div><div style={{fontWeight:700,fontSize:18,color:'var(--ac)'}}>SAR {parseFloat(g.balance||0).toFixed(2)}</div></div>
                <div><div style={{fontSize:10,color:'var(--mu)'}}>EXPIRES</div><div style={{fontWeight:600,fontSize:12}}>{g.expires?new Date(g.expires).toLocaleDateString():'Never'}</div></div>
              </div>
              {g.recipient_name&&<div style={{fontSize:12,color:'var(--mu)',marginBottom:10}}>👤 {g.recipient_name}{g.recipient_email?' · '+g.recipient_email:''}</div>}
              <button className="btn-nx ghost sm" style={{color:'#ef4444',width:'100%',justifyContent:'center'}} onClick={()=>delGC(g.id)}><i className="ti ti-trash"/> Delete</button>
            </div>);
          })}
        </div>
      )}
    </div>)}

    {showDisc&&<DiscountModal disc={editDisc} onClose={()=>setShowDisc(false)} products={products} categories={categories}/>}
    {showGC&&<GiftCardModal onClose={()=>{setShowGC(false);setGiftCards(JSON.parse(sessionStorage.getItem('giftcards')||'[]'));}}/>}
  </div>);
}
