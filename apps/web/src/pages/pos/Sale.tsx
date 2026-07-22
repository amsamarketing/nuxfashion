import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; category:string; }

const METHODS=['Cash','Card','Tabby','Tamara','Apple Pay','Mada'];
const TIER_RATE:Record<string,number>={bronze:1/5,silver:1/4,gold:1/3,platinum:1/2};
const TIER_C:Record<string,string>={bronze:'#cd7f32',silver:'#aaa',gold:'#f59e0b',platinum:'#6366f1'};
const CAT_ICONS:Record<string,string>={
  'Abayas':'ti-shirt','Dresses':'ti-shirt','Tops':'ti-shirt','Bottoms':'ti-layout-bottombar',
  'Bags':'ti-briefcase','Shoes':'ti-shoe','Accessories':'ti-diamond','Perfumes':'ti-bottle',
  'Kids':'ti-baby-carriage','Sale':'ti-tag','default':'ti-hanger'
};

const getStoredCoupons=()=>{try{return JSON.parse(sessionStorage.getItem('coupons')||'[]');}catch{return[];}};
const getStoredGiftCards=()=>{try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return[];}};
const getStoredPromos=()=>{try{return JSON.parse(sessionStorage.getItem('localPromos')||'[]');}catch{return[];}};
const getWalletBalance=(customer:any)=>{
  if(!customer)return 0;
  try{const ws=JSON.parse(sessionStorage.getItem('wallets')||'[]');const w=ws.find((w:any)=>w.customer===customer.name);return w?w.balance:parseFloat(customer?.wallet_balance||0);}catch{return 0;}
};

const BG_COLORS=['#fde8ef','#e8f0fe','#e8fde8','#fef3e8','#f0e8fe','#e8fef3','#fefde8','#e8f8fe'];

function Clock(){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  return <span style={{fontWeight:700,letterSpacing:1}}>{t.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>;
}

export default function POSSale(){
  const {toast}=useToast();
  const qc=useQueryClient();
  const [search,setSearch]=useState('');
  const [cart,setCart]=useState<CartItem[]>([]);
  const [method,setMethod]=useState('Cash');
  const [custId,setCustId]=useState('');
  const [discPct,setDiscPct]=useState('');
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
  const [showOrdersModal,setShowOrdersModal]=useState(false);

  const {data:products=[]}=useQuery({queryKey:['products'],queryFn:()=>api.get('/catalog/products').then(r=>r.data)});
  const {data:warehouses=[]}=useQuery<any[]>({queryKey:['warehouses'],queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:customers=[]}=useQuery({queryKey:['customers'],queryFn:()=>api.get('/customers').then(r=>r.data)});
  const {data:categories=[]}=useQuery({queryKey:['categories'],queryFn:()=>api.get('/catalog/categories').then(r=>r.data).catch(()=>[])});
  const {data:recentOrders=[]}=useQuery({queryKey:['pos-orders'],queryFn:()=>api.get('/sales/orders?limit=20').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[]).catch(()=>[])});

  const customer=(customers as any[]).find((c:any)=>c.id===custId);
  const tier=customer?.loyalty_tier||'bronze';
  const custPoints=customer?.loyalty_points||0;
  const walletBal=getWalletBalance(customer);
  const defaultWarehouseId=(warehouses as any[])[0]?.id??null;

  const allVariants:(any[])=(products as any[]).flatMap((p:any)=>
    (p.variants||[]).map((v:any)=>({...v,productName:p.name,categoryId:p.category_id,categoryName:(categories as any[]).find((c:any)=>c.id===p.category_id)?.name||''}))
  );
  const filteredVariants=allVariants.filter(v=>{
    const ms=!search||v.productName?.toLowerCase().includes(search.toLowerCase())||v.sku?.toLowerCase().includes(search.toLowerCase());
    const mc=!catFilter||v.categoryId===catFilter;
    return ms&&mc;
  });

  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const manualDisc=Math.min(sub*(parseFloat(discPct||'0')/100),sub);
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

  const addToCart=(v:any)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===v.id);
      if(ex)return prev.map(i=>i.id===v.id?{...i,qty:i.qty+1}:i);
      return [...prev,{id:v.id,sku:v.sku||'',name:`${v.productName}${v.name&&v.name!=='Default'?' ('+v.name+')':''}`,price:parseFloat(v.selling_price||0),qty:1,category:v.categoryName||''}];
    });
  };
  const removeFromCart=(id:string)=>setCart(p=>p.filter(i=>i.id!==id));
  const setQty=(id:string,qty:number)=>{if(qty<=0)removeFromCart(id);else setCart(p=>p.map(i=>i.id===id?{...i,qty}:i));};
  const cartQty=(id:string)=>cart.find(i=>i.id===id)?.qty||0;

  const applyCoupon=()=>{
    const f=getStoredCoupons().find((c:any)=>c.code===couponInput.toUpperCase()&&c.is_active&&(!c.expires||new Date(c.expires)>new Date())&&(!c.usage_limit||c.used<c.usage_limit));
    if(!f){toast('Invalid or expired coupon','error');return;}
    if(f.min_purchase>0&&sub<f.min_purchase){toast(`Min SAR ${f.min_purchase} required`,'error');return;}
    setAppliedCoupon(f);setCouponInput('');toast('Coupon applied!','success');
  };
  const applyGC=()=>{
    const f=getStoredGiftCards().find((g:any)=>g.code===gcInput.toUpperCase()&&g.is_active&&g.balance>0&&new Date(g.expires)>new Date());
    if(!f){toast('Invalid gift card','error');return;}
    setAppliedGC(f);setGcInput('');toast('Gift card applied!','success');
  };

  const resetSale=()=>{
    setCart([]);setDiscPct('');setCustId('');setAppliedCoupon(null);setAppliedGC(null);
    setUseWallet(false);setRedeemPts(false);setAutoPromo(null);setCashGiven('');setOrderNote('');setShowPayModal(false);
  };

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
      toast(`Order #${d.order_number} complete`,'success');
      qc.invalidateQueries({queryKey:['dashboard']});qc.invalidateQueries({queryKey:['orders']});qc.invalidateQueries({queryKey:['pos-orders']});
      setReceipt({...d,_cashDue:cashDue,_change:change>0?change:0,_method:method,_gcUsed:gcUsed,_walletUsed:walletUsed,_ptsUsed:ptsUsed,_ptsEarned:ptsEarned,_totalDisc:totalDisc,_note:orderNote});
      resetSale();
    },
    onError:e=>{toast(getErr(e),'error');}
  });

  if(receipt) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#f8f9fa'}}>
      <div style={{background:'#fff',borderRadius:16,padding:40,maxWidth:420,width:'100%',boxShadow:'0 8px 32px rgba(0,0,0,.12)',textAlign:'center'}}>
        <div style={{fontSize:56,marginBottom:8}}>✅</div>
        <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Payment Successful</div>
        <div style={{fontSize:13,color:'#666',marginBottom:24}}>Order #{receipt.order_number} · {receipt._method}</div>
        <div style={{background:'#f8f9fa',borderRadius:12,padding:16,marginBottom:16,textAlign:'left'}}>
          {receipt._totalDisc>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#666'}}>Discount</span><span style={{color:'#e74c3c',fontWeight:700}}>− SAR {receipt._totalDisc.toFixed(2)}</span></div>}
          {receipt._gcUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#666'}}>Gift card</span><span style={{color:'#27ae60',fontWeight:700}}>− SAR {receipt._gcUsed.toFixed(2)}</span></div>}
          {receipt._walletUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#666'}}>Wallet</span><span style={{color:'#27ae60',fontWeight:700}}>− SAR {receipt._walletUsed.toFixed(2)}</span></div>}
          {receipt._ptsUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#666'}}>Points ({receipt._ptsUsed})</span><span style={{color:'#27ae60',fontWeight:700}}>− SAR {(receipt._ptsUsed*0.1).toFixed(2)}</span></div>}
          <div style={{borderTop:'1px dashed #ddd',paddingTop:12,marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:15}}>Total Charged</span>
            <span style={{fontWeight:900,fontSize:24,color:'#6366f1'}}>SAR {receipt._cashDue?.toFixed(2)}</span>
          </div>
          {receipt._change>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:8,color:'#27ae60',fontWeight:700}}><span>Change due</span><span>SAR {receipt._change.toFixed(2)}</span></div>}
        </div>
        {receipt._ptsEarned>0&&<div style={{padding:'8px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,marginBottom:16,fontSize:13,color:'#92400e',fontWeight:600}}>⭐ +{receipt._ptsEarned} loyalty points earned!</div>}
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{
            const w=window.open('','_blank','width=360,height=550');if(!w)return;
            w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:12px;padding:20px}h2{text-align:center;margin-bottom:4px}.c{text-align:center;color:#666;font-size:10px}.l{border-top:1px dashed #999;margin:8px 0}.r{display:flex;justify-content:space-between;margin-bottom:4px}.big{font-size:18px;font-weight:bold}</style></head><body><h2>NuxFashion</h2><p class="c">KSA · ZATCA Compliant</p><div class="l"></div><div class="r"><span>Order</span><span>#${receipt.order_number}</span></div><div class="r"><span>Method</span><span>${receipt._method}</span></div><div class="l"></div>${receipt._totalDisc>0?`<div class="r"><span>Discount</span><span style="color:red">-SAR ${receipt._totalDisc.toFixed(2)}</span></div>`:''}<div class="l"></div><div class="r big"><span>TOTAL</span><span>SAR ${receipt._cashDue?.toFixed(2)}</span></div>${receipt._change>0?`<div class="r" style="color:green"><span>Change</span><span>SAR ${receipt._change.toFixed(2)}</span></div>`:''}<div class="l"></div><div class="c">Thank you for shopping at NuxFashion!</div></body></html>`);w.document.close();w.print();
          }} style={{flex:1,padding:'10px 0',border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>🖨 Print</button>
          <button onClick={()=>setReceipt(null)} style={{flex:1,padding:'10px 0',border:'none',borderRadius:8,background:'#6366f1',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>+ New Sale</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 56px)',background:'#f3f4f6',overflow:'hidden'}}>

      {showCustModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80}} onClick={()=>{setShowCustModal(false);setCustSearch('');}}>
          <div style={{background:'#fff',borderRadius:16,width:440,maxHeight:480,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',gap:10}}>
              <i className="ti ti-search" style={{fontSize:16,color:'#999'}}/>
              <input autoFocus value={custSearch} onChange={e=>setCustSearch(e.target.value)} placeholder="Search name or phone…" style={{flex:1,border:'none',outline:'none',fontSize:14}}/>
              <button onClick={()=>{setShowCustModal(false);setCustSearch('');}} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              <div onClick={()=>{setCustId('');setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}} style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:10}} onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f5')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👤</div>
                <span style={{fontWeight:600,fontSize:13}}>Walk-in Customer</span>
              </div>
              {(customers as any[]).filter((c:any)=>!custSearch||c.name?.toLowerCase().includes(custSearch.toLowerCase())||c.phone?.includes(custSearch)).map((c:any)=>(
                <div key={c.id} onClick={()=>{setCustId(c.id);setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}} style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:12}} onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f5')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#6366f1'}}>{c.name.slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{c.name}</div><div style={{fontSize:11,color:'#999'}}>{c.phone||c.email||'—'} · {c.loyalty_points||0} pts</div></div>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:TIER_C[c.loyalty_tier||'bronze']+'22',color:TIER_C[c.loyalty_tier||'bronze'],fontWeight:700,textTransform:'capitalize'}}>{c.loyalty_tier||'Bronze'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showOrdersModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowOrdersModal(false)}>
          <div style={{background:'#fff',borderRadius:16,width:600,maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,fontSize:16}}>Recent Orders</span>
              <button onClick={()=>setShowOrdersModal(false)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#999'}}>×</button>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {(recentOrders as any[]).map((o:any)=>(
                <div key={o.id} style={{padding:'12px 20px',borderBottom:'1px solid #f5f5f5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{fontWeight:700,fontSize:13}}>#{o.order_number}</div><div style={{fontSize:11,color:'#999'}}>{new Date(o.created_at).toLocaleString('en-SA')}</div></div>
                  <div style={{textAlign:'right'}}><div style={{fontWeight:700,color:'#6366f1'}}>SAR {parseFloat(o.total||0).toFixed(2)}</div><div style={{fontSize:11,color:'#999'}}>{o.status}</div></div>
                </div>
              ))}
              {!(recentOrders as any[]).length&&<div style={{padding:40,textAlign:'center',color:'#999'}}>No orders yet</div>}
            </div>
          </div>
        </div>
      )}

      {showPayModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowPayModal(false)}>
          <div style={{background:'#fff',borderRadius:16,width:500,overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 20px',background:'#6366f1',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,fontSize:16}}>Complete Payment · SAR {cashDue.toFixed(2)}</span>
              <button onClick={()=>setShowPayModal(false)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'rgba(255,255,255,.7)'}}>×</button>
            </div>
            <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8,letterSpacing:.5}}>PAYMENT METHOD</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {METHODS.map(m=>(
                    <button key={m} onClick={()=>setMethod(m)} style={{padding:'10px 6px',borderRadius:10,border:`2px solid ${method===m?'#6366f1':'#e5e7eb'}`,background:method===m?'#ede9fe':'#fff',color:method===m?'#6366f1':'#666',fontWeight:method===m?700:400,cursor:'pointer',fontSize:12}}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:6,letterSpacing:.5}}>COUPON CODE</div>
                {appliedCoupon?<div style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:13}}><span style={{color:'#15803d',fontWeight:700}}>{appliedCoupon.code} — {appliedCoupon.type==='percentage'?appliedCoupon.value+'%':'SAR '+appliedCoupon.value} off</span><button onClick={()=>setAppliedCoupon(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button></div>:(
                  <div style={{display:'flex',gap:8}}><input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Enter coupon code" onKeyDown={e=>e.key==='Enter'&&applyCoupon()} style={{flex:1,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'monospace',fontWeight:700,letterSpacing:1}}/><button onClick={applyCoupon} disabled={!couponInput} style={{padding:'8px 16px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>Apply</button></div>
                )}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:6,letterSpacing:.5}}>GIFT CARD</div>
                {appliedGC?<div style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12}}><span style={{color:'#15803d',fontWeight:700}}>{appliedGC.code} · using SAR {gcUsed.toFixed(2)}</span><button onClick={()=>setAppliedGC(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button></div>:(
                  <div style={{display:'flex',gap:8}}><input value={gcInput} onChange={e=>setGcInput(e.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX" onKeyDown={e=>e.key==='Enter'&&applyGC()} style={{flex:1,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'monospace',fontWeight:700,letterSpacing:1}}/><button onClick={applyGC} disabled={!gcInput} style={{padding:'8px 16px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>Apply</button></div>
                )}
              </div>
              {customer&&(walletBal>0||custPoints>=10)&&(
                <div style={{display:'flex',gap:10}}>
                  {walletBal>0&&<label style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={useWallet} onChange={e=>setUseWallet(e.target.checked)}/><span>Wallet (SAR {walletBal.toFixed(2)})</span>{useWallet&&<span style={{marginLeft:'auto',color:'#27ae60',fontWeight:700}}>−{walletUsed.toFixed(2)}</span>}</label>}
                  {custPoints>=10&&<label style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={redeemPts} onChange={e=>setRedeemPts(e.target.checked)}/><span>Redeem {custPoints} pts</span>{redeemPts&&<span style={{marginLeft:'auto',color:'#27ae60',fontWeight:700}}>−{ptsVal.toFixed(2)}</span>}</label>}
                </div>
              )}
              {method==='Cash'&&cashDue>0&&(
                <div style={{padding:12,background:'#f8f9fa',borderRadius:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8,letterSpacing:.5}}>CASH RECEIVED</div>
                  <input type="number" value={cashGiven} onChange={e=>setCashGiven(e.target.value)} placeholder={cashDue.toFixed(2)} style={{width:'100%',padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:16,fontWeight:700,boxSizing:'border-box',marginBottom:8}}/>
                  <div style={{display:'flex',gap:6}}>{[50,100,200,500].map(a=>(<button key={a} onClick={()=>setCashGiven(String(a))} style={{flex:1,padding:'6px 4px',borderRadius:6,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:12}}>{a}</button>))}<button onClick={()=>setCashGiven(String(Math.ceil(cashDue/10)*10))} style={{flex:1,padding:'6px 4px',borderRadius:6,border:'1px solid #6366f1',background:'#ede9fe',color:'#6366f1',cursor:'pointer',fontSize:11,fontWeight:700}}>Exact+</button></div>
                  {change>0&&<div style={{marginTop:8,padding:'6px 12px',background:'#f0fdf4',borderRadius:8,display:'flex',justifyContent:'space-between',fontSize:13,color:'#15803d',fontWeight:700}}><span>Change</span><span>SAR {change.toFixed(2)}</span></div>}
                  {cashGiven&&parseFloat(cashGiven)<cashDue&&<div style={{marginTop:6,fontSize:12,color:'#e74c3c',fontWeight:600}}>Short SAR {(cashDue-parseFloat(cashGiven)).toFixed(2)}</div>}
                </div>
              )}
              <input value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Order note (optional)…" style={{padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,background:'#fafafa'}}/>
              <button disabled={cart.length===0||chargeMut.isPending} onClick={()=>chargeMut.mutate()} style={{padding:'14px 0',borderRadius:12,background:cart.length===0?'#e5e7eb':'#6366f1',color:'#fff',border:'none',cursor:cart.length===0?'not-allowed':'pointer',fontSize:15,fontWeight:800,letterSpacing:.5}}>
                {chargeMut.isPending?'Processing…':`✓ Charge SAR ${cashDue.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 16px',background:'#fff',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#6366f1',color:'#fff',borderRadius:8,fontSize:12,fontWeight:700}}>
          <i className="ti ti-clock" style={{fontSize:14}}/><Clock/>
        </div>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 14px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:10}}>
          <i className="ti ti-barcode" style={{fontSize:16,color:'#9ca3af'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or scan barcode…" autoFocus style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13}}/>
          {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:18}}>×</button>}
        </div>
        <button onClick={()=>setShowCustModal(true)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',border:`2px solid ${custId?'#6366f1':'#e5e7eb'}`,borderRadius:10,background:custId?'#ede9fe':'#fff',cursor:'pointer',fontSize:13,color:custId?'#6366f1':'#666',fontWeight:custId?700:400,whiteSpace:'nowrap'}}>
          <i className={'ti '+(custId?'ti-user-check':'ti-user-search')} style={{fontSize:15}}/>
          <span style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'}}>{customer?customer.name:'Select Customer'}</span>
          {custId&&<span onClick={e=>{e.stopPropagation();setCustId('');setUseWallet(false);setRedeemPts(false);}} style={{fontSize:18,color:'#9ca3af',cursor:'pointer',marginLeft:4}}>×</span>}
        </button>
        {customer&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 10px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:11}}>
          <span style={{color:TIER_C[tier],fontWeight:700,textTransform:'capitalize'}}>{tier}</span>
          <span style={{color:'#92400e'}}>·</span>
          <span style={{color:'#92400e',fontWeight:600}}>{custPoints} pts</span>
          <span style={{color:'#92400e'}}>·</span>
          <span style={{color:'#27ae60',fontWeight:600}}>SAR {walletBal.toFixed(2)}</span>
        </div>}
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13}}>
          <span style={{color:'#666'}}>Disc</span>
          <input type="number" value={discPct} onChange={e=>setDiscPct(e.target.value)} placeholder="0" min="0" max="100" style={{width:40,border:'none',outline:'none',fontSize:13,fontWeight:700,textAlign:'center'}}/>
          <span style={{color:'#6366f1',fontWeight:700}}>%</span>
        </div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{width:80,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8,gap:2,overflowY:'auto',flexShrink:0}}>
          <button onClick={()=>setCatFilter('')} style={{width:68,padding:'10px 4px',borderRadius:10,border:'none',background:catFilter===''?'#ede9fe':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,marginBottom:4}}>
            <div style={{width:40,height:40,borderRadius:10,background:catFilter===''?'#6366f1':'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-layout-grid" style={{fontSize:18,color:catFilter===''?'#fff':'#666'}}/>
            </div>
            <span style={{fontSize:9,fontWeight:600,color:catFilter===''?'#6366f1':'#666',textAlign:'center',lineHeight:1.2}}>All</span>
          </button>
          {(categories as any[]).map((cat:any,i:number)=>{
            const icon=CAT_ICONS[cat.name]||CAT_ICONS['default'];
            const active=catFilter===cat.id;
            return(
              <button key={cat.id} onClick={()=>setCatFilter(active?'':cat.id)} style={{width:68,padding:'8px 4px',borderRadius:10,border:'none',background:active?'#ede9fe':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:40,height:40,borderRadius:10,background:active?'#6366f1':BG_COLORS[i%BG_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className={'ti '+icon} style={{fontSize:18,color:active?'#fff':'#555'}}/>
                </div>
                <span style={{fontSize:9,fontWeight:600,color:active?'#6366f1':'#666',textAlign:'center',lineHeight:1.2,maxWidth:64,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat.name}</span>
              </button>
            );
          })}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:12}}>
          {filteredVariants.length===0&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#9ca3af',gap:12}}>
              <i className="ti ti-search-off" style={{fontSize:48}}/><div style={{fontSize:15,fontWeight:600}}>No products found</div>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12}}>
            {filteredVariants.map((v:any,i:number)=>{
              const qty=cartQty(v.id);
              const inCart=qty>0;
              return(
                <div key={v.id} onClick={()=>addToCart(v)} style={{background:'#fff',borderRadius:14,overflow:'hidden',cursor:'pointer',border:`2px solid ${inCart?'#6366f1':'transparent'}`,boxShadow:inCart?'0 0 0 4px #ede9fe':'0 1px 4px rgba(0,0,0,.06)',transition:'all .15s',position:'relative'}}>
                  {inCart&&<div style={{position:'absolute',top:8,right:8,width:22,height:22,background:'#6366f1',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',zIndex:1}}>{qty}</div>}
                  <div style={{height:110,background:BG_COLORS[i%BG_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className={'ti '+(CAT_ICONS[v.categoryName]||'ti-hanger')} style={{fontSize:42,color:'rgba(0,0,0,.2)'}}/>
                  </div>
                  <div style={{padding:'8px 10px'}}>
                    <div style={{fontSize:9,color:'#9ca3af',marginBottom:2}}>{v.categoryName}</div>
                    <div style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:6}}>{v.productName}{v.name&&v.name!=='Default'?' · '+v.name:''}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontWeight:800,fontSize:13,color:'#111'}}>SAR {parseFloat(v.selling_price||0).toFixed(0)}</span>
                      {inCart?(
                        <div style={{display:'flex',alignItems:'center',gap:4}} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setQty(v.id,qty-1)} style={{width:22,height:22,borderRadius:'50%',border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>−</button>
                          <span style={{fontWeight:800,fontSize:13,minWidth:16,textAlign:'center'}}>{qty}</span>
                          <button onClick={()=>setQty(v.id,qty+1)} style={{width:22,height:22,borderRadius:'50%',border:'none',background:'#6366f1',color:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
                        </div>
                      ):(
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#ede9fe',color:'#6366f1',fontWeight:600}}>+ Add</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{width:320,background:'#fff',borderLeft:'1px solid #e5e7eb',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:800,fontSize:15}}>Order List</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,padding:'2px 10px',borderRadius:6,background:'#ede9fe',color:'#6366f1',fontWeight:700}}>{cart.reduce((s,i)=>s+i.qty,0)} items</span>
              {cart.length>0&&<button onClick={()=>setCart([])} style={{fontSize:11,padding:'2px 10px',borderRadius:6,background:'#fef2f2',color:'#e74c3c',fontWeight:600,border:'none',cursor:'pointer'}}>Clear all</button>}
            </div>
          </div>
          {autoPromo&&!appliedCoupon&&(
            <div style={{margin:'8px 12px 0',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,display:'flex',justifyContent:'space-between',fontSize:12}}>
              <span style={{color:'#15803d',fontWeight:600}}>🏷 {autoPromo.name} ({autoPromo.discount_value}% off)</span>
              <span style={{fontWeight:700,color:'#15803d'}}>−SAR {promoDisc.toFixed(2)}</span>
            </div>
          )}
          <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
            {cart.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#d1d5db',gap:10}}>
                <i className="ti ti-shopping-cart" style={{fontSize:48}}/><span style={{fontSize:13,fontWeight:600}}>Cart is empty</span>
              </div>
            ):cart.map((item,i)=>(
              <div key={item.id} style={{padding:'10px 16px',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:8,background:BG_COLORS[i%BG_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className={'ti '+(CAT_ICONS[item.category]||'ti-hanger')} style={{fontSize:16,color:'rgba(0,0,0,.3)'}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>SAR {item.price.toFixed(2)} each</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <button onClick={()=>setQty(item.id,item.qty-1)} style={{width:22,height:22,borderRadius:'50%',border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13}}>−</button>
                  <span style={{fontWeight:700,minWidth:18,textAlign:'center',fontSize:13}}>{item.qty}</span>
                  <button onClick={()=>setQty(item.id,item.qty+1)} style={{width:22,height:22,borderRadius:'50%',border:'none',background:'#6366f1',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13}}>+</button>
                </div>
                <div style={{textAlign:'right',minWidth:64}}>
                  <div style={{fontWeight:700,fontSize:13}}>SAR {(item.price*item.qty).toFixed(2)}</div>
                  <button onClick={()=>removeFromCart(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:12,padding:0}}>remove</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'12px 16px',borderTop:'1px solid #f0f0f0',background:'#fafafa'}}>
            {[['Subtotal',`SAR ${sub.toFixed(2)}`,''],totalDisc>0&&['Discount',`− SAR ${totalDisc.toFixed(2)}`,'#e74c3c'],['VAT 15%',`SAR ${tax.toFixed(2)}`,''],gcUsed>0&&['Gift card',`− SAR ${gcUsed.toFixed(2)}`,'#27ae60'],walletUsed>0&&['Wallet',`− SAR ${walletUsed.toFixed(2)}`,'#27ae60'],ptsVal>0&&[`Points`,`− SAR ${ptsVal.toFixed(2)}`,'#27ae60']].filter(Boolean).map((r:any)=>(
              <div key={r[0]} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:r[2]||'#666'}}><span>{r[0]}</span><span style={{fontWeight:r[2]?700:400}}>{r[1]}</span></div>
            ))}
            <div style={{borderTop:'2px dashed #e5e7eb',paddingTop:10,marginTop:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:800,fontSize:14}}>Total Due</span>
              <span style={{fontWeight:900,fontSize:22,color:'#6366f1'}}>SAR {cashDue.toFixed(2)}</span>
            </div>
            {ptsEarned>0&&cart.length>0&&<div style={{fontSize:10,color:'#f59e0b',textAlign:'right',marginTop:2,fontWeight:600}}>+{ptsEarned} pts will be earned</div>}
          </div>
        </div>
      </div>

      <div style={{display:'flex',padding:'0 12px',height:56,background:'#1e1b4b',alignItems:'center',gap:8,flexShrink:0}}>
        {[
          {label:'Hold',icon:'ti-player-pause',color:'#f59e0b',bg:'rgba(245,158,11,.15)',action:()=>{if(!cart.length){toast('Cart is empty','error');return;}const held=JSON.parse(localStorage.getItem('held_orders')||'[]');const note=prompt('Note for held order:');held.push({id:'Hold-'+Date.now(),cart,custId,time:new Date().toLocaleTimeString(),note:note||''});localStorage.setItem('held_orders',JSON.stringify(held));resetSale();toast('Order held','info');}},
          {label:'Void',icon:'ti-ban',color:'#e74c3c',bg:'rgba(231,76,60,.15)',action:()=>{if(cart.length&&confirm('Void current sale?'))resetSale();}},
          {label:'Payment',icon:'ti-credit-card',color:'#fff',bg:'#6366f1',action:()=>{if(!cart.length){toast('Add items first','error');return;}setShowPayModal(true);}},
          {label:'View Orders',icon:'ti-list',color:'#6ee7b7',bg:'rgba(110,231,183,.15)',action:()=>setShowOrdersModal(true)},
          {label:'Reset',icon:'ti-refresh',color:'#93c5fd',bg:'rgba(147,197,253,.15)',action:()=>{if(confirm('Reset sale?'))resetSale();}},
          {label:'New Customer',icon:'ti-user-plus',color:'#c4b5fd',bg:'rgba(196,181,253,.15)',action:()=>setShowCustModal(true)},
        ].map(btn=>(
          <button key={btn.label} onClick={btn.action} style={{flex:btn.label==='Payment'?2:1,height:40,display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:btn.bg,color:btn.color,border:'none',borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:700}} onMouseEnter={e=>(e.currentTarget.style.opacity='.8')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
            <i className={'ti '+btn.icon} style={{fontSize:15}}/>{btn.label}
          </button>
        ))}
        <div style={{marginLeft:'auto',color:'rgba(255,255,255,.4)',fontSize:11,whiteSpace:'nowrap'}}><i className="ti ti-shield-check" style={{marginRight:4}}/>ZATCA</div>
      </div>
    </div>
  );
}
