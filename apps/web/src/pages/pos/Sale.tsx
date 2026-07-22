import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; }
const METHODS = [['Cash','ti-cash'],['Card','ti-credit-card'],['Tabby','ti-device-mobile'],['Tamara','ti-device-mobile'],['Apple Pay','ti-brand-apple'],['Mada','ti-credit-card']];
const TIER_RATE:Record<string,number> = {bronze:1/5,silver:1/4,gold:1/3,platinum:1/2};
const TIER_C:Record<string,string> = {bronze:'#cd7f32',silver:'#aaa',gold:'#f59e0b',platinum:'#6366f1'};

const getStoredCoupons=()=>{try{return JSON.parse(sessionStorage.getItem('coupons')||'[]');}catch{return[];}};
const getStoredGiftCards=()=>{try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return[];}};
const getStoredPromos=()=>{try{return JSON.parse(sessionStorage.getItem('localPromos')||'[]');}catch{return[];}};
const getWalletBalance=(customer:any)=>{
  if(!customer)return 0;
  try{const ws=JSON.parse(sessionStorage.getItem('wallets')||'[]');const w=ws.find((w:any)=>w.customer===customer.name);return w?w.balance:parseFloat(customer?.wallet_balance||0);}catch{return 0;}
};

export default function POSSale() {
  const {toast}=useToast();
  const qc=useQueryClient();
  const searchRef=useRef<HTMLInputElement>(null);
  const [search,setSearch]=useState('');
  const [cart,setCart]=useState<CartItem[]>([]);
  const [method,setMethod]=useState('Cash');
  const [custId,setCustId]=useState('');
  const [discPct,setDiscPct]=useState('');
  const [discFlat,setDiscFlat]=useState('');
  const [showDisc,setShowDisc]=useState(false);
  const [receipt,setReceipt]=useState<any>(null);
  const [orderNote,setOrderNote]=useState('');
  const [showNote,setShowNote]=useState(false);
  const [cashGiven,setCashGiven]=useState('');
  const [showCustModal,setShowCustModal]=useState(false);
  const [custSearch,setCustSearch]=useState('');
  const [couponInput,setCouponInput]=useState('');
  const [appliedCoupon,setAppliedCoupon]=useState<any>(null);
  const [gcInput,setGcInput]=useState('');
  const [appliedGC,setAppliedGC]=useState<any>(null);
  const [useWallet,setUseWallet]=useState(false);
  const [redeemPts,setRedeemPts]=useState(false);
  const [autoPromo,setAutoPromo]=useState<any>(null);
  const [showLoyalty,setShowLoyalty]=useState(false);
  const [receiptPoints,setReceiptPoints]=useState(0);
  const [catFilter,setCatFilter]=useState('');

  const {data:products=[]}=useQuery({queryKey:['products'],queryFn:()=>api.get('/catalog/products').then(r=>r.data)});
  const {data:warehouses}=useQuery<{id:string;name:string}[]>({queryKey:['warehouses'],queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:customers=[]}=useQuery({queryKey:['customers'],queryFn:()=>api.get('/customers').then(r=>r.data)});
  const {data:categories=[]}=useQuery({queryKey:['categories'],queryFn:()=>api.get('/catalog/categories').then(r=>r.data).catch(()=>[])});

  const defaultWarehouseId=warehouses?.[0]?.id??null;
  const customer=customers.find((c:any)=>c.id===custId) as any;
  const tier=customer?.loyalty_tier||'bronze';
  const custPoints=customer?.loyalty_points||0;
  const walletBal=getWalletBalance(customer);

  const filteredCusts=customers.filter((c:any)=>!custSearch||c.name?.toLowerCase().includes(custSearch.toLowerCase())||c.phone?.includes(custSearch));
  const filteredProducts=(products as any[]).filter((p:any)=>{
    const matchSearch=!search||p.name.toLowerCase().includes(search.toLowerCase())||p.variants?.some((v:any)=>v.sku?.toLowerCase().includes(search.toLowerCase()));
    const matchCat=!catFilter||p.category_id===catFilter;
    return matchSearch&&matchCat;
  });

  useEffect(()=>{
    if(cart.length===0){setAutoPromo(null);return;}
    const promos=getStoredPromos().filter((p:any)=>p.is_active&&p.discount_type==='percentage'&&p.discount_value>0);
    setAutoPromo(promos.sort((a:any,b:any)=>b.discount_value-a.discount_value)[0]||null);
  },[cart]);

  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const pctAmt=Math.min(sub*(parseFloat(discPct||'0')/100),sub);
  const flatAmt=Math.min(parseFloat(discFlat||'0'),sub-pctAmt);
  const manualDisc=pctAmt+flatAmt;
  const couponDisc=appliedCoupon?(appliedCoupon.type==='percentage'?Math.min(sub*appliedCoupon.value/100,sub):Math.min(appliedCoupon.value,sub)):0;
  const promoDisc=autoPromo&&!appliedCoupon?Math.min(sub*autoPromo.discount_value/100,sub):0;
  const totalDisc=manualDisc+couponDisc+promoDisc;
  const taxable=Math.max(sub-totalDisc,0);
  const tax=taxable*0.15;
  const grossTotal=taxable+tax;
  const walletUsed=useWallet?Math.min(walletBal,grossTotal):0;
  const gcUsed=appliedGC?Math.min(appliedGC.balance,grossTotal-walletUsed):0;
  const ptsValue=redeemPts&&custPoints>0?Math.min(custPoints*0.1,grossTotal-walletUsed-gcUsed):0;
  const ptsUsed=Math.ceil(ptsValue/0.1);
  const cashDue=Math.max(grossTotal-walletUsed-gcUsed-ptsValue,0);
  const change=parseFloat(cashGiven||'0')-cashDue;
  const ptsEarned=customer?Math.floor(cashDue*(TIER_RATE[tier]||0.2)):0;

  const addItem=(v:any,pname:string)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===v.id);
      if(ex)return prev.map(i=>i.id===v.id?{...i,qty:i.qty+1}:i);
      return [...prev,{id:v.id,sku:v.sku||'',name:`${pname}${v.name&&v.name!=='Default'?' ('+v.name+')':''}`,price:parseFloat(v.selling_price||0),qty:1}];
    });
    toast(`Added: ${pname}`,'success');
  };

  const applyCoupon=()=>{
    const found=getStoredCoupons().find((c:any)=>c.code===couponInput.toUpperCase()&&c.is_active&&(!c.expires||new Date(c.expires)>new Date())&&(!c.usage_limit||c.used<c.usage_limit));
    if(!found){toast('Invalid or expired coupon','error');return;}
    if(found.min_purchase>0&&sub<found.min_purchase){toast(`Min purchase SAR ${found.min_purchase} required`,'error');return;}
    setAppliedCoupon(found);setCouponInput('');toast(`Coupon ${found.code} applied!`,'success');
  };
  const applyGC=()=>{
    const found=getStoredGiftCards().find((g:any)=>g.code===gcInput.toUpperCase()&&g.is_active&&g.balance>0&&new Date(g.expires)>new Date());
    if(!found){toast('Invalid or used gift card','error');return;}
    setAppliedGC(found);setGcInput('');toast(`Gift card SAR ${found.balance} applied!`,'success');
  };
  const resetSale=()=>{
    setCart([]);setDiscPct('');setDiscFlat('');setShowDisc(false);setCustId('');
    setAppliedCoupon(null);setAppliedGC(null);setUseWallet(false);setRedeemPts(false);
    setAutoPromo(null);setShowLoyalty(false);setOrderNote('');setShowNote(false);setCashGiven('');
  };

  const chargeMut=useMutation({
    mutationFn:async()=>{
      const body:any={customer_id:custId||null,lines:cart.map(i=>({variant_id:i.id,quantity:i.qty,unit_price:i.price,discount_amount:0})),subtotal:sub,tax_amount:tax,discount_amount:totalDisc,total:grossTotal,notes:orderNote||undefined};
      if(defaultWarehouseId)body.warehouse_id=defaultWarehouseId;
      const order=await api.post('/sales/orders',body);
      const payments:any[]=[];
      if(gcUsed>0)payments.push({method:'gift_card',amount:gcUsed,reference:appliedGC?.code});
      if(walletUsed>0)payments.push({method:'wallet',amount:walletUsed});
      if(ptsValue>0)payments.push({method:'loyalty_points',amount:ptsValue,reference:ptsUsed+' pts'});
      if(cashDue>0)payments.push({method:method.toLowerCase().replace(/ /g,'_'),amount:cashDue});
      await api.post('/sales/payments',{order_id:order.data.id,payments});
      if(appliedGC&&gcUsed>0){const gcs=getStoredGiftCards().map((g:any)=>g.id===appliedGC.id?{...g,balance:Math.max(g.balance-gcUsed,0)}:g);try{sessionStorage.setItem('giftcards',JSON.stringify(gcs));}catch{}}
      return order.data;
    },
    onSuccess:d=>{
      toast(`✅ Order #${d.order_number} — SAR ${cashDue.toFixed(2)}`,'success');
      qc.invalidateQueries({queryKey:['dashboard']});qc.invalidateQueries({queryKey:['orders']});
      setReceiptPoints(ptsEarned);
      setReceipt({...d,_gcUsed:gcUsed,_walletUsed:walletUsed,_ptsUsed:ptsUsed,_ptsEarned:ptsEarned,_coupon:appliedCoupon,_cashDue:cashDue,_change:change>0?change:0,_method:method,_note:orderNote,_totalDisc:totalDisc});
      resetSale();
    },
    onError:e=>toast(getErr(e),'error')
  });

  // ── Receipt ──────────────────────────────────
  if(receipt) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:480}}>
      <div className="card" style={{maxWidth:420,width:'100%',padding:32,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:8}}>✅</div>
        <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Payment Complete</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:16}}>Order #{receipt.order_number} · {receipt._method}</div>
        <div style={{background:'var(--surface-1)',borderRadius:'var(--radius)',padding:14,marginBottom:12,textAlign:'left'}}>
          {[receipt._gcUsed>0&&['Gift card','− SAR '+receipt._gcUsed.toFixed(2),'#27ae60'],receipt._walletUsed>0&&['Wallet','− SAR '+receipt._walletUsed.toFixed(2),'#27ae60'],receipt._ptsUsed>0&&['Points redeemed',receipt._ptsUsed+' pts = − SAR '+(receipt._ptsUsed*0.1).toFixed(2),'#27ae60'],receipt._coupon&&['Coupon '+receipt._coupon.code,'− SAR '+couponDisc.toFixed(2),'#27ae60'],receipt._totalDisc>0&&['Total discount','− SAR '+receipt._totalDisc.toFixed(2),'#e74c3c']].filter(Boolean).map((r:any)=>(
            <div key={r[0]} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}><span style={{color:'var(--text-secondary)'}}>{r[0]}</span><span style={{color:r[2],fontWeight:600}}>{r[1]}</span></div>
          ))}
          <div style={{borderTop:'1px solid var(--border-color)',paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
            <span style={{fontWeight:700}}>Amount charged</span>
            <span style={{fontWeight:800,fontSize:22,color:'var(--fill-accent)'}}>SAR {receipt._cashDue?.toFixed(2)}</span>
          </div>
          {receipt._change>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:6,padding:'6px 0',color:'#27ae60',fontWeight:700}}>
            <span>Change due</span><span>SAR {receipt._change.toFixed(2)}</span>
          </div>}
        </div>
        {receipt._note&&<div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:10,textAlign:'left'}}>Note: {receipt._note}</div>}
        {receiptPoints>0&&<div style={{padding:'8px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'var(--radius)',marginBottom:12,fontSize:12,textAlign:'left'}}>
          <i className="ti ti-star" style={{color:'#16a34a',marginRight:6}}/><strong style={{color:'#15803d'}}>+{receiptPoints} loyalty points earned!</strong>
        </div>}
        <div style={{display:'flex',gap:8}}>
          <button className="bt" style={{flex:1,justifyContent:'center'}} onClick={()=>{
            const w=window.open('','_blank','width=380,height=600');if(!w)return;
            w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:monospace;font-size:12px;padding:16px;margin:0}h2{text-align:center;margin:0 0 4px}.c{text-align:center}.l{border-top:1px dashed #000;margin:6px 0}.r{display:flex;justify-content:space-between}.big{font-size:16px;font-weight:bold}</style></head><body>
              <h2>NuxFashion</h2><div class="c" style="font-size:10px">Riyadh · +966-XX-XXXXXXX</div><div class="l"></div>
              <div class="r"><span>Order</span><span>#${receipt.order_number}</span></div>
              <div class="r"><span>Date</span><span>${new Date().toLocaleString('en-SA')}</span></div>
              <div class="r"><span>Payment</span><span>${receipt._method}</span></div>
              ${receipt._note?`<div class="r"><span>Note</span><span>${receipt._note}</span></div>`:''}
              <div class="l"></div>
              ${receipt._gcUsed>0?`<div class="r"><span>Gift card</span><span>-SAR ${receipt._gcUsed.toFixed(2)}</span></div>`:''}
              ${receipt._walletUsed>0?`<div class="r"><span>Wallet</span><span>-SAR ${receipt._walletUsed.toFixed(2)}</span></div>`:''}
              ${receipt._ptsUsed>0?`<div class="r"><span>Points (${receipt._ptsUsed})</span><span>-SAR ${(receipt._ptsUsed*0.1).toFixed(2)}</span></div>`:''}
              <div class="l"></div>
              <div class="r big"><span>TOTAL</span><span>SAR ${receipt._cashDue?.toFixed(2)}</span></div>
              ${receipt._change>0?`<div class="r" style="color:green"><span>Change</span><span>SAR ${receipt._change.toFixed(2)}</span></div>`:''}
              ${receiptPoints>0?`<div class="l"></div><div class="c">+${receiptPoints} loyalty points earned!</div>`:''}
              <div class="l"></div><div class="c" style="font-size:10px;color:#666">Thank you! · ZATCA e-invoice generated</div>
            </body></html>`);w.document.close();w.focus();w.print();w.close();
          }}><i className="ti ti-printer"/> Print</button>
          <button className="bt bt-p" style={{flex:1,justifyContent:'center'}} onClick={()=>{setReceipt(null);setReceiptPoints(0);}}>
            <i className="ti ti-plus"/> New sale
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main POS ─────────────────────────────────
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 300px',height:'calc(100vh - 120px)',gap:0}}>

      {/* Customer search modal */}
      {showCustModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80}} onClick={e=>{if(e.target===e.currentTarget){setShowCustModal(false);setCustSearch('');}}}>
          <div style={{background:'var(--surface-2)',borderRadius:'var(--radius)',width:440,maxHeight:480,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:10}}>
              <i className="ti ti-search" style={{fontSize:16,color:'var(--text-secondary)'}}/>
              <input autoFocus value={custSearch} onChange={e=>setCustSearch(e.target.value)} placeholder="Search by name or phone…"
                style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:14,color:'var(--text-primary)'}}/>
              <button onClick={()=>{setShowCustModal(false);setCustSearch('');}} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'var(--text-secondary)'}}>×</button>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              <div onClick={()=>{setCustId('');setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}}
                style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:10}}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <i className="ti ti-user" style={{fontSize:18,color:'var(--text-secondary)'}}/>
                <span style={{fontSize:13,fontWeight:500}}>Walk-in customer</span>
              </div>
              {filteredCusts.map((c:any)=>(
                <div key={c.id} onClick={()=>{setCustId(c.id);setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}}
                  style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12}}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'var(--bg-accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--fill-accent)',flexShrink:0}}>
                    {c.name.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{c.name}</div>
                    <div style={{fontSize:11,color:'var(--text-secondary)'}}>{c.phone||c.email||'No contact'} · {c.loyalty_points||0} pts</div>
                  </div>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:TIER_C[c.loyalty_tier||'bronze']+'22',color:TIER_C[c.loyalty_tier||'bronze'],fontWeight:700,textTransform:'capitalize'}}>{c.loyalty_tier||'Bronze'}</span>
                </div>
              ))}
              {filteredCusts.length===0&&custSearch&&<div style={{padding:24,textAlign:'center',color:'var(--text-secondary)',fontSize:13}}>No customers found for "{custSearch}"</div>}
            </div>
          </div>
        </div>
      )}

      {/* LEFT — products + cart */}
      <div style={{display:'flex',flexDirection:'column',borderRight:'1px solid var(--border-color)',overflow:'hidden',background:'var(--surface-2)'}}>

        {/* Top bar */}
        <div style={{padding:'8px 12px',borderBottom:'1px solid var(--border-color)',background:'var(--surface-1)',display:'flex',gap:8,alignItems:'center'}}>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'var(--surface-2)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)'}}>
            <i className="ti ti-barcode" style={{fontSize:16,color:'var(--text-secondary)'}}/>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Scan barcode or search product…" autoFocus
              style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13,padding:0}}/>
            {search&&<span style={{cursor:'pointer',color:'var(--text-secondary)',fontSize:16}} onClick={()=>setSearch('')}>×</span>}
          </div>
          {/* Customer picker button */}
          <button onClick={()=>{setShowCustModal(true);setCustSearch('');}}
            style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',border:'1px solid '+(custId?'var(--fill-accent)':'var(--border-color)'),borderRadius:'var(--radius)',background:custId?'var(--bg-accent)':'var(--surface-2)',cursor:'pointer',fontSize:12,color:custId?'var(--fill-accent)':'var(--text-secondary)',fontWeight:custId?700:400,whiteSpace:'nowrap',maxWidth:200}}>
            <i className={'ti '+(custId?'ti-user-check':'ti-user-search')} style={{fontSize:15}}/>
            <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{customer?customer.name:'Select customer'}</span>
            {custId&&<span onClick={e=>{e.stopPropagation();setCustId('');setUseWallet(false);setRedeemPts(false);}} style={{marginLeft:'auto',fontSize:16,color:'var(--text-secondary)',cursor:'pointer'}}>×</span>}
          </button>
        </div>

        {/* Category tabs */}
        {(categories as any[]).length>0&&(
          <div style={{display:'flex',gap:4,padding:'6px 12px',borderBottom:'1px solid var(--border-color)',overflowX:'auto',background:'var(--surface-1)'}}>
            <button onClick={()=>setCatFilter('')}
              style={{padding:'3px 12px',borderRadius:20,border:'1px solid '+(catFilter===''?'var(--fill-accent)':'var(--border-color)'),background:catFilter===''?'var(--fill-accent)':'transparent',color:catFilter===''?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:11,fontWeight:catFilter===''?700:400,whiteSpace:'nowrap',flexShrink:0}}>
              All
            </button>
            {(categories as any[]).map((cat:any)=>(
              <button key={cat.id} onClick={()=>setCatFilter(catFilter===cat.id?'':cat.id)}
                style={{padding:'3px 12px',borderRadius:20,border:'1px solid '+(catFilter===cat.id?'var(--fill-accent)':'var(--border-color)'),background:catFilter===cat.id?'var(--fill-accent)':'transparent',color:catFilter===cat.id?'#fff':'var(--text-secondary)',cursor:'pointer',fontSize:11,fontWeight:catFilter===cat.id?700:400,whiteSpace:'nowrap',flexShrink:0}}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div style={{maxHeight:200,overflowY:'auto',borderBottom:'1px solid var(--border-color)',background:'var(--surface-2)'}}>
          {filteredProducts.slice(0,30).map((p:any)=>p.variants?.map((v:any)=>(
            <div key={v.id} onClick={()=>addItem(v,p.name)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',cursor:'pointer',borderBottom:'1px solid var(--border-color)'}}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
              <div style={{width:32,height:32,background:'var(--surface-1)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="ti ti-shirt" style={{fontSize:15}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:10,color:'var(--text-secondary)'}}>{v.sku||'—'}{v.name&&v.name!=='Default'?' · '+v.name:''}</div>
              </div>
              <div style={{fontWeight:700,color:'var(--fill-accent)',fontSize:13,flexShrink:0}}>SAR {parseFloat(v.selling_price||0).toFixed(2)}</div>
              <span className="bx g" style={{fontSize:9,flexShrink:0}}>+ Add</span>
            </div>
          )))}
          {filteredProducts.length===0&&<div style={{padding:16,textAlign:'center',fontSize:12,color:'var(--text-secondary)'}}>No products found</div>}
        </div>

        {/* Cart */}
        <div style={{flex:1,overflowY:'auto',padding:'8px 12px'}}>
          {cart.length===0?(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted-custom)',gap:8}}>
              <i className="ti ti-shopping-cart" style={{fontSize:40}}/>
              <div style={{fontSize:13,fontWeight:600}}>Cart is empty</div>
              <div style={{fontSize:11}}>Select a product above to add</div>
            </div>
          ):(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',letterSpacing:'.5px'}}>{cart.reduce((s,i)=>s+i.qty,0)} ITEMS · SAR {sub.toFixed(2)}</span>
                <div style={{display:'flex',gap:6}}>
                  <button className="bt" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>setShowNote(p=>!p)}><i className="ti ti-notes"/> {orderNote?'Edit note':'Add note'}</button>
                  <button className="bt bt-d" style={{fontSize:10}} onClick={()=>setCart([])}><i className="ti ti-trash"/> Clear</button>
                </div>
              </div>
              {showNote&&(
                <div style={{marginBottom:8}}>
                  <input value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Order note (kitchen/packing instructions)…"
                    style={{width:'100%',padding:'6px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-1)',color:'var(--text-primary)',boxSizing:'border-box'}}/>
                </div>
              )}
              {cart.map(item=>(
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--border-color)'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                    <div style={{fontSize:10,color:'var(--text-muted-custom)'}}>{item.sku} · SAR {item.price.toFixed(2)} each</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id&&i.qty>1?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0))}
                      style={{width:24,height:24,border:'1px solid var(--border-color)',borderRadius:4,background:'var(--surface-1)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                    <span style={{fontWeight:700,minWidth:20,textAlign:'center',fontSize:13}}>{item.qty}</span>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i))}
                      style={{width:24,height:24,border:'1px solid var(--border-color)',borderRadius:4,background:'var(--surface-1)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  </div>
                  <div style={{fontWeight:700,minWidth:70,textAlign:'right',fontSize:12}}>SAR {(item.price*item.qty).toFixed(2)}</div>
                  <button onClick={()=>setCart(p=>p.filter(i=>i.id!==item.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:17,padding:0}}>×</button>
                </div>
              ))}
              {/* Auto promo */}
              {autoPromo&&!appliedCoupon&&(
                <div style={{marginTop:8,padding:'6px 10px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'#15803d',fontWeight:600}}><i className="ti ti-tag" style={{marginRight:5}}/>{autoPromo.name} — {autoPromo.discount_value}% off</span>
                  <span style={{fontWeight:700,color:'#15803d'}}>− SAR {promoDisc.toFixed(2)}</span>
                </div>
              )}
              {/* Discount */}
              <div style={{marginTop:8,padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,fontWeight:600,flex:1}}>Manual discount</span>
                  {manualDisc>0&&<span style={{fontSize:11,fontWeight:700,color:'#27ae60'}}>− SAR {manualDisc.toFixed(2)}</span>}
                  <button className={'snb'+(showDisc?' on':'')} onClick={()=>{setShowDisc(p=>!p);if(showDisc){setDiscPct('');setDiscFlat('');}}}>
                    {showDisc?'Remove':'+ Add'}
                  </button>
                </div>
                {showDisc&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                    <div>
                      <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:4}}>% OFF</div>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                        <input type="number" value={discPct} onChange={e=>setDiscPct(e.target.value)} placeholder="0" min="0" max="100"
                          style={{flex:1,border:'none',outline:'none',padding:'5px 8px',fontSize:13,fontWeight:600,background:'var(--surface-2)',width:0}}/>
                        <span style={{padding:'0 8px',fontSize:12,fontWeight:700,color:'var(--fill-accent)',borderLeft:'1px solid var(--border-color)',background:'var(--surface-1)'}}>%</span>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:4}}>SAR OFF</div>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                        <span style={{padding:'0 7px',fontSize:11,color:'var(--text-secondary)',borderRight:'1px solid var(--border-color)',background:'var(--surface-1)'}}>SAR</span>
                        <input type="number" value={discFlat} onChange={e=>setDiscFlat(e.target.value)} placeholder="0" min="0"
                          style={{flex:1,border:'none',outline:'none',padding:'5px 8px',fontSize:13,fontWeight:600,background:'var(--surface-2)',width:0}}/>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT — payment panel */}
      <div style={{display:'flex',flexDirection:'column',gap:8,padding:10,background:'var(--surface-1)',overflow:'auto',borderLeft:'1px solid var(--border-color)'}}>

        {/* Customer loyalty */}
        {customer&&(
          <div style={{padding:'10px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}><i className="ti ti-user-check" style={{marginRight:5}}/>{customer.name}</div>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:TIER_C[tier]+'22',color:TIER_C[tier],fontWeight:700,textTransform:'capitalize',flexShrink:0,marginLeft:6}}>{tier}</span>
            </div>
            <div style={{display:'flex',gap:12,fontSize:11,color:'var(--text-secondary)'}}>
              <span><strong style={{color:'var(--fill-accent)'}}>{custPoints.toLocaleString()}</strong> pts</span>
              <span><strong style={{color:'#27ae60'}}>SAR {walletBal.toFixed(2)}</strong> wallet</span>
              {ptsEarned>0&&cart.length>0&&<span><strong style={{color:'#f59e0b'}}>+{ptsEarned}</strong> earning</span>}
            </div>
            <button onClick={()=>setShowLoyalty(p=>!p)} style={{marginTop:5,fontSize:10,color:'var(--fill-accent)',background:'none',border:'none',cursor:'pointer',padding:0}}>
              {showLoyalty?'▲ Hide':'▼ Wallet & points options'}
            </button>
            {showLoyalty&&(
              <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:5}}>
                {walletBal>0&&(
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',padding:'6px 8px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                    <input type="checkbox" checked={useWallet} onChange={e=>setUseWallet(e.target.checked)} style={{width:14,height:14}}/>
                    <span>Use wallet (SAR {walletBal.toFixed(2)})</span>
                    {useWallet&&<span style={{marginLeft:'auto',color:'#27ae60',fontWeight:700}}>−SAR {walletUsed.toFixed(2)}</span>}
                  </label>
                )}
                {custPoints>=10&&(
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',padding:'6px 8px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                    <input type="checkbox" checked={redeemPts} onChange={e=>setRedeemPts(e.target.checked)} style={{width:14,height:14}}/>
                    <span>Redeem points</span>
                    {redeemPts&&<span style={{marginLeft:'auto',color:'#27ae60',fontWeight:700}}>−SAR {ptsValue.toFixed(2)}</span>}
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Coupon */}
        <div style={{padding:'8px 10px',background:'var(--surface-2)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-secondary)',marginBottom:5,letterSpacing:'.5px'}}>COUPON CODE</div>
          {appliedCoupon?(
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'#27ae60',fontWeight:700,fontFamily:'monospace'}}>{appliedCoupon.code} — {appliedCoupon.type==='percentage'?appliedCoupon.value+'%':'SAR '+appliedCoupon.value} off</span>
              <button onClick={()=>setAppliedCoupon(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button>
            </div>
          ):(
            <div style={{display:'flex',gap:5}}>
              <input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Enter code" onKeyDown={e=>e.key==='Enter'&&applyCoupon()}
                style={{flex:1,padding:'5px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,fontFamily:'monospace',fontWeight:700,background:'var(--surface-1)',color:'var(--text-primary)',letterSpacing:1}}/>
              <button className="bt" onClick={applyCoupon} disabled={!couponInput} style={{fontSize:11}}>Apply</button>
            </div>
          )}
        </div>

        {/* Gift card */}
        <div style={{padding:'8px 10px',background:'var(--surface-2)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-secondary)',marginBottom:5,letterSpacing:'.5px'}}>GIFT CARD</div>
          {appliedGC?(
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:11,color:'#27ae60',fontWeight:700,fontFamily:'monospace'}}>{appliedGC.code}<br/><span style={{fontSize:10,fontWeight:400}}>SAR {appliedGC.balance} balance · using SAR {gcUsed.toFixed(2)}</span></span>
              <button onClick={()=>setAppliedGC(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button>
            </div>
          ):(
            <div style={{display:'flex',gap:5}}>
              <input value={gcInput} onChange={e=>setGcInput(e.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX" onKeyDown={e=>e.key==='Enter'&&applyGC()}
                style={{flex:1,padding:'5px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:11,fontFamily:'monospace',fontWeight:700,background:'var(--surface-1)',color:'var(--text-primary)',letterSpacing:1}}/>
              <button className="bt" onClick={applyGC} disabled={!gcInput} style={{fontSize:11}}>Apply</button>
            </div>
          )}
        </div>

        {/* Total */}
        <div style={{background:'var(--surface-2)',borderRadius:'var(--radius)',padding:'10px 12px',border:'1px solid var(--border-color)'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-secondary)',marginBottom:8,letterSpacing:'.5px'}}>ORDER SUMMARY</div>
          {[['Items ('+cart.reduce((s,i)=>s+i.qty,0)+')','SAR '+sub.toFixed(2),''],manualDisc>0&&['Discount','− SAR '+manualDisc.toFixed(2),'#e74c3c'],promoDisc>0&&[autoPromo?.name,'− SAR '+promoDisc.toFixed(2),'#27ae60'],couponDisc>0&&['Coupon '+appliedCoupon?.code,'− SAR '+couponDisc.toFixed(2),'#27ae60'],['VAT 15%','SAR '+tax.toFixed(2),''],gcUsed>0&&['Gift card','− SAR '+gcUsed.toFixed(2),'#27ae60'],walletUsed>0&&['Wallet','− SAR '+walletUsed.toFixed(2),'#27ae60'],ptsValue>0&&['Points ('+ptsUsed+')','− SAR '+ptsValue.toFixed(2),'#27ae60']].filter(Boolean).map((r:any)=>(
            <div key={r[0]} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3,color:r[2]||'var(--text-secondary)'}}>
              <span>{r[0]}</span><span style={{fontWeight:r[2]?700:400}}>{r[1]}</span>
            </div>
          ))}
          <div style={{borderTop:'1px solid var(--border-color)',paddingTop:8,marginTop:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:12}}>CASH DUE</span>
            <span style={{fontWeight:800,fontSize:20,color:'var(--fill-accent)'}}>SAR {cashDue.toFixed(2)}</span>
          </div>
          {ptsEarned>0&&cart.length>0&&<div style={{fontSize:10,color:'#f59e0b',textAlign:'right',marginTop:2}}>+{ptsEarned} pts will be earned</div>}
        </div>

        {/* Payment method */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-secondary)',marginBottom:6,letterSpacing:'.5px'}}>PAYMENT METHOD</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
            {METHODS.map(([name,icon])=>(
              <button key={name} onClick={()=>setMethod(name)}
                style={{padding:'7px 5px',fontSize:11,fontWeight:500,border:`2px solid ${method===name?'var(--fill-accent)':'var(--border-color)'}`,borderRadius:'var(--radius)',cursor:'pointer',background:method===name?'var(--bg-accent)':'var(--surface-2)',color:method===name?'var(--fill-accent)':'var(--text-secondary)',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                <i className={'ti '+icon} style={{fontSize:13}}/>{name}
              </button>
            ))}
          </div>
        </div>

        {/* Cash change calculator */}
        {method==='Cash'&&cashDue>0&&(
          <div style={{padding:'8px 10px',background:'var(--surface-2)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--text-secondary)',marginBottom:5,letterSpacing:'.5px'}}>CASH RECEIVED</div>
            <div style={{display:'flex',gap:5,marginBottom:6}}>
              <input type="number" value={cashGiven} onChange={e=>setCashGiven(e.target.value)} placeholder={cashDue.toFixed(2)}
                style={{flex:1,padding:'5px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:13,fontWeight:700,background:'var(--surface-1)',color:'var(--text-primary)'}}/>
            </div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {[50,100,200,500].map(amt=>(
                <button key={amt} onClick={()=>setCashGiven(String(amt))}
                  style={{padding:'3px 8px',borderRadius:'var(--radius)',border:'1px solid var(--border-color)',background:'var(--surface-1)',cursor:'pointer',fontSize:11,color:'var(--text-secondary)'}}>
                  {amt}
                </button>
              ))}
              <button onClick={()=>setCashGiven(String(Math.ceil(cashDue/10)*10))}
                style={{padding:'3px 8px',borderRadius:'var(--radius)',border:'1px solid var(--border-color)',background:'var(--surface-1)',cursor:'pointer',fontSize:11,color:'var(--fill-accent)',fontWeight:600}}>
                Exact+
              </button>
            </div>
            {change>0&&<div style={{marginTop:6,padding:'5px 8px',background:'#f0fdf4',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between',fontSize:12}}>
              <span style={{color:'#15803d',fontWeight:600}}>Change due</span>
              <span style={{color:'#15803d',fontWeight:800}}>SAR {change.toFixed(2)}</span>
            </div>}
            {cashGiven&&parseFloat(cashGiven)<cashDue&&<div style={{marginTop:4,fontSize:11,color:'#e74c3c',fontWeight:600}}>⚠ Short SAR {(cashDue-parseFloat(cashGiven)).toFixed(2)}</div>}
          </div>
        )}

        {/* Hold + Charge */}
        <button className="bt" style={{justifyContent:'center',width:'100%',fontSize:12}} disabled={cart.length===0}
          onClick={()=>{
            const held=JSON.parse(localStorage.getItem('held_orders')||'[]');
            const note=prompt('Note for held order (optional):');
            held.push({id:'Hold-'+Date.now(),cart,custId,discPct,discFlat,note:note||'',time:new Date().toLocaleTimeString(),heldAt:Date.now()});
            localStorage.setItem('held_orders',JSON.stringify(held));
            resetSale();toast('Order held','info');
          }}>
          <i className="ti ti-player-pause"/> Hold sale
        </button>
        <button className="charge-btn" disabled={cart.length===0||chargeMut.isPending} onClick={()=>chargeMut.mutate()} style={{marginTop:'auto',fontSize:14}}>
          {chargeMut.isPending?<><div className="spinner-border spinner-border-sm me-2"/>Processing…</>:<><i className="ti ti-check" style={{fontSize:16}}/> Charge SAR {cashDue.toFixed(2)}</>}
        </button>
        <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 8px',background:'var(--surface-2)',borderRadius:'var(--radius)'}}>
          <i className="ti ti-shield-check" style={{fontSize:11,color:'var(--text-success-custom)'}}/>
          <span style={{fontSize:10,color:'var(--text-secondary)'}}>ZATCA e-invoice auto-generated</span>
        </div>
      </div>
    </div>
  );
}
