import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; category:string; size?:string; color?:string; discount?:number; }

const METHODS=['Cash','Card','Tabby','Tamara','Apple Pay','Mada','Bank Transfer'];
const TIER_RATE:Record<string,number>={bronze:.2,silver:.25,gold:.33,platinum:.5};
const TIER_C:Record<string,string>={bronze:'#cd7f32',silver:'#aaa',gold:'#f59e0b',platinum:'#6366f1'};
const CAT_ICONS:Record<string,string>={'Abayas':'ti-shirt','Dresses':'ti-shirt','Tops':'ti-shirt','Bottoms':'ti-layout-bottombar','Bags':'ti-briefcase','Shoes':'ti-shoe','Accessories':'ti-diamond','Perfumes':'ti-bottle','Kids':'ti-baby-carriage','Sale':'ti-tag','Men':'ti-man','Women':'ti-woman','default':'ti-hanger'};
const BG=['#fde8ef','#e8f0fe','#e8fde8','#fef3e8','#f0e8fe','#e8fef3','#fefde8','#e8f8fe'];
const sar=(n:number)=>'SAR '+n.toFixed(2);
const getStoredCoupons=()=>{try{return JSON.parse(sessionStorage.getItem('coupons')||'[]');}catch{return[];}};
const getStoredGiftCards=()=>{try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return[];}};
const getWalletBalance=(c:any)=>{if(!c)return 0;try{const ws=JSON.parse(sessionStorage.getItem('wallets')||'[]');const w=ws.find((x:any)=>x.customer===c.name);return w?w.balance:parseFloat(c?.wallet_balance||0);}catch{return 0;}};

function Clock(){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  return <span style={{fontWeight:700,letterSpacing:1}}>{t.toLocaleTimeString('en-SA',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>;
}

function VariantPicker({product,onAdd,onClose}:{product:any;onAdd:(v:any)=>void;onClose:()=>void}){
  const variants:any[]=product.variants||[];
  const sizes=[...new Set(variants.map((v:any)=>v.size).filter(Boolean))] as string[];
  const colors=[...new Set(variants.map((v:any)=>v.color).filter(Boolean))] as string[];
  const [sz,setSz]=useState(sizes[0]||'');
  const [cl,setCl]=useState(colors[0]||'');
  const match=variants.find((v:any)=>(sizes.length===0||v.size===sz)&&(colors.length===0||v.color===cl))||variants[0];
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,width:360,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.25)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:700,fontSize:15}}>{product.name}</div>{match&&<div style={{fontSize:11,color:'#666'}}>SKU: {match.sku||'—'}</div>}</div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#999'}}>×</button>
        </div>
        <div style={{padding:20,display:'grid',gap:14}}>
          {sizes.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>SIZE</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{sizes.map(s=><button key={s} onClick={()=>setSz(s)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${sz===s?'#6366f1':'#e5e7eb'}`,background:sz===s?'#ede9fe':'#fff',color:sz===s?'#6366f1':'#333',fontWeight:sz===s?700:400,cursor:'pointer',fontSize:13}}>{s}</button>)}</div></div>}
          {colors.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>COLOR</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{colors.map(c=><button key={c} onClick={()=>setCl(c)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${cl===c?'#6366f1':'#e5e7eb'}`,background:cl===c?'#ede9fe':'#fff',color:cl===c?'#6366f1':'#333',fontWeight:cl===c?700:400,cursor:'pointer',fontSize:13}}>{c}</button>)}</div></div>}
          {match&&<div style={{padding:'12px 14px',background:'#f8f9fa',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:11,color:'#666'}}>Price</div><div style={{fontWeight:800,fontSize:20,color:'#6366f1'}}>{sar(parseFloat(match.selling_price||0))}</div></div>
            {match.stock_quantity!==undefined&&<div style={{fontSize:12,color:match.stock_quantity>0?'#10b981':'#ef4444',fontWeight:600}}>{match.stock_quantity>0?`${match.stock_quantity} in stock`:'Out of stock'}</div>}
          </div>}
          <button onClick={()=>{if(match){onAdd({...match,productName:product.name,categoryName:product.categoryName||''});onClose();}}} disabled={!match}
            style={{padding:'12px 0',borderRadius:10,background:match?'#6366f1':'#e5e7eb',color:'#fff',border:'none',cursor:match?'pointer':'not-allowed',fontSize:14,fontWeight:700}}>
            + Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

function HeldOrders({onRetrieve,onClose}:{onRetrieve:(o:any)=>void;onClose:()=>void}){
  const [held,setHeld]=useState<any[]>(()=>{try{return JSON.parse(localStorage.getItem('held_orders')||'[]');}catch{return[];}});
  const del=(id:string)=>{const n=held.filter(h=>h.id!==id);localStorage.setItem('held_orders',JSON.stringify(n));setHeld(n);};
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,width:500,maxHeight:'70vh',display:'flex',flexDirection:'column',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontWeight:700,fontSize:16}}>Held Orders ({held.length})</span>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#999'}}>×</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {held.length===0&&<div style={{padding:40,textAlign:'center',color:'#999'}}>No held orders</div>}
          {held.map((h:any)=>(
            <div key={h.id} style={{padding:'12px 20px',borderBottom:'1px solid #f5f5f5'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div><div style={{fontWeight:700,fontSize:13}}>{h.id}</div><div style={{fontSize:11,color:'#999'}}>{h.time} · {h.cart?.length} items{h.note?' · '+h.note:''}</div></div>
                <div style={{fontWeight:700,fontSize:14,color:'#6366f1'}}>{sar(h.cart?.reduce((s:number,i:any)=>s+i.price*i.qty,0)||0)}</div>
              </div>
              <div style={{fontSize:11,color:'#666',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.cart?.map((i:any)=>i.name).join(', ')}</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>{onRetrieve(h);del(h.id);onClose();}} style={{flex:1,padding:'6px 0',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>Retrieve</button>
                <button onClick={()=>del(h.id)} style={{padding:'6px 14px',borderRadius:8,background:'#fef2f2',color:'#ef4444',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function POSSale(){
  const {toast}=useToast();
  const qc=useQueryClient();
  const searchRef=useRef<HTMLInputElement>(null);
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
  const [cashGiven,setCashGiven]=useState('');
  const [orderNote,setOrderNote]=useState('');
  const [showOrders,setShowOrders]=useState(false);
  const [showHeld,setShowHeld]=useState(false);
  const [pickerProd,setPickerProd]=useState<any>(null);
  const [editDisc,setEditDisc]=useState<string|null>(null);

  useEffect(()=>{
    try{
      const stored=localStorage.getItem('resume_cart');
      if(!stored)return;
      const held=JSON.parse(stored);
      setCart(Array.isArray(held.cart)?held.cart:[]);
      setCustId(held.custId||'');
      setMethod(held.method||'Cash');
      setDiscPct(held.discPct||'');
      setOrderNote(held.orderNote||held.note||'');
      localStorage.removeItem('resume_cart');
      toast('Held order resumed','success');
    }catch{
      localStorage.removeItem('resume_cart');
      toast('Unable to resume held order','error');
    }
  },[]);

  const {data:prodData=[]}=useQuery({queryKey:['products'],queryFn:()=>api.get('/catalog/products').then(r=>r.data)});
  const {data:whData=[]}=useQuery<any[]>({queryKey:['warehouses'],queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:custData=[]}=useQuery({queryKey:['customers'],queryFn:()=>api.get('/customers').then(r=>r.data)});
  const {data:catData=[]}=useQuery({queryKey:['categories'],queryFn:()=>api.get('/catalog/categories').then(r=>r.data).catch(()=>[])});
  const {data:recentOrders=[]}=useQuery({queryKey:['pos-orders'],queryFn:()=>api.get('/sales/orders?limit=20').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[]).catch(()=>[])});

  const products:any[]=Array.isArray(prodData)?prodData:( prodData as any)?.products||( prodData as any)?.data||[];
  const warehouses:any[]=Array.isArray(whData)?whData:[];
  const customers:any[]=Array.isArray(custData)?custData:( custData as any)?.customers||( custData as any)?.data||[];
  const categories:any[]=Array.isArray(catData)?catData:[];
  const customer=customers.find((c:any)=>c.id===custId);
  const tier=customer?.loyalty_tier||'bronze';
  const custPoints=customer?.loyalty_points||0;
  const walletBal=getWalletBalance(customer);
  const defaultWarehouseId=warehouses[0]?.id??null;

  const filteredProducts=products.filter((p:any)=>{
    if(p.is_active===false||(p.tags||[]).includes('channel:no-pos'))return false;
    const ms=!search||p.name?.toLowerCase().includes(search.toLowerCase())||(p.variants||[]).some((v:any)=>v.sku?.toLowerCase().includes(search.toLowerCase()));
    const mc=!catFilter||p.category_id===catFilter;
    return ms&&mc;
  });

  const sub=cart.reduce((s,i)=>s+i.price*i.qty-(i.discount||0),0);
  const manualDisc=sub*(parseFloat(discPct||'0')/100);
  const couponDisc=appliedCoupon?(appliedCoupon.type==='percentage'?sub*appliedCoupon.value/100:Math.min(appliedCoupon.value,sub)):0;
  const totalDisc=Math.min(manualDisc+couponDisc,sub);
  const taxable=Math.max(sub-totalDisc,0);
  const tax=taxable*0.15;
  const gross=taxable+tax;
  const walletUsed=useWallet?Math.min(walletBal,gross):0;
  const gcUsed=appliedGC?Math.min(appliedGC.balance,gross-walletUsed):0;
  const ptsVal=redeemPts&&custPoints>=10?Math.min(custPoints*0.1,gross-walletUsed-gcUsed):0;
  const ptsUsed=Math.ceil(ptsVal/0.1);
  const cashDue=Math.max(gross-walletUsed-gcUsed-ptsVal,0);
  const change=parseFloat(cashGiven||'0')-cashDue;
  const ptsEarned=customer?Math.floor(cashDue*(TIER_RATE[tier]||0.2)):0;

  const addToCart=(v:any)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===v.id);
      if(ex)return prev.map(i=>i.id===v.id?{...i,qty:i.qty+1}:i);
      const label=`${v.productName||v.name}${v.size?' · '+v.size:''}${v.color?' · '+v.color:''}`;
      return[...prev,{id:v.id,sku:v.sku||'',name:label,price:parseFloat(v.selling_price||0),qty:1,category:v.categoryName||'',size:v.size,color:v.color}];
    });
  };
  const removeFromCart=(id:string)=>setCart(p=>p.filter(i=>i.id!==id));
  const setQty=(id:string,qty:number)=>{if(qty<=0)removeFromCart(id);else setCart(p=>p.map(i=>i.id===id?{...i,qty}:i));};
  const setItemDisc=(id:string,d:number)=>setCart(p=>p.map(i=>i.id===id?{...i,discount:d}:i));
  const cartQtyForProduct=(p:any)=>cart.filter(i=>(p.variants||[]).some((v:any)=>v.id===i.id)).reduce((s,i)=>s+i.qty,0);

  const applyCoupon=()=>{
    const f=getStoredCoupons().find((c:any)=>c.code===couponInput.toUpperCase()&&c.is_active&&(!c.expires||new Date(c.expires)>new Date()));
    if(!f){toast('Invalid or expired coupon','error');return;}
    setAppliedCoupon(f);setCouponInput('');toast('Coupon applied!','success');
  };
  const applyGC=()=>{
    const f=getStoredGiftCards().find((g:any)=>g.code===gcInput.toUpperCase()&&g.is_active&&g.balance>0);
    if(!f){toast('Invalid gift card','error');return;}
    setAppliedGC(f);setGcInput('');toast('Gift card applied!','success');
  };

  const resetSale=()=>{setCart([]);setDiscPct('');setCustId('');setAppliedCoupon(null);setAppliedGC(null);setUseWallet(false);setRedeemPts(false);setCashGiven('');setOrderNote('');setShowPayModal(false);setTimeout(()=>searchRef.current?.focus(),100);};

  const holdSale=()=>{
    if(!cart.length){toast('Cart is empty','error');return;}
    try{
      const stored=localStorage.getItem('held_orders');
      const parsed=stored?JSON.parse(stored):[];
      const held=Array.isArray(parsed)?parsed:[];
      held.push({
        id:`HOLD-${Date.now()}`,
        heldAt:Date.now(),
        cart,
        custId,
        method,
        discPct,
        orderNote,
        time:new Date().toLocaleString(),
        note:orderNote,
      });
      localStorage.setItem('held_orders',JSON.stringify(held));
      resetSale();
      toast('Order held successfully','success');
    }catch{
      toast('Unable to hold order. Please clear browser storage and try again.','error');
    }
  };

  const chargeMut=useMutation({
    mutationFn:async()=>{
      const body:any={customer_id:custId||null,lines:cart.map(i=>({variant_id:i.id,quantity:i.qty,unit_price:i.price,discount_amount:i.discount||0})),subtotal:sub,tax_amount:tax,discount_amount:totalDisc,total:gross,notes:orderNote||undefined};
      if(defaultWarehouseId)body.warehouse_id=defaultWarehouseId;
      const order=await api.post('/sales/orders',body);
      const payments:any[]=[];
      if(gcUsed>0)payments.push({method:'gift_card',amount:gcUsed,reference:appliedGC?.code});
      if(walletUsed>0)payments.push({method:'wallet',amount:walletUsed});
      if(ptsVal>0)payments.push({method:'loyalty_points',amount:ptsVal,reference:ptsUsed+' pts'});
      if(cashDue>0)payments.push({method:method.toLowerCase().replace(/ /g,'_'),amount:cashDue});
      if(payments.length)await api.post('/sales/payments',{order_id:order.data.id,payments});
      return order.data;
    },
    onSuccess:(d:any)=>{
      qc.invalidateQueries({queryKey:['dashboard']});qc.invalidateQueries({queryKey:['pos-orders']});
      toast(`Order #${d.order_number} complete`,'success');
      setReceipt({...d,_cashDue:cashDue,_change:change>0?change:0,_method:method,_gcUsed:gcUsed,_walletUsed:walletUsed,_ptsUsed:ptsUsed,_ptsEarned:ptsEarned,_totalDisc:totalDisc,_items:[...cart]});
      resetSale();
    },
    onError:(e:any)=>toast(getErr(e),'error'),
  });

  if(receipt)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#f3f4f6'}}>
      <div style={{background:'#fff',borderRadius:20,padding:40,maxWidth:440,width:'100%',boxShadow:'0 8px 40px rgba(0,0,0,.12)',textAlign:'center'}}>
        <div style={{fontSize:56,marginBottom:8}}>✅</div>
        <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Payment Successful</div>
        <div style={{fontSize:13,color:'#666',marginBottom:20}}>Order #{receipt.order_number} · {receipt._method}</div>
        <div style={{background:'#f8f9fa',borderRadius:12,padding:16,marginBottom:16,textAlign:'left'}}>
          {(receipt._items||[]).map((it:any)=><div key={it.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span>{it.name} ×{it.qty}</span><span style={{fontWeight:600}}>{sar(it.price*it.qty)}</span></div>)}
          <div style={{borderTop:'1px dashed #ddd',marginTop:8,paddingTop:8}}>
            {receipt._totalDisc>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#e74c3c'}}><span>Discount</span><span>−{sar(receipt._totalDisc)}</span></div>}
            {receipt._gcUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#27ae60'}}><span>Gift card</span><span>−{sar(receipt._gcUsed)}</span></div>}
            {receipt._walletUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#27ae60'}}><span>Wallet</span><span>−{sar(receipt._walletUsed)}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8,alignItems:'center'}}>
              <span style={{fontWeight:700}}>Total Charged</span>
              <span style={{fontWeight:900,fontSize:22,color:'#6366f1'}}>{sar(receipt._cashDue||0)}</span>
            </div>
            {receipt._change>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#27ae60',fontWeight:700,marginTop:4}}><span>Change</span><span>{sar(receipt._change)}</span></div>}
          </div>
        </div>
        {receipt._ptsEarned>0&&<div style={{padding:'8px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,marginBottom:16,fontSize:13,color:'#92400e',fontWeight:600}}>⭐ +{receipt._ptsEarned} loyalty points earned!</div>}
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{
            const w=window.open('','_blank','width=380,height=620');if(!w)return;
            w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:12px;padding:20px}h2{text-align:center;font-size:16px;margin-bottom:2px}.c{text-align:center;color:#666;font-size:10px;margin-bottom:2px}.l{border-top:1px dashed #999;margin:8px 0}.r{display:flex;justify-content:space-between;margin-bottom:3px}.big{font-size:16px;font-weight:bold}</style></head><body><h2>NuxFashion</h2><p class="c">ERP · POS · E-Commerce</p><p class="c">ZATCA Compliant VAT Invoice</p><div class="l"></div><div class="r"><span>Order#</span><span>${receipt.order_number}</span></div><div class="r"><span>Date</span><span>${new Date().toLocaleDateString('en-SA')}</span></div><div class="r"><span>Method</span><span>${receipt._method}</span></div><div class="l"></div>${(receipt._items||[]).map((it:any)=>`<div class="r"><span>${it.name.substring(0,22)} x${it.qty}</span><span>SAR ${(it.price*it.qty).toFixed(2)}</span></div>`).join('')}<div class="l"></div>${receipt._totalDisc>0?`<div class="r" style="color:red"><span>Discount</span><span>-SAR ${receipt._totalDisc.toFixed(2)}</span></div>`:''}<div class="l"></div><div class="r big"><span>TOTAL</span><span>SAR ${(receipt._cashDue||0).toFixed(2)}</span></div>${receipt._change>0?`<div class="r" style="color:green"><span>Change</span><span>SAR ${receipt._change.toFixed(2)}</span></div>`:''}<div class="l"></div><div class="c">شكراً لتسوقك في نكس فاشن</div><div class="c">Thank you for shopping!</div></body></html>`);
            w.document.close();w.print();
          }} style={{flex:1,padding:'12px 0',border:'1px solid #ddd',borderRadius:10,background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>🖨 Print Receipt</button>
          <button onClick={()=>setReceipt(null)} style={{flex:1,padding:'12px 0',border:'none',borderRadius:10,background:'#6366f1',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>+ New Sale</button>
        </div>
      </div>
    </div>
  );

  const CustModal=()=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80}} onClick={()=>{setShowCustModal(false);setCustSearch('');}}>
      <div style={{background:'#fff',borderRadius:16,width:440,maxHeight:480,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',gap:10}}>
          <i className="ti ti-search" style={{fontSize:16,color:'#999'}}/>
          <input autoFocus value={custSearch} onChange={e=>setCustSearch(e.target.value)} placeholder="Search name or phone…" style={{flex:1,border:'none',outline:'none',fontSize:14}}/>
          <button onClick={()=>{setShowCustModal(false);setCustSearch('');}} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#999'}}>×</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          <div onClick={()=>{setCustId('');setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}} style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:10}} onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f5')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👤</div>
            <span style={{fontWeight:600,fontSize:13}}>Walk-in Customer</span>
          </div>
          {customers.filter((c:any)=>!custSearch||c.name?.toLowerCase().includes(custSearch.toLowerCase())||c.phone?.includes(custSearch)).map((c:any)=>(
            <div key={c.id} onClick={()=>{setCustId(c.id);setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}} style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:12}} onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f5')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#6366f1'}}>{c.name?.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{c.name}</div>
                <div style={{fontSize:11,color:'#999'}}>{c.phone||c.email||'—'} · {c.loyalty_points||0} pts · {sar(parseFloat(c.wallet_balance||0))}</div>
              </div>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:(TIER_C[c.loyalty_tier||'bronze']||'#cd7f32')+'22',color:TIER_C[c.loyalty_tier||'bronze']||'#cd7f32',fontWeight:700,textTransform:'capitalize'}}>{c.loyalty_tier||'Bronze'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const OrdersModal=()=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowOrders(false)}>
      <div style={{background:'#fff',borderRadius:16,width:580,maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontWeight:700,fontSize:16}}>Recent Orders</span>
          <button onClick={()=>setShowOrders(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#999'}}>×</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {(recentOrders as any[]).map((o:any)=>(
            <div key={o.id} style={{padding:'12px 20px',borderBottom:'1px solid #f5f5f5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontWeight:700,fontSize:13}}>#{o.order_number}</div><div style={{fontSize:11,color:'#999'}}>{new Date(o.created_at).toLocaleString('en-SA')}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontWeight:700,color:'#6366f1'}}>{sar(parseFloat(o.total||0))}</div><div style={{fontSize:11,color:'#999'}}>{o.status}</div></div>
            </div>
          ))}
          {!(recentOrders as any[]).length&&<div style={{padding:40,textAlign:'center',color:'#999'}}>No orders yet</div>}
        </div>
      </div>
    </div>
  );

  const PaymentModal=()=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowPayModal(false)}>
      <div style={{background:'#fff',borderRadius:20,width:520,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 24px',background:'#6366f1',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontWeight:800,fontSize:18}}>Payment — {sar(cashDue)}</span>
          <button onClick={()=>setShowPayModal(false)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'rgba(255,255,255,.7)'}}>×</button>
        </div>
        <div style={{padding:20,display:'flex',flexDirection:'column',gap:14,overflowY:'auto'}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>PAYMENT METHOD</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {METHODS.map(m=><button key={m} onClick={()=>setMethod(m)} style={{padding:'9px 4px',borderRadius:10,border:`2px solid ${method===m?'#6366f1':'#e5e7eb'}`,background:method===m?'#ede9fe':'#fff',color:method===m?'#6366f1':'#555',fontWeight:method===m?700:400,cursor:'pointer',fontSize:11}}>{m}</button>)}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:6}}>COUPON / GIFT CARD</div>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              {appliedCoupon?<div style={{flex:1,display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12}}><span style={{color:'#15803d',fontWeight:700}}>{appliedCoupon.code} — {appliedCoupon.type==='percentage'?appliedCoupon.value+'%':'SAR '+appliedCoupon.value} off</span><button onClick={()=>setAppliedCoupon(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button></div>:(
                <><input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="COUPON CODE" onKeyDown={e=>e.key==='Enter'&&applyCoupon()} style={{flex:1,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'monospace',letterSpacing:1}}/><button onClick={applyCoupon} style={{padding:'8px 14px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontWeight:600,fontSize:12}}>Apply</button></>
              )}
            </div>
            <div style={{display:'flex',gap:8}}>
              {appliedGC?<div style={{flex:1,display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12}}><span style={{color:'#15803d',fontWeight:700}}>{appliedGC.code} · using {sar(gcUsed)}</span><button onClick={()=>setAppliedGC(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button></div>:(
                <><input value={gcInput} onChange={e=>setGcInput(e.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX" onKeyDown={e=>e.key==='Enter'&&applyGC()} style={{flex:1,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'monospace',letterSpacing:1}}/><button onClick={applyGC} style={{padding:'8px 14px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontWeight:600,fontSize:12}}>Apply</button></>
              )}
            </div>
          </div>
          {customer&&(walletBal>0||custPoints>=10)&&(
            <div style={{display:'flex',gap:8}}>
              {walletBal>0&&<label style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer',fontSize:12}}>
                <input type="checkbox" checked={useWallet} onChange={e=>setUseWallet(e.target.checked)}/><span>Wallet ({sar(walletBal)})</span>
                {useWallet&&<span style={{marginLeft:'auto',color:'#10b981',fontWeight:700}}>−{sar(walletUsed)}</span>}
              </label>}
              {custPoints>=10&&<label style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer',fontSize:12}}>
                <input type="checkbox" checked={redeemPts} onChange={e=>setRedeemPts(e.target.checked)}/><span>Redeem {custPoints} pts</span>
                {redeemPts&&<span style={{marginLeft:'auto',color:'#10b981',fontWeight:700}}>−{sar(ptsVal)}</span>}
              </label>}
            </div>
          )}
          {method==='Cash'&&cashDue>0&&(
            <div style={{padding:12,background:'#f8f9fa',borderRadius:10}}>
              <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>CASH RECEIVED</div>
              <input type="number" value={cashGiven} onChange={e=>setCashGiven(e.target.value)} placeholder={cashDue.toFixed(2)} style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:18,fontWeight:700,boxSizing:'border-box',marginBottom:8}}/>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                {[50,100,200,500].map(a=><button key={a} onClick={()=>setCashGiven(String(a))} style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:13}}>{a}</button>)}
                <button onClick={()=>setCashGiven(String(Math.ceil(cashDue/10)*10))} style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #6366f1',background:'#ede9fe',color:'#6366f1',cursor:'pointer',fontSize:11,fontWeight:700}}>Round↑</button>
              </div>
              {change>0&&<div style={{padding:'6px 12px',background:'#f0fdf4',borderRadius:8,display:'flex',justifyContent:'space-between',fontSize:13,color:'#15803d',fontWeight:700}}><span>Change</span><span>{sar(change)}</span></div>}
              {cashGiven&&parseFloat(cashGiven)<cashDue&&<div style={{marginTop:4,fontSize:12,color:'#ef4444',fontWeight:600}}>⚠ Short {sar(cashDue-parseFloat(cashGiven))}</div>}
            </div>
          )}
          <input value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Order note (optional)…" style={{padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13}}/>
          <button disabled={cart.length===0||chargeMut.isPending} onClick={()=>chargeMut.mutate()} style={{padding:'16px 0',borderRadius:12,background:cart.length===0?'#e5e7eb':'#6366f1',color:'#fff',border:'none',cursor:cart.length===0?'not-allowed':'pointer',fontSize:15,fontWeight:800}}>
            {chargeMut.isPending?'Processing…':`✓ Charge ${sar(cashDue)}`}
          </button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 56px)',background:'#f3f4f6',overflow:'hidden'}}>
      {showCustModal&&<CustModal/>}
      {showPayModal&&<PaymentModal/>}
      {showOrders&&<OrdersModal/>}
      {showHeld&&<HeldOrders onRetrieve={h=>{setCart(Array.isArray(h.cart)?h.cart:[]);setCustId(h.custId||'');setMethod(h.method||'Cash');setDiscPct(h.discPct||'');setOrderNote(h.orderNote||h.note||'');}} onClose={()=>setShowHeld(false)}/>}
      {pickerProd&&<VariantPicker product={pickerProd} onAdd={addToCart} onClose={()=>setPickerProd(null)}/>}

      {/* Top bar */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:'#fff',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:'#6366f1',color:'#fff',borderRadius:8,fontSize:12,fontWeight:700,flexShrink:0}}><i className="ti ti-clock" style={{fontSize:13}}/><Clock/></div>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:10}}>
          <i className="ti ti-barcode" style={{fontSize:15,color:'#9ca3af'}}/>
          <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or scan barcode…" autoFocus style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13}}/>
          {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:18}}>×</button>}
        </div>
        <button onClick={()=>setShowCustModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',border:`2px solid ${custId?'#6366f1':'#e5e7eb'}`,borderRadius:10,background:custId?'#ede9fe':'#fff',cursor:'pointer',fontSize:12,color:custId?'#6366f1':'#666',fontWeight:custId?700:400,flexShrink:0}}>
          <i className={'ti '+(custId?'ti-user-check':'ti-user-search')} style={{fontSize:14}}/>
          <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{customer?customer.name:'Customer'}</span>
          {custId&&<span onClick={e=>{e.stopPropagation();setCustId('');setUseWallet(false);setRedeemPts(false);}} style={{fontSize:16,color:'#9ca3af',cursor:'pointer'}}>×</span>}
        </button>
        {customer&&<div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:11,flexShrink:0}}>
          <span style={{color:TIER_C[tier]||'#cd7f32',fontWeight:700,textTransform:'capitalize'}}>{tier}</span>·
          <span style={{color:'#92400e',fontWeight:600}}>{custPoints} pts</span>·
          <span style={{color:'#059669',fontWeight:600}}>{sar(walletBal)}</span>
        </div>}
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,flexShrink:0}}>
          <span style={{color:'#666'}}>Disc</span>
          <input type="number" value={discPct} onChange={e=>setDiscPct(e.target.value)} placeholder="0" min="0" max="100" style={{width:36,border:'none',outline:'none',fontSize:13,fontWeight:700,textAlign:'center'}}/>
          <span style={{color:'#6366f1',fontWeight:700}}>%</span>
        </div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Category sidebar */}
        <div style={{width:76,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:6,gap:2,overflowY:'auto',flexShrink:0}}>
          <button onClick={()=>setCatFilter('')} style={{width:64,padding:'8px 4px',borderRadius:10,border:'none',background:catFilter===''?'#ede9fe':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,marginBottom:4}}>
            <div style={{width:38,height:38,borderRadius:10,background:catFilter===''?'#6366f1':'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-layout-grid" style={{fontSize:17,color:catFilter===''?'#fff':'#666'}}/></div>
            <span style={{fontSize:9,fontWeight:600,color:catFilter===''?'#6366f1':'#666'}}>All</span>
          </button>
          {categories.map((cat:any,i:number)=>{
            const icon=CAT_ICONS[cat.name]||CAT_ICONS['default'];const active=catFilter===cat.id;
            return(<button key={cat.id} onClick={()=>setCatFilter(active?'':cat.id)} style={{width:64,padding:'7px 4px',borderRadius:10,border:'none',background:active?'#ede9fe':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <div style={{width:38,height:38,borderRadius:10,background:active?'#6366f1':BG[i%BG.length],display:'flex',alignItems:'center',justifyContent:'center'}}><i className={'ti '+icon} style={{fontSize:17,color:active?'#fff':'#555'}}/></div>
              <span style={{fontSize:9,fontWeight:600,color:active?'#6366f1':'#666',textAlign:'center',maxWidth:60,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat.name}</span>
            </button>);
          })}
        </div>

        {/* Product grid */}
        <div style={{flex:1,overflowY:'auto',padding:12}}>
          {filteredProducts.length===0?(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#9ca3af',gap:12}}><i className="ti ti-search-off" style={{fontSize:48}}/><div style={{fontSize:15,fontWeight:600}}>No products found</div></div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))',gap:10}}>
              {filteredProducts.map((p:any,i:number)=>{
                const qty=cartQtyForProduct(p);const inCart=qty>0;
                const firstV=p.variants?.[0];const price=firstV?parseFloat(firstV.selling_price||0):0;
                const hasVars=(p.variants||[]).length>1;
                const catName=categories.find((c:any)=>c.id===p.category_id)?.name||'';
                return(<div key={p.id} onClick={()=>hasVars?setPickerProd({...p,categoryName:catName}):firstV&&addToCart({...firstV,productName:p.name,categoryName:catName})}
                  style={{background:'#fff',borderRadius:12,overflow:'hidden',cursor:'pointer',border:`2px solid ${inCart?'#6366f1':'transparent'}`,boxShadow:inCart?'0 0 0 3px #ede9fe':'0 1px 3px rgba(0,0,0,.06)',transition:'all .15s',position:'relative'}}>
                  {inCart&&<div style={{position:'absolute',top:7,right:7,width:20,height:20,background:'#6366f1',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',zIndex:1}}>{qty}</div>}
                  <div style={{height:100,background:BG[i%BG.length],display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {p.images?.[0]?<img src={p.images[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={p.name}/>:<i className={'ti '+(CAT_ICONS[catName]||'ti-hanger')} style={{fontSize:38,color:'rgba(0,0,0,.18)'}}/>}
                  </div>
                  <div style={{padding:'7px 9px'}}>
                    <div style={{fontSize:9,color:'#9ca3af',marginBottom:1}}>{catName}</div>
                    <div style={{fontWeight:700,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:4}}>{p.name}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontWeight:800,fontSize:12}}>{sar(price)}</span>
                      <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:hasVars?'#fef3e8':'#ede9fe',color:hasVars?'#d97706':'#6366f1',fontWeight:600}}>{hasVars?`${p.variants.length} vars`:'+ Add'}</span>
                    </div>
                  </div>
                </div>);
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <div style={{width:310,background:'#fff',borderLeft:'1px solid #e5e7eb',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:800,fontSize:14}}>Order List</span>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'#ede9fe',color:'#6366f1',fontWeight:700}}>{cart.length} items</span>
              {cart.length>0&&<button onClick={()=>setCart([])} style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'#fef2f2',color:'#ef4444',fontWeight:600,border:'none',cursor:'pointer'}}>Clear</button>}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
            {cart.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#d1d5db',gap:8}}><i className="ti ti-shopping-cart" style={{fontSize:44}}/><span style={{fontSize:13,fontWeight:600}}>Cart is empty</span></div>
            ):cart.map(item=>(
              <div key={item.id} style={{padding:'8px 14px',borderBottom:'1px solid #f5f5f5'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                  <div style={{width:30,height:30,borderRadius:6,background:BG[cart.indexOf(item)%BG.length],display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><i className={'ti '+(CAT_ICONS[item.category]||'ti-hanger')} style={{fontSize:14,color:'rgba(0,0,0,.25)'}}/></div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div><div style={{fontSize:10,color:'#9ca3af'}}>{sar(item.price)} each</div></div>
                  <button onClick={()=>removeFromCart(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#d1d5db',fontSize:16,flexShrink:0,padding:0}}>×</button>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <button onClick={()=>setQty(item.id,item.qty-1)} style={{width:20,height:20,borderRadius:'50%',border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>−</button>
                    <span style={{fontWeight:700,fontSize:13,minWidth:16,textAlign:'center'}}>{item.qty}</span>
                    <button onClick={()=>setQty(item.id,item.qty+1)} style={{width:20,height:20,borderRadius:'50%',border:'none',background:'#6366f1',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>+</button>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,fontSize:12}}>{sar(item.price*item.qty-(item.discount||0))}</div>
                    {editDisc===item.id?(
                      <input autoFocus type="number" defaultValue={item.discount||0} onBlur={e=>{setItemDisc(item.id,parseFloat(e.target.value)||0);setEditDisc(null);}} style={{width:60,padding:'2px 4px',border:'1px solid #e5e7eb',borderRadius:4,fontSize:10,textAlign:'right'}} placeholder="disc SAR"/>
                    ):(
                      <button onClick={()=>setEditDisc(item.id)} style={{fontSize:9,color:'#9ca3af',background:'none',border:'none',cursor:'pointer',padding:0}}>{item.discount?`-${sar(item.discount)}`:'item disc'}</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'10px 14px',borderTop:'1px solid #f0f0f0',background:'#fafafa'}}>
            {([[`Subtotal`,sar(sub),''],totalDisc>0?[`Discount`,'− '+sar(totalDisc),'#e74c3c']:null,[`VAT 15%`,sar(tax),''],gcUsed>0?['Gift card','− '+sar(gcUsed),'#27ae60']:null,walletUsed>0?['Wallet','− '+sar(walletUsed),'#27ae60']:null,ptsVal>0?[`Points (${ptsUsed})`,'− '+sar(ptsVal),'#27ae60']:null] as any[]).filter(Boolean).map((r:any)=>(
              <div key={r[0]} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3,color:r[2]||'#666'}}><span>{r[0]}</span><span style={{fontWeight:r[2]?700:400}}>{r[1]}</span></div>
            ))}
            <div style={{borderTop:'2px dashed #e5e7eb',paddingTop:8,marginTop:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:800,fontSize:13}}>Total Due</span>
              <span style={{fontWeight:900,fontSize:20,color:'#6366f1'}}>{sar(cashDue)}</span>
            </div>
            {ptsEarned>0&&cart.length>0&&<div style={{fontSize:10,color:'#f59e0b',textAlign:'right',fontWeight:600}}>+{ptsEarned} pts will be earned</div>}
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div style={{display:'flex',padding:'0 10px',height:52,background:'#1e1b4b',alignItems:'center',gap:6,flexShrink:0}}>
        {[
          {label:'Hold',icon:'ti-player-pause',color:'#fbbf24',bg:'rgba(251,191,36,.15)',action:holdSale},
          {label:'Retrieve',icon:'ti-player-play',color:'#6ee7b7',bg:'rgba(110,231,183,.15)',action:()=>setShowHeld(true)},
          {label:'Orders',icon:'ti-list',color:'#93c5fd',bg:'rgba(147,197,253,.15)',action:()=>setShowOrders(true)},
          {label:'Void',icon:'ti-ban',color:'#f87171',bg:'rgba(248,113,113,.15)',action:()=>{if(cart.length&&confirm('Void current sale?'))resetSale();}},
          {label:'Payment',icon:'ti-credit-card',color:'#fff',bg:'#6366f1',action:()=>{if(!cart.length){toast('Add items first','error');return;}setShowPayModal(true);}},
        ].map(btn=>(
          <button key={btn.label} onClick={btn.action} style={{flex:btn.label==='Payment'?2:1,height:40,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:btn.bg,color:btn.color,border:'none',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:700}} onMouseEnter={e=>(e.currentTarget.style.opacity='.75')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
            <i className={'ti '+btn.icon} style={{fontSize:14}}/>{btn.label}
          </button>
        ))}
        <div style={{marginLeft:'auto',color:'rgba(255,255,255,.3)',fontSize:10,whiteSpace:'nowrap',flexShrink:0}}><i className="ti ti-shield-check" style={{marginRight:3}}/>ZATCA</div>
      </div>
    </div>
  );
}
