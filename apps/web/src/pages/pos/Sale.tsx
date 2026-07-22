import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; category:string; }
const METHODS=['Cash','Card','Tabby','Tamara','Apple Pay','Mada'];
const TIER_RATE:Record<string,number>={bronze:1/5,silver:1/4,gold:1/3,platinum:1/2};
const TIER_C:Record<string,string>={bronze:'#cd7f32',silver:'#c0c0c0',gold:'#f59e0b',platinum:'#6366f1'};
const BG_COLORS=['#fff0f6','#f0f4ff','#f0fff4','#fffbf0','#f5f0ff','#f0fffa','#fffff0','#f0f8ff'];
const CAT_ICONS:Record<string,string>={'Abayas':'ti-shirt','Dresses':'ti-shirt','Tops':'ti-shirt','Bags':'ti-briefcase','Shoes':'ti-shoe','Accessories':'ti-diamond','Perfumes':'ti-bottle','Kids':'ti-baby-carriage','Sale':'ti-tag','Men':'ti-man','Women':'ti-woman','default':'ti-hanger'};

const getStoredCoupons=()=>{try{return JSON.parse(sessionStorage.getItem('coupons')||'[]');}catch{return[];}};
const getStoredGiftCards=()=>{try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return[];}};
const getStoredPromos=()=>{try{return JSON.parse(sessionStorage.getItem('localPromos')||'[]');}catch{return[];}};
const getWalletBalance=(c:any)=>{if(!c)return 0;try{const ws=JSON.parse(sessionStorage.getItem('wallets')||'[]');const w=ws.find((w:any)=>w.customer===c.name);return w?w.balance:parseFloat(c?.wallet_balance||0);}catch{return 0;}};

function Clock(){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  return <span>{t.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>;
}

export default function POSSale(){
  const {toast}=useToast();
  const qc=useQueryClient();
  const [search,setSearch]=useState('');
  const [cart,setCart]=useState<CartItem[]>([]);
  const [method,setMethod]=useState('Cash');
  const [custId,setCustId]=useState('');
  const [discType,setDiscType]=useState<'pct'|'flat'>('pct');
  const [discVal,setDiscVal]=useState('');
  const [receipt,setReceipt]=useState<any>(null);
  const [showPayModal,setShowPayModal]=useState(false);
  const [showCustModal,setShowCustModal]=useState(false);
  const [custSearch,setCustSearch]=useState('');
  const [catFilter,setCatFilter]=useState('');
  const [couponInput,setCouponInput]=useState('');
  const [appliedCoupon,setAppliedCoupon]=useState<any>(null);
  const [gcInput,setGcInput]=useState('');
  const [appliedGC,setAppliedGC]=useState<any>(null);
  const [useWallet,setUseWallet]=useState(false);
  const [redeemPts,setRedeemPts]=useState(false);
  const [autoPromo,setAutoPromo]=useState<any>(null);
  const [cashGiven,setCashGiven]=useState('');
  const [orderNote,setOrderNote]=useState('');

  const {data:products=[]}=useQuery({queryKey:['products'],queryFn:()=>api.get('/catalog/products').then(r=>r.data)});
  const {data:warehouses=[]}=useQuery<any[]>({queryKey:['warehouses'],queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:customers=[]}=useQuery({queryKey:['customers'],queryFn:()=>api.get('/customers').then(r=>r.data)});
  const {data:categories=[]}=useQuery({queryKey:['categories'],queryFn:()=>api.get('/catalog/categories').then(r=>r.data).catch(()=>[])});

  const customer=(customers as any[]).find((c:any)=>c.id===custId);
  const tier=customer?.loyalty_tier||'bronze';
  const custPoints=customer?.loyalty_points||0;
  const walletBal=getWalletBalance(customer);
  const defaultWarehouseId=(warehouses as any[])[0]?.id??null;

  const allVariants=(products as any[]).flatMap((p:any)=>(p.variants||[]).map((v:any)=>({...v,productName:p.name,categoryId:p.category_id,categoryName:(categories as any[]).find((c:any)=>c.id===p.category_id)?.name||''})));
  const filteredVariants=allVariants.filter(v=>(!search||v.productName?.toLowerCase().includes(search.toLowerCase())||v.sku?.toLowerCase().includes(search.toLowerCase()))&&(!catFilter||v.categoryId===catFilter));

  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const manualDisc=discType==='pct'?Math.min(sub*(parseFloat(discVal||'0')/100),sub):Math.min(parseFloat(discVal||'0'),sub);
  const couponDisc=appliedCoupon?(appliedCoupon.type==='percentage'?Math.min(sub*appliedCoupon.value/100,sub):Math.min(appliedCoupon.value,sub)):0;
  const promoDisc=autoPromo&&!appliedCoupon?Math.min(sub*autoPromo.discount_value/100,sub):0;
  const totalDisc=manualDisc+couponDisc+promoDisc;
  const taxable=Math.max(sub-totalDisc,0);
  const tax=taxable*0.15;
  const gross=taxable+tax;
  const walletUsed=useWallet?Math.min(walletBal,gross):0;
  const gcUsed=appliedGC?Math.min(appliedGC.balance,gross-walletUsed):0;
  const ptsVal=redeemPts&&custPoints>0?Math.min(custPoints*0.1,gross-walletUsed-gcUsed):0;
  const ptsUsed=Math.ceil(ptsVal/0.1);
  const cashDue=Math.max(gross-walletUsed-gcUsed-ptsVal,0);
  const change=parseFloat(cashGiven||'0')-cashDue;
  const ptsEarned=customer?Math.floor(cashDue*(TIER_RATE[tier]||0.2)):0;

  useEffect(()=>{
    if(!cart.length){setAutoPromo(null);return;}
    const p=getStoredPromos().filter((p:any)=>p.is_active&&p.discount_type==='percentage'&&p.discount_value>0);
    setAutoPromo(p.sort((a:any,b:any)=>b.discount_value-a.discount_value)[0]||null);
  },[cart.length]);

  const addToCart=(v:any)=>setCart(prev=>{const ex=prev.find(i=>i.id===v.id);if(ex)return prev.map(i=>i.id===v.id?{...i,qty:i.qty+1}:i);return [...prev,{id:v.id,sku:v.sku||'',name:`${v.productName}${v.name&&v.name!=='Default'?' · '+v.name:''}`,price:parseFloat(v.selling_price||0),qty:1,category:v.categoryName||''}];});
  const setQty=(id:string,qty:number)=>{if(qty<=0)setCart(p=>p.filter(i=>i.id!==id));else setCart(p=>p.map(i=>i.id===id?{...i,qty}:i));};
  const cartQty=(id:string)=>cart.find(i=>i.id===id)?.qty||0;

  const applyCoupon=()=>{const f=getStoredCoupons().find((c:any)=>c.code===couponInput.toUpperCase()&&c.is_active&&(!c.expires||new Date(c.expires)>new Date())&&(!c.usage_limit||c.used<c.usage_limit));if(!f){toast('Invalid or expired coupon','error');return;}if(f.min_purchase>0&&sub<f.min_purchase){toast(`Min SAR ${f.min_purchase} required`,'error');return;}setAppliedCoupon(f);setCouponInput('');toast('Coupon applied!','success');};
  const applyGC=()=>{const f=getStoredGiftCards().find((g:any)=>g.code===gcInput.toUpperCase()&&g.is_active&&g.balance>0&&new Date(g.expires)>new Date());if(!f){toast('Invalid gift card','error');return;}setAppliedGC(f);setGcInput('');toast('Gift card applied!','success');};

  const resetSale=()=>{setCart([]);setDiscVal('');setCustId('');setAppliedCoupon(null);setAppliedGC(null);setUseWallet(false);setRedeemPts(false);setAutoPromo(null);setCashGiven('');setOrderNote('');setShowPayModal(false);};

  const chargeMut=useMutation({
    mutationFn:async()=>{
      const body:any={customer_id:custId||null,lines:cart.map(i=>({variant_id:i.id,quantity:i.qty,unit_price:i.price,discount_amount:0})),subtotal:sub,tax_amount:tax,discount_amount:totalDisc,total:gross,notes:orderNote||undefined};
      if(defaultWarehouseId)body.warehouse_id=defaultWarehouseId;
      const order=await api.post('/sales/orders',body);
      const payments:any[]=[];
      if(gcUsed>0)payments.push({method:'gift_card',amount:gcUsed,reference:appliedGC?.code});
      if(walletUsed>0)payments.push({method:'wallet',amount:walletUsed});
      if(ptsVal>0)payments.push({method:'loyalty_points',amount:ptsVal,reference:ptsUsed+' pts'});
      if(cashDue>0)payments.push({method:method.toLowerCase().replace(/ /g,'_'),amount:cashDue});
      await api.post('/sales/payments',{order_id:order.data.id,payments});
      if(appliedGC&&gcUsed>0){const gcs=getStoredGiftCards().map((g:any)=>g.id===appliedGC.id?{...g,balance:Math.max(g.balance-gcUsed,0)}:g);try{sessionStorage.setItem('giftcards',JSON.stringify(gcs));}catch{}}
      return order.data;
    },
    onSuccess:d=>{
      toast(`✅ Order #${d.order_number} complete`,'success');
      qc.invalidateQueries({queryKey:['dashboard']});qc.invalidateQueries({queryKey:['orders']});
      setReceipt({...d,_cashDue:cashDue,_change:change>0?change:0,_method:method,_gcUsed:gcUsed,_walletUsed:walletUsed,_ptsUsed:ptsUsed,_ptsEarned:ptsEarned,_totalDisc:totalDisc,_note:orderNote});
      resetSale();
    },
    onError:e=>toast(getErr(e),'error')
  });

  // ── RECEIPT ──────────────────────────────────────────────────
  if(receipt) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'linear-gradient(135deg,#667eea22,#764ba222)'}}>
      <div style={{background:'#fff',borderRadius:24,padding:44,maxWidth:440,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,.15)',textAlign:'center'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 16px'}}>✅</div>
        <div style={{fontSize:24,fontWeight:800,marginBottom:4}}>Payment Complete!</div>
        <div style={{fontSize:13,color:'#9ca3af',marginBottom:24}}>Order #{receipt.order_number} · {receipt._method}</div>
        <div style={{background:'#f8fafc',borderRadius:16,padding:20,marginBottom:20,textAlign:'left'}}>
          {receipt._totalDisc>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8,padding:'6px 0',borderBottom:'1px dashed #e5e7eb'}}><span style={{color:'#6b7280'}}>Discount</span><span style={{color:'#ef4444',fontWeight:700}}>− SAR {receipt._totalDisc.toFixed(2)}</span></div>}
          {receipt._gcUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}><span style={{color:'#6b7280'}}>Gift card</span><span style={{color:'#10b981',fontWeight:700}}>− SAR {receipt._gcUsed.toFixed(2)}</span></div>}
          {receipt._walletUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}><span style={{color:'#6b7280'}}>Wallet</span><span style={{color:'#10b981',fontWeight:700}}>− SAR {receipt._walletUsed.toFixed(2)}</span></div>}
          {receipt._ptsUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}><span style={{color:'#6b7280'}}>Points redeemed</span><span style={{color:'#10b981',fontWeight:700}}>− SAR {(receipt._ptsUsed*0.1).toFixed(2)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'2px solid #e5e7eb'}}>
            <span style={{fontWeight:700,fontSize:16}}>Total Charged</span>
            <span style={{fontWeight:900,fontSize:28,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>SAR {receipt._cashDue?.toFixed(2)}</span>
          </div>
          {receipt._change>0&&<div style={{display:'flex',justifyContent:'space-between',marginTop:10,padding:'8px 12px',background:'#f0fdf4',borderRadius:8}}><span style={{color:'#15803d',fontWeight:600}}>Change due</span><span style={{color:'#15803d',fontWeight:800}}>SAR {receipt._change.toFixed(2)}</span></div>}
        </div>
        {receipt._ptsEarned>0&&<div style={{padding:'10px 16px',background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'1px solid #fde68a',borderRadius:12,marginBottom:16,fontSize:13,fontWeight:700,color:'#92400e'}}>⭐ +{receipt._ptsEarned} loyalty points earned!</div>}
        <div style={{display:'flex',gap:12}}>
          <button onClick={()=>{const w=window.open('','_blank','width=380,height=580');if(!w)return;w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;padding:20px;font-size:12px}h2{text-align:center;font-size:15px;margin-bottom:2px}.c{text-align:center;color:#888;font-size:10px;margin-bottom:10px}.l{border-top:1px dashed #999;margin:8px 0}.r{display:flex;justify-content:space-between;margin-bottom:4px}.big{font-size:20px;font-weight:bold}</style></head><body><h2>NuxFashion</h2><p class="c">KSA · ZATCA Compliant Invoice</p><div class="l"></div><div class="r"><span>Order</span><span>#${receipt.order_number}</span></div><div class="r"><span>Method</span><span>${receipt._method}</span></div><div class="r"><span>Date</span><span>${new Date().toLocaleDateString('en-SA')}</span></div><div class="l"></div>${receipt._totalDisc>0?`<div class="r"><span>Discount</span><span style="color:red">-SAR ${receipt._totalDisc.toFixed(2)}</span></div>`:''}<div class="l"></div><div class="r big"><span>TOTAL</span><span>SAR ${receipt._cashDue?.toFixed(2)}</span></div>${receipt._change>0?`<div class="r" style="color:green"><span>Change</span><span>SAR ${receipt._change.toFixed(2)}</span></div>`:''}<div class="l"></div><div class="c">Thank you for shopping at NuxFashion!</div></body></html>`);w.document.close();w.print();}}
            style={{flex:1,padding:'12px 0',border:'2px solid #e5e7eb',borderRadius:12,background:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,color:'#374151'}}>
            🖨 Print
          </button>
          <button onClick={()=>setReceipt(null)}
            style={{flex:1,padding:'12px 0',border:'none',borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>
            + New Sale
          </button>
        </div>
      </div>
    </div>
  );

  // ── CUSTOMER MODAL ───────────────────────────────────────────
  const filteredCustomers=(customers as any[]).filter((c:any)=>!custSearch||c.name?.toLowerCase().includes(custSearch.toLowerCase())||c.phone?.includes(custSearch));

  return (
    <div style={{display:'flex',height:'100%',background:'#f1f5f9',overflow:'hidden'}}>

      {/* Customer modal */}
      {showCustModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>{setShowCustModal(false);setCustSearch('');}}>
          <div style={{background:'#fff',borderRadius:20,width:480,maxHeight:'75vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.25)'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,borderRadius:10,background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-users" style={{fontSize:18,color:'#6366f1'}}/></div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>Select Customer</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>{(customers as any[]).length} customers</div>
              </div>
              <button onClick={()=>{setShowCustModal(false);setCustSearch('');}} style={{width:32,height:32,borderRadius:'50%',border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:18,color:'#6b7280'}}>×</button>
            </div>
            <div style={{padding:'12px 20px',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:12}}>
                <i className="ti ti-search" style={{fontSize:16,color:'#9ca3af'}}/>
                <input autoFocus value={custSearch} onChange={e=>setCustSearch(e.target.value)} placeholder="Search by name or phone…"
                  style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:14}}/>
              </div>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              <div onClick={()=>{setCustId('');setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}}
                style={{padding:'14px 20px',cursor:'pointer',borderBottom:'1px solid #f8fafc',display:'flex',alignItems:'center',gap:12}}
                onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <div style={{width:44,height:44,borderRadius:12,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>👤</div>
                <div><div style={{fontWeight:600,fontSize:14}}>Walk-in Customer</div><div style={{fontSize:12,color:'#9ca3af'}}>No loyalty points</div></div>
              </div>
              {filteredCustomers.map((c:any)=>(
                <div key={c.id} onClick={()=>{setCustId(c.id);setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}}
                  style={{padding:'12px 20px',cursor:'pointer',borderBottom:'1px solid #f8fafc',display:'flex',alignItems:'center',gap:12}}
                  onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff'}}>{c.name.slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{c.name}</div>
                    <div style={{fontSize:12,color:'#9ca3af'}}>{c.phone||c.email||'—'} · {(c.loyalty_points||0).toLocaleString()} pts</div>
                  </div>
                  <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:TIER_C[c.loyalty_tier||'bronze']+'22',color:TIER_C[c.loyalty_tier||'bronze'],fontWeight:700,textTransform:'capitalize',border:`1px solid ${TIER_C[c.loyalty_tier||'bronze']}44`}}>{c.loyalty_tier||'Bronze'}</span>
                </div>
              ))}
              {!filteredCustomers.length&&custSearch&&<div style={{padding:32,textAlign:'center',color:'#9ca3af',fontSize:13}}>No customers match "{custSearch}"</div>}
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowPayModal(false)}>
          <div style={{background:'#fff',borderRadius:24,width:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
            {/* Modal header */}
            <div style={{padding:'20px 24px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:'24px 24px 0 0',color:'#fff'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:13,opacity:.8,marginBottom:4}}>Total to collect</div>
                  <div style={{fontSize:36,fontWeight:900,letterSpacing:-1}}>SAR {cashDue.toFixed(2)}</div>
                </div>
                <button onClick={()=>setShowPayModal(false)} style={{width:36,height:36,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.2)',color:'#fff',cursor:'pointer',fontSize:20}}>×</button>
              </div>
            </div>
            <div style={{padding:24,display:'flex',flexDirection:'column',gap:20}}>
              {/* Payment method */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:1,marginBottom:10}}>PAYMENT METHOD</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {METHODS.map(m=>(
                    <button key={m} onClick={()=>setMethod(m)} style={{padding:'12px 8px',borderRadius:12,border:`2px solid ${method===m?'#6366f1':'#e5e7eb'}`,background:method===m?'#f0f4ff':'#fff',color:method===m?'#6366f1':'#6b7280',fontWeight:method===m?700:500,cursor:'pointer',fontSize:13,transition:'all .15s'}}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Coupon */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:1,marginBottom:10}}>COUPON / PROMO CODE</div>
                {appliedCoupon?(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:12}}>
                    <div><div style={{fontWeight:700,color:'#15803d',fontSize:14}}>{appliedCoupon.code}</div><div style={{fontSize:12,color:'#16a34a'}}>{appliedCoupon.type==='percentage'?appliedCoupon.value+'%':'SAR '+appliedCoupon.value} discount applied</div></div>
                    <button onClick={()=>setAppliedCoupon(null)} style={{width:28,height:28,borderRadius:'50%',border:'none',background:'#fca5a5',color:'#991b1b',cursor:'pointer',fontWeight:700}}>×</button>
                  </div>
                ):(
                  <div style={{display:'flex',gap:10}}>
                    <input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Enter code…" onKeyDown={e=>e.key==='Enter'&&applyCoupon()}
                      style={{flex:1,padding:'11px 14px',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:14,fontFamily:'monospace',fontWeight:700,letterSpacing:2,outline:'none'}}/>
                    <button onClick={applyCoupon} disabled={!couponInput} style={{padding:'11px 20px',borderRadius:12,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700}}>Apply</button>
                  </div>
                )}
              </div>
              {/* Gift card */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:1,marginBottom:10}}>GIFT CARD</div>
                {appliedGC?(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:12}}>
                    <div><div style={{fontWeight:700,color:'#15803d',fontSize:14}}>{appliedGC.code}</div><div style={{fontSize:12,color:'#16a34a'}}>Using SAR {gcUsed.toFixed(2)} of SAR {appliedGC.balance}</div></div>
                    <button onClick={()=>setAppliedGC(null)} style={{width:28,height:28,borderRadius:'50%',border:'none',background:'#fca5a5',color:'#991b1b',cursor:'pointer',fontWeight:700}}>×</button>
                  </div>
                ):(
                  <div style={{display:'flex',gap:10}}>
                    <input value={gcInput} onChange={e=>setGcInput(e.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX" onKeyDown={e=>e.key==='Enter'&&applyGC()}
                      style={{flex:1,padding:'11px 14px',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:13,fontFamily:'monospace',fontWeight:700,letterSpacing:2,outline:'none'}}/>
                    <button onClick={applyGC} disabled={!gcInput} style={{padding:'11px 20px',borderRadius:12,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700}}>Apply</button>
                  </div>
                )}
              </div>
              {/* Wallet + Points */}
              {customer&&(walletBal>0||custPoints>=10)&&(
                <div style={{display:'flex',gap:10}}>
                  {walletBal>0&&<label style={{flex:1,display:'flex',alignItems:'center',gap:10,padding:'12px 14px',border:'1.5px solid #e5e7eb',borderRadius:12,cursor:'pointer',background:useWallet?'#f0fdf4':'#fff',borderColor:useWallet?'#86efac':'#e5e7eb',transition:'all .15s'}}>
                    <input type="checkbox" checked={useWallet} onChange={e=>setUseWallet(e.target.checked)} style={{width:16,height:16,accentColor:'#6366f1'}}/>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>Wallet</div><div style={{fontSize:11,color:'#9ca3af'}}>SAR {walletBal.toFixed(2)} available</div></div>
                    {useWallet&&<span style={{fontWeight:700,color:'#15803d',fontSize:13}}>−{walletUsed.toFixed(2)}</span>}
                  </label>}
                  {custPoints>=10&&<label style={{flex:1,display:'flex',alignItems:'center',gap:10,padding:'12px 14px',border:'1.5px solid #e5e7eb',borderRadius:12,cursor:'pointer',background:redeemPts?'#fffbf0':'#fff',borderColor:redeemPts?'#fde68a':'#e5e7eb',transition:'all .15s'}}>
                    <input type="checkbox" checked={redeemPts} onChange={e=>setRedeemPts(e.target.checked)} style={{width:16,height:16,accentColor:'#f59e0b'}}/>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>Points</div><div style={{fontSize:11,color:'#9ca3af'}}>{custPoints.toLocaleString()} pts available</div></div>
                    {redeemPts&&<span style={{fontWeight:700,color:'#92400e',fontSize:13}}>−{ptsVal.toFixed(2)}</span>}
                  </label>}
                </div>
              )}
              {/* Cash calc */}
              {method==='Cash'&&cashDue>0&&(
                <div style={{padding:16,background:'#f8fafc',borderRadius:16,border:'1.5px solid #e2e8f0'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:1,marginBottom:10}}>CASH RECEIVED</div>
                  <input type="number" value={cashGiven} onChange={e=>setCashGiven(e.target.value)} placeholder={cashDue.toFixed(2)}
                    style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:12,fontSize:18,fontWeight:700,boxSizing:'border-box',marginBottom:10,outline:'none'}}/>
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    {[50,100,200,500].map(a=><button key={a} onClick={()=>setCashGiven(String(a))} style={{flex:1,padding:'8px 4px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#fff',cursor:'pointer',fontWeight:700,fontSize:14}}>{a}</button>)}
                    <button onClick={()=>setCashGiven(String(Math.ceil(cashDue/10)*10))} style={{flex:1,padding:'8px 4px',borderRadius:10,border:'1.5px solid #6366f1',background:'#f0f4ff',color:'#6366f1',cursor:'pointer',fontWeight:700,fontSize:12}}>Exact+</button>
                  </div>
                  {change>0&&<div style={{padding:'10px 14px',background:'#f0fdf4',borderRadius:10,display:'flex',justifyContent:'space-between',fontWeight:700,color:'#15803d'}}><span>Change</span><span>SAR {change.toFixed(2)}</span></div>}
                  {cashGiven&&parseFloat(cashGiven)<cashDue&&<div style={{marginTop:6,fontSize:13,color:'#ef4444',fontWeight:600}}>⚠ Short SAR {(cashDue-parseFloat(cashGiven)).toFixed(2)}</div>}
                </div>
              )}
              {/* Note */}
              <input value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="📝 Order note (optional)…"
                style={{padding:'11px 14px',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:13,background:'#f8fafc',outline:'none'}}/>
              {/* Charge */}
              <button disabled={!cart.length||chargeMut.isPending} onClick={()=>chargeMut.mutate()}
                style={{padding:'18px 0',borderRadius:16,background:!cart.length?'#e5e7eb':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',cursor:!cart.length?'not-allowed':'pointer',fontSize:17,fontWeight:800,letterSpacing:.3,boxShadow:cart.length?'0 8px 24px rgba(99,102,241,.4)':'none',transition:'all .2s'}}>
                {chargeMut.isPending?'Processing…':`✓  Charge SAR ${cashDue.toFixed(2)}`}
              </button>
              <div style={{textAlign:'center',fontSize:11,color:'#9ca3af'}}><i className="ti ti-shield-check" style={{marginRight:4}}/>ZATCA e-invoice auto-generated</div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT: Category sidebar ─────────────────────────────── */}
      <div style={{width:72,background:'#fff',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:12,gap:4,overflowY:'auto',flexShrink:0,borderRight:'1px solid #e2e8f0'}}>
        <button onClick={()=>setCatFilter('')} style={{width:56,padding:'10px 0',borderRadius:14,border:'none',background:catFilter===''?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#f1f5f9',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,marginBottom:4,transition:'all .15s'}}>
          <i className="ti ti-layout-grid" style={{fontSize:20,color:catFilter===''?'#fff':'#6b7280'}}/>
          <span style={{fontSize:8,fontWeight:700,color:catFilter===''?'#fff':'#6b7280',letterSpacing:.3}}>ALL</span>
        </button>
        {(categories as any[]).map((cat:any,i:number)=>{
          const active=catFilter===cat.id;
          return(
            <button key={cat.id} onClick={()=>setCatFilter(active?'':cat.id)} style={{width:56,padding:'10px 0',borderRadius:14,border:'none',background:active?'linear-gradient(135deg,#6366f1,#8b5cf6)':BG_COLORS[i%BG_COLORS.length],cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all .15s'}}>
              <i className={'ti '+(CAT_ICONS[cat.name]||'ti-hanger')} style={{fontSize:18,color:active?'#fff':'#6b7280'}}/>
              <span style={{fontSize:8,fontWeight:700,color:active?'#fff':'#6b7280',letterSpacing:.3,maxWidth:52,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'center'}}>{cat.name.toUpperCase().slice(0,6)}</span>
            </button>
          );
        })}
      </div>

      {/* ── CENTER: Products ────────────────────────────────────── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Search bar */}
        <div style={{padding:'10px 14px',background:'#fff',borderBottom:'1px solid #e2e8f0',display:'flex',gap:10,alignItems:'center'}}>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:14}}>
            <i className="ti ti-barcode" style={{fontSize:18,color:'#9ca3af'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or scan barcode…" autoFocus
              style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:14}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:20,lineHeight:1}}>×</button>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:12,fontSize:13,color:'#6b7280'}}>
            <i className="ti ti-clock" style={{fontSize:14,color:'#6366f1'}}/>
            <Clock/>
          </div>
          <span style={{fontSize:12,color:'#9ca3af'}}>{filteredVariants.length} items</span>
        </div>
        {/* Grid */}
        <div style={{flex:1,overflowY:'auto',padding:14}}>
          {filteredVariants.length===0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#d1d5db',gap:12}}><i className="ti ti-mood-empty" style={{fontSize:56}}/><div style={{fontWeight:600,fontSize:16}}>No products found</div></div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14}}>
            {filteredVariants.map((v:any,i:number)=>{
              const qty=cartQty(v.id);
              const inCart=qty>0;
              return(
                <div key={v.id} onClick={()=>addToCart(v)}
                  style={{background:'#fff',borderRadius:18,overflow:'hidden',cursor:'pointer',border:`2px solid ${inCart?'#6366f1':'transparent'}`,boxShadow:inCart?'0 0 0 4px rgba(99,102,241,.12), 0 4px 16px rgba(0,0,0,.08)':'0 2px 8px rgba(0,0,0,.06)',transition:'all .2s',position:'relative'}}>
                  {inCart&&<div style={{position:'absolute',top:10,right:10,width:26,height:26,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',zIndex:1,boxShadow:'0 2px 8px rgba(99,102,241,.4)'}}>{qty}</div>}
                  {/* Product image area */}
                  <div style={{height:120,background:BG_COLORS[i%BG_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    <i className={'ti '+(CAT_ICONS[v.categoryName]||'ti-hanger')} style={{fontSize:48,color:'rgba(0,0,0,.12)'}}/>
                    {inCart&&<div style={{position:'absolute',inset:0,background:'rgba(99,102,241,.06)'}}/>}
                  </div>
                  <div style={{padding:'10px 12px 12px'}}>
                    <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,letterSpacing:.5,marginBottom:3}}>{v.categoryName?.toUpperCase()}</div>
                    <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:8,color:'#1e293b'}}>{v.productName}{v.name&&v.name!=='Default'?<span style={{fontWeight:400,color:'#94a3b8'}}> · {v.name}</span>:''}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontWeight:800,fontSize:15,color:'#1e293b'}}>SAR {parseFloat(v.selling_price||0).toFixed(0)}</span>
                      {inCart?(
                        <div style={{display:'flex',alignItems:'center',gap:6}} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setQty(v.id,qty-1)} style={{width:26,height:26,borderRadius:'50%',border:'1.5px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#6b7280'}}>−</button>
                          <span style={{fontWeight:800,fontSize:14,minWidth:18,textAlign:'center',color:'#6366f1'}}>{qty}</span>
                          <button onClick={()=>setQty(v.id,qty+1)} style={{width:26,height:26,borderRadius:'50%',border:'none',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
                        </div>
                      ):(
                        <span style={{fontSize:11,padding:'4px 10px',borderRadius:20,background:'#f0f4ff',color:'#6366f1',fontWeight:700}}>+ Add</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Order panel ─────────────────────────────────── */}
      <div style={{width:400,background:'#fff',display:'flex',flexDirection:'column',borderLeft:'1px solid #e2e8f0',flexShrink:0}}>
        {/* Customer */}
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9'}}>
          <button onClick={()=>setShowCustModal(true)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'10px 14px',border:`2px solid ${custId?'#6366f1':'#e2e8f0'}`,borderRadius:14,background:custId?'#f0f4ff':'#f8fafc',cursor:'pointer',transition:'all .15s'}}>
            <div style={{width:40,height:40,borderRadius:12,background:custId?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:custId?14:18,fontWeight:800,color:'#fff',flexShrink:0}}>
              {custId?customer?.name.slice(0,2).toUpperCase():<i className="ti ti-user-search" style={{fontSize:18,color:'#94a3b8'}}/>}
            </div>
            <div style={{flex:1,textAlign:'left'}}>
              <div style={{fontWeight:700,fontSize:13,color:custId?'#6366f1':'#374151'}}>{customer?customer.name:'Select Customer'}</div>
              {customer&&<div style={{fontSize:11,color:'#9ca3af'}}>{custPoints.toLocaleString()} pts · SAR {walletBal.toFixed(2)} wallet · <span style={{color:TIER_C[tier],fontWeight:700,textTransform:'capitalize'}}>{tier}</span></div>}
            </div>
            {custId&&<span onClick={e=>{e.stopPropagation();setCustId('');setUseWallet(false);setRedeemPts(false);}} style={{color:'#9ca3af',fontSize:20,cursor:'pointer',padding:4}}>×</span>}
          </button>
        </div>

        {/* Cart header */}
        <div style={{padding:'10px 16px 6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:800,fontSize:15,color:'#1e293b'}}>Order List</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {cart.length>0&&<span style={{fontSize:12,padding:'3px 10px',borderRadius:20,background:'#f0f4ff',color:'#6366f1',fontWeight:700}}>{cart.reduce((s,i)=>s+i.qty,0)} items</span>}
            {cart.length>0&&<button onClick={()=>setCart([])} style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'#fef2f2',color:'#ef4444',fontWeight:700,border:'none',cursor:'pointer'}}>Clear</button>}
          </div>
        </div>

        {/* Auto promo */}
        {autoPromo&&!appliedCoupon&&(
          <div style={{margin:'0 16px 6px',padding:'8px 12px',background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1px solid #86efac',borderRadius:12,display:'flex',justifyContent:'space-between',fontSize:12}}>
            <span style={{color:'#15803d',fontWeight:700}}>🏷 {autoPromo.name} — {autoPromo.discount_value}% off auto-applied</span>
            <span style={{fontWeight:800,color:'#15803d'}}>−SAR {promoDisc.toFixed(2)}</span>
          </div>
        )}

        {/* Cart items */}
        <div style={{flex:1,overflowY:'auto'}}>
          {cart.length===0?(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,color:'#cbd5e1'}}>
              <i className="ti ti-shopping-cart" style={{fontSize:56}}/>
              <div style={{fontWeight:700,fontSize:14}}>Cart is empty</div>
              <div style={{fontSize:12}}>Click a product to add</div>
            </div>
          ):cart.map((item,i)=>(
            <div key={item.id} style={{padding:'12px 16px',borderBottom:'1px solid #f8fafc',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:38,height:38,borderRadius:10,background:BG_COLORS[i%BG_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className={'ti '+(CAT_ICONS[item.category]||'ti-hanger')} style={{fontSize:18,color:'rgba(0,0,0,.2)'}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#1e293b'}}>{item.name}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>SAR {item.price.toFixed(2)} each</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <button onClick={()=>setQty(item.id,item.qty-1)} style={{width:26,height:26,borderRadius:'50%',border:'1.5px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#6b7280'}}>−</button>
                <span style={{fontWeight:800,fontSize:14,minWidth:20,textAlign:'center',color:'#6366f1'}}>{item.qty}</span>
                <button onClick={()=>setQty(item.id,item.qty+1)} style={{width:26,height:26,borderRadius:'50%',border:'none',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
              </div>
              <div style={{minWidth:72,textAlign:'right'}}>
                <div style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>SAR {(item.price*item.qty).toFixed(2)}</div>
                <button onClick={()=>setQty(item.id,0)} style={{background:'none',border:'none',cursor:'pointer',color:'#fca5a5',fontSize:11,padding:0,fontWeight:600}}>remove</button>
              </div>
            </div>
          ))}
        </div>

        {/* Discount section */}
        {cart.length>0&&(
          <div style={{padding:'12px 16px',borderTop:'1px solid #f1f5f9',background:'#fafbfc'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:1,marginBottom:8}}>DISCOUNT</div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:2,gap:2}}>
                {(['pct','flat'] as const).map(t=>(
                  <button key={t} onClick={()=>setDiscType(t)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:discType===t?'#fff':'transparent',cursor:'pointer',fontSize:12,fontWeight:700,color:discType===t?'#6366f1':'#9ca3af',boxShadow:discType===t?'0 1px 4px rgba(0,0,0,.1)':'none',transition:'all .15s'}}>
                    {t==='pct'?'%':'SAR'}
                  </button>
                ))}
              </div>
              <div style={{flex:1,display:'flex',alignItems:'center',border:'1.5px solid #e2e8f0',borderRadius:10,overflow:'hidden',background:'#fff'}}>
                <span style={{padding:'0 10px',fontSize:13,fontWeight:700,color:'#9ca3af'}}>{discType==='pct'?'%':'SAR'}</span>
                <input type="number" value={discVal} onChange={e=>setDiscVal(e.target.value)} placeholder="0" min="0"
                  style={{flex:1,border:'none',outline:'none',padding:'9px 8px',fontSize:15,fontWeight:700,color:'#1e293b',background:'transparent'}}/>
                {discVal&&<button onClick={()=>setDiscVal('')} style={{padding:'0 10px',background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16}}>×</button>}
              </div>
              {manualDisc>0&&<span style={{fontSize:13,fontWeight:700,color:'#ef4444',whiteSpace:'nowrap'}}>−SAR {manualDisc.toFixed(2)}</span>}
            </div>
          </div>
        )}

        {/* Coupon / Gift Card / Wallet */}
        {cart.length>0&&(
          <div style={{padding:'10px 16px',borderTop:'1px solid #f1f5f9',background:'#fafbfc',display:'flex',flexDirection:'column',gap:8}}>
            {/* Coupon */}
            {appliedCoupon?(
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:12}}>
                <div><div style={{fontWeight:700,color:'#15803d',fontSize:12}}><i className="ti ti-ticket" style={{marginRight:5}}/>{appliedCoupon.code}</div><div style={{fontSize:11,color:'#16a34a'}}>{appliedCoupon.type==='percentage'?appliedCoupon.value+'%':'SAR '+appliedCoupon.value} off</div></div>
                <button onClick={()=>setAppliedCoupon(null)} style={{width:24,height:24,borderRadius:'50%',border:'none',background:'#fca5a5',color:'#991b1b',cursor:'pointer',fontWeight:700,fontSize:13}}>×</button>
              </div>
            ):(
              <div style={{display:'flex',gap:6}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'7px 10px',background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:10}}>
                  <i className="ti ti-ticket" style={{fontSize:14,color:'#9ca3af'}}/>
                  <input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code…" onKeyDown={e=>e.key==='Enter'&&applyCoupon()}
                    style={{border:'none',outline:'none',flex:1,fontSize:12,fontFamily:'monospace',fontWeight:700,letterSpacing:1,background:'transparent'}}/>
                </div>
                <button onClick={applyCoupon} disabled={!couponInput} style={{padding:'7px 14px',borderRadius:10,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,opacity:couponInput?1:.4}}>Apply</button>
              </div>
            )}
            {/* Gift card */}
            {appliedGC?(
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:12}}>
                <div><div style={{fontWeight:700,color:'#15803d',fontSize:12}}><i className="ti ti-gift" style={{marginRight:5}}/>{appliedGC.code}</div><div style={{fontSize:11,color:'#16a34a'}}>SAR {gcUsed.toFixed(2)} applied</div></div>
                <button onClick={()=>setAppliedGC(null)} style={{width:24,height:24,borderRadius:'50%',border:'none',background:'#fca5a5',color:'#991b1b',cursor:'pointer',fontWeight:700,fontSize:13}}>×</button>
              </div>
            ):(
              <div style={{display:'flex',gap:6}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'7px 10px',background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:10}}>
                  <i className="ti ti-gift" style={{fontSize:14,color:'#9ca3af'}}/>
                  <input value={gcInput} onChange={e=>setGcInput(e.target.value.toUpperCase())} placeholder="Gift card code…" onKeyDown={e=>e.key==='Enter'&&applyGC()}
                    style={{border:'none',outline:'none',flex:1,fontSize:12,fontFamily:'monospace',fontWeight:700,letterSpacing:1,background:'transparent'}}/>
                </div>
                <button onClick={applyGC} disabled={!gcInput} style={{padding:'7px 14px',borderRadius:10,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,opacity:gcInput?1:.4}}>Apply</button>
              </div>
            )}
            {/* Wallet + Points toggles */}
            {customer&&(walletBal>0||custPoints>=10)&&(
              <div style={{display:'flex',gap:6}}>
                {walletBal>0&&(
                  <label style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:`1.5px solid ${useWallet?'#86efac':'#e2e8f0'}`,borderRadius:10,cursor:'pointer',background:useWallet?'#f0fdf4':'#fff',transition:'all .15s'}}>
                    <input type="checkbox" checked={useWallet} onChange={e=>setUseWallet(e.target.checked)} style={{width:15,height:15,accentColor:'#10b981'}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#374151'}}>Wallet</div>
                      <div style={{fontSize:10,color:'#9ca3af'}}>SAR {walletBal.toFixed(2)}</div>
                    </div>
                    {useWallet&&<span style={{fontSize:11,fontWeight:800,color:'#15803d',whiteSpace:'nowrap'}}>−{walletUsed.toFixed(2)}</span>}
                  </label>
                )}
                {custPoints>=10&&(
                  <label style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:`1.5px solid ${redeemPts?'#fde68a':'#e2e8f0'}`,borderRadius:10,cursor:'pointer',background:redeemPts?'#fffbf0':'#fff',transition:'all .15s'}}>
                    <input type="checkbox" checked={redeemPts} onChange={e=>setRedeemPts(e.target.checked)} style={{width:15,height:15,accentColor:'#f59e0b'}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#374151'}}>Points</div>
                      <div style={{fontSize:10,color:'#9ca3af'}}>{custPoints.toLocaleString()} pts</div>
                    </div>
                    {redeemPts&&<span style={{fontSize:11,fontWeight:800,color:'#92400e',whiteSpace:'nowrap'}}>−{ptsVal.toFixed(2)}</span>}
                  </label>
                )}
              </div>
            )}
          </div>
        )}
        {/* Payment summary */}
        <div style={{padding:'12px 16px',borderTop:'2px solid #f1f5f9',background:'#fff'}}>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
            {[['Subtotal',`SAR ${sub.toFixed(2)}`,'#374151'],totalDisc>0&&['Total discount',`− SAR ${totalDisc.toFixed(2)}`,'#ef4444'],['VAT 15%',`SAR ${tax.toFixed(2)}`,'#374151'],gcUsed>0&&['Gift card',`− SAR ${gcUsed.toFixed(2)}`,'#10b981'],walletUsed>0&&['Wallet',`− SAR ${walletUsed.toFixed(2)}`,'#10b981'],ptsVal>0&&['Points',`− SAR ${ptsVal.toFixed(2)}`,'#f59e0b']].filter(Boolean).map((r:any)=>(
              <div key={r[0]} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'#6b7280'}}>{r[0]}</span>
                <span style={{fontWeight:r[2]!=='#374151'?700:500,color:r[2]}}>{r[1]}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,marginTop:4,borderTop:'2px dashed #e2e8f0'}}>
              <span style={{fontWeight:800,fontSize:16,color:'#1e293b'}}>Total Due</span>
              <span style={{fontWeight:900,fontSize:30,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:-1}}>SAR {cashDue.toFixed(2)}</span>
            </div>
            {customer&&ptsEarned>0&&cart.length>0&&<div style={{fontSize:11,color:'#f59e0b',fontWeight:700,textAlign:'right'}}>+{ptsEarned} pts will be earned</div>}
          </div>
          {/* Charge button */}
          <button disabled={!cart.length||chargeMut.isPending} onClick={()=>cart.length&&setShowPayModal(true)}
            style={{width:'100%',padding:'17px 0',borderRadius:16,background:!cart.length?'#e2e8f0':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',cursor:!cart.length?'not-allowed':'pointer',fontSize:17,fontWeight:800,letterSpacing:.3,boxShadow:cart.length?'0 8px 24px rgba(99,102,241,.35)':'none',transition:'all .2s',marginBottom:8}}>
            {chargeMut.isPending?'Processing…':<><i className="ti ti-credit-card" style={{marginRight:8,fontSize:18}}/> Charge SAR {cashDue.toFixed(2)}</>}
          </button>
          {/* Hold + Void */}
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{if(!cart.length){toast('Cart empty','error');return;}const held=JSON.parse(localStorage.getItem('held_orders')||'[]');held.push({id:'Hold-'+Date.now(),cart,custId,time:new Date().toLocaleTimeString(),heldAt:Date.now(),note:''});localStorage.setItem('held_orders',JSON.stringify(held));resetSale();toast('Order held','info');}}
              style={{flex:1,padding:'10px 0',borderRadius:12,border:'1.5px solid #e2e8f0',background:'#fff',color:'#f59e0b',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <i className="ti ti-player-pause"/>Hold
            </button>
            <button onClick={()=>{if(cart.length&&confirm('Void this sale?'))resetSale();}}
              style={{flex:1,padding:'10px 0',borderRadius:12,border:'1.5px solid #e2e8f0',background:'#fff',color:'#ef4444',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <i className="ti ti-ban"/>Void
            </button>
            <button onClick={resetSale}
              style={{flex:1,padding:'10px 0',borderRadius:12,border:'1.5px solid #e2e8f0',background:'#fff',color:'#6b7280',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <i className="ti ti-refresh"/>Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
