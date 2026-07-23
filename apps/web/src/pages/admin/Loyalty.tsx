import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const TIER_COLOR:Record<string,string>={regular:'grey',bronze:'grey',silver:'teal',gold:'amber',vip:'indigo',platinum:'indigo'};
const TIER_CONFIG=[
  {key:'regular',label:'Regular',icon:'👤',minSpend:0,pointsRate:20,color:'#9ca3af',perks:['Basic loyalty points','Birthday discount 5%']},
  {key:'silver',label:'Silver',icon:'🥈',minSpend:500,pointsRate:25,color:'#aaa',perks:['25% faster points','Birthday discount 10%','Free shipping on orders 200+']},
  {key:'gold',label:'Gold',icon:'🥇',minSpend:2000,pointsRate:33,color:'#f59e0b',perks:['33% faster points','Birthday discount 15%','Free shipping all orders','Early access to sales']},
  {key:'vip',label:'VIP',icon:'💎',minSpend:5000,pointsRate:50,color:'#6366f1',perks:['50% faster points','Birthday discount 20%','Free shipping + gift wrap','Personal stylist access','Exclusive VIP events']},
];

function DiscountModal({disc,onClose}:{disc:any;onClose:()=>void}){
  const qc=useQueryClient();
  const isEdit=!!disc?.id;
  const [form,setForm]=useState({
    name:disc?.name||'',description:disc?.description||'',
    type:disc?.type||'percentage',scope:disc?.scope||'order',
    value:disc?.value||'',min_order_amount:disc?.min_order_amount||'',
    is_coupon:disc?.is_coupon||false,coupon_code:disc?.coupon_code||'',
    usage_limit:disc?.usage_limit||'',valid_from:disc?.valid_from?.slice(0,10)||'',
    valid_until:disc?.valid_until?.slice(0,10)||'',buy_quantity:disc?.buy_quantity||'',
    get_quantity:disc?.get_quantity||'',
  });
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const genCode=()=>F('coupon_code',Math.random().toString(36).slice(2,8).toUpperCase());
  const save=useMutation({
    mutationFn:()=>api.post('/sales/discounts',{...form,value:parseFloat(form.value)||0,min_order_amount:parseFloat(form.min_order_amount)||undefined,usage_limit:parseInt(form.usage_limit)||undefined,buy_quantity:parseInt(form.buy_quantity)||undefined,get_quantity:parseInt(form.get_quantity)||undefined}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['discounts']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(580px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{isEdit?'Edit Discount':'New Discount / Coupon'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:24,display:'grid',gap:14,maxHeight:'72vh',overflowY:'auto'}}>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Name *</label><input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Summer Sale 20%"/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Type</label>
              <select className="nx-select" style={{width:'100%'}} value={form.type} onChange={e=>F('type',e.target.value)}>
                <option value="percentage">Percentage %</option>
                <option value="fixed_amount">Fixed Amount SAR</option>
                <option value="buy_x_get_y">Buy X Get Y</option>
                <option value="free_item">Free Item</option>
              </select>
            </div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Scope</label>
              <select className="nx-select" style={{width:'100%'}} value={form.scope} onChange={e=>F('scope',e.target.value)}>
                <option value="order">Entire Order</option>
                <option value="item">Per Item</option>
              </select>
            </div>
          </div>
          {['percentage','fixed_amount'].includes(form.type)&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>{form.type==='percentage'?'Discount %':'Discount SAR'}</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.value} onChange={e=>F('value',e.target.value)} placeholder={form.type==='percentage'?'10':'50'}/></div>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Min Order Amount (SAR)</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.min_order_amount} onChange={e=>F('min_order_amount',e.target.value)} placeholder="0"/></div>
            </div>
          )}
          {form.type==='buy_x_get_y'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Buy Quantity</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.buy_quantity} onChange={e=>F('buy_quantity',e.target.value)} placeholder="2"/></div>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Get Quantity Free</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.get_quantity} onChange={e=>F('get_quantity',e.target.value)} placeholder="1"/></div>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Valid From</label><input className="nx-input" type="date" style={{width:'100%'}} value={form.valid_from} onChange={e=>F('valid_from',e.target.value)}/></div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Valid Until</label><input className="nx-input" type="date" style={{width:'100%'}} value={form.valid_until} onChange={e=>F('valid_until',e.target.value)}/></div>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px',border:'1px solid var(--bd)',borderRadius:10}}>
            <input type="checkbox" checked={form.is_coupon} onChange={e=>F('is_coupon',e.target.checked)}/>
            <div><div style={{fontWeight:600,fontSize:13}}>Make this a coupon code</div><div style={{fontSize:11,color:'var(--mu)'}}>Customers enter a code to redeem this discount</div></div>
          </label>
          {form.is_coupon&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'end'}}>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Coupon Code</label>
                <input className="nx-input" style={{width:'100%',fontFamily:'monospace',fontWeight:700,letterSpacing:2,textTransform:'uppercase'}} value={form.coupon_code} onChange={e=>F('coupon_code',e.target.value.toUpperCase())} placeholder="SUMMER20"/>
              </div>
              <button className="btn-nx ghost sm" style={{height:38}} onClick={genCode}>Generate</button>
              <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Usage Limit</label><input className="nx-input" type="number" style={{width:'100%'}} value={form.usage_limit} onChange={e=>F('usage_limit',e.target.value)} placeholder="Unlimited"/></div>
            </div>
          )}
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Description</label><textarea className="nx-input" style={{width:'100%',height:56,resize:'none'}} value={form.description} onChange={e=>F('description',e.target.value)}/></div>
        </div>
        <div style={{padding:'16px 24px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
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

export default function Loyalty(){
  const [tab,setTab]=useState('members');
  const [showDisc,setShowDisc]=useState(false);
  const [showGC,setShowGC]=useState(false);
  const [editDisc,setEditDisc]=useState<any>(null);

  const {data:custData}=useQuery({queryKey:['customers'],queryFn:async()=>{const r=await api.get('/customers?limit=500');return r.data;}});
  const {data:discData,isLoading:discLoading}=useQuery({queryKey:['discounts'],queryFn:async()=>{const r=await api.get('/sales/discounts');return r.data;}});
  const [giftCards,setGiftCards]=useState<any[]>(()=>{try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return[];}});

  const customers:any[]=Array.isArray(custData)?custData:custData?.customers||custData?.data||[];
  const discounts:any[]=Array.isArray(discData)?discData:discData?.discounts||discData?.data||[];

  const tierCounts=TIER_CONFIG.reduce((acc,t)=>({...acc,[t.key]:customers.filter(c=>(c.loyalty_tier||'regular')===t.key).length}),{} as Record<string,number>);
  const totalPoints=customers.reduce((s,c)=>s+(c.loyalty_points||0),0);
  const activeCoupons=discounts.filter(d=>d.is_coupon&&(!d.valid_until||new Date(d.valid_until)>new Date())).length;
  const activePromos=discounts.filter(d=>!d.is_coupon&&(!d.valid_until||new Date(d.valid_until)>new Date())).length;

  const delGC=(id:string)=>{const n=giftCards.filter(g=>g.id!==id);sessionStorage.setItem('giftcards',JSON.stringify(n));setGiftCards(n);};

  const TYPE_LABEL:Record<string,string>={percentage:'% Off',fixed_amount:'SAR Off',buy_x_get_y:'Buy X Get Y',free_item:'Free Item'};

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
      {[['members','Members'],['discounts','Discounts & Coupons'],['tiers','Tier Settings'],['giftcards','Gift Cards']].map(([id,l])=>(
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
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button className="btn-nx primary sm" onClick={()=>{setEditDisc(null);setShowDisc(true);}}><i className="ti ti-plus"/> New Discount</button>
      </div>
      {discLoading?<div style={{padding:40,textAlign:'center',color:'var(--mu)'}}>Loading...</div>:discounts.length===0?<div className="nx-card" style={{textAlign:'center',padding:'48px 0',color:'var(--mu)'}}><i className="ti ti-tag" style={{fontSize:40,display:'block',marginBottom:8,opacity:.3}}/><p style={{fontWeight:600}}>No discounts yet</p></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {discounts.map((d:any)=>{
            const expired=d.valid_until&&new Date(d.valid_until)<new Date();
            return(<div key={d.id} className="nx-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:'var(--acg)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-tag" style={{fontSize:20,color:'var(--ac)'}}/></div>
                <span className={`nx-badge ${expired?'inactive':'active'}`}>{expired?'Expired':'Active'}</span>
              </div>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{d.name}</div>
              <div style={{fontSize:12,color:'var(--mu)',marginBottom:10}}>{d.description||TYPE_LABEL[d.type]||d.type}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,borderTop:'1px solid var(--bd)',paddingTop:10}}>
                <div><div style={{fontSize:10,color:'var(--mu)'}}>TYPE</div><div style={{fontWeight:600,fontSize:12}}>{TYPE_LABEL[d.type]||d.type}</div></div>
                <div><div style={{fontSize:10,color:'var(--mu)'}}>VALUE</div><div style={{fontWeight:600,fontSize:12}}>{d.type==='percentage'?d.value+'%':'SAR '+d.value}</div></div>
                {d.is_coupon&&<div style={{gridColumn:'1/3'}}><div style={{fontSize:10,color:'var(--mu)'}}>COUPON CODE</div><div style={{fontWeight:700,fontFamily:'monospace',fontSize:14,color:'var(--ac)',letterSpacing:1}}>{d.coupon_code}</div></div>}
                {d.valid_until&&<div style={{gridColumn:'1/3'}}><div style={{fontSize:10,color:'var(--mu)'}}>EXPIRES</div><div style={{fontWeight:600,fontSize:12}}>{new Date(d.valid_until).toLocaleDateString()}</div></div>}
                {d.min_order_amount>0&&<div><div style={{fontSize:10,color:'var(--mu)'}}>MIN ORDER</div><div style={{fontSize:12}}>SAR {d.min_order_amount}</div></div>}
                {d.usage_limit&&<div><div style={{fontSize:10,color:'var(--mu)'}}>LIMIT</div><div style={{fontSize:12}}>{d.usage_count||0}/{d.usage_limit}</div></div>}
              </div>
              <button className="btn-nx ghost sm" style={{marginTop:10,width:'100%',justifyContent:'center'}} onClick={()=>{setEditDisc(d);setShowDisc(true);}}><i className="ti ti-edit"/> Edit</button>
            </div>);
          })}
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
          <i className="ti ti-star" style={{fontSize:20,color:'#f59e0b'}}/><strong>10 points</strong><span style={{color:'var(--mu)'}}>= </span><strong>SAR 1.00</strong><span style={{color:'var(--mu)',marginLeft:'auto',fontSize:12}}>Min. 10 points to redeem</span>
        </div>
      </div>
    </div>)}

    {tab==='giftcards'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button className="btn-nx primary sm" onClick={()=>setShowGC(true)}><i className="ti ti-plus"/> Issue Gift Card</button>
      </div>
      {giftCards.length===0?<div className="nx-card" style={{textAlign:'center',padding:'48px 0',color:'var(--mu)'}}><i className="ti ti-gift" style={{fontSize:40,display:'block',marginBottom:8,opacity:.3}}/><p style={{fontWeight:600}}>No gift cards yet</p></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {giftCards.map((g:any)=>{
            const expired=g.expires&&new Date(g.expires)<new Date();
            return(<div key={g.id} className="nx-card" style={{background:'linear-gradient(135deg,var(--acg),var(--cd))'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <i className="ti ti-gift" style={{fontSize:24,color:'var(--ac)'}}/>
                <span className={`nx-badge ${expired?'inactive':g.balance>0?'active':'grey'}`}>{expired?'Expired':g.balance>0?'Active':'Used'}</span>
              </div>
              <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,letterSpacing:2,marginBottom:8}}>{g.code}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                <div><div style={{fontSize:10,color:'var(--mu)'}}>BALANCE</div><div style={{fontWeight:700,fontSize:18,color:'var(--ac)'}}>SAR {parseFloat(g.balance||0).toFixed(2)}</div></div>
                <div><div style={{fontSize:10,color:'var(--mu)'}}>EXPIRES</div><div style={{fontWeight:600,fontSize:12}}>{g.expires?new Date(g.expires).toLocaleDateString():'Never'}</div></div>
              </div>
              {g.recipient_name&&<div style={{fontSize:12,color:'var(--mu)',marginBottom:10}}><i className="ti ti-user" style={{marginRight:4}}/>{g.recipient_name}{g.recipient_email?' · '+g.recipient_email:''}</div>}
              <button className="btn-nx ghost sm" style={{color:'#ef4444',width:'100%',justifyContent:'center'}} onClick={()=>delGC(g.id)}><i className="ti ti-trash"/> Delete</button>
            </div>);
          })}
        </div>
      )}
    </div>)}

    {showDisc&&<DiscountModal disc={editDisc} onClose={()=>setShowDisc(false)}/>}
    {showGC&&<GiftCardModal onClose={()=>{setShowGC(false);setGiftCards(JSON.parse(sessionStorage.getItem('giftcards')||'[]'));}}/>}
  </div>);
}
