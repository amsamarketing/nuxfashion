import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; category:string; size?:string; color?:string; discount?:number; }

const METHODS=['Cash','Card','Tabby','Tamara','Apple Pay','Mada','Bank Transfer'];
const TIER_RATE:Record<string,number>={bronze:.2,silver:.25,gold:.33,platinum:.5};
const TIER_C:Record<string,string>={bronze:'#cd7f32',silver:'#aaa',gold:'#f59e0b',platinum:'#0f766e'};
const CAT_ICONS:Record<string,string>={'Abayas':'ti-shirt','Dresses':'ti-shirt','Tops':'ti-shirt','Bottoms':'ti-layout-bottombar','Bags':'ti-briefcase','Shoes':'ti-shoe','Accessories':'ti-diamond','Perfumes':'ti-bottle','Kids':'ti-baby-carriage','Sale':'ti-tag','Men':'ti-man','Women':'ti-woman','default':'ti-hanger'};
const BG=['#fde8ef','#e8f0fe','#e8fde8','#fef3e8','#f0e8fe','#e8fef3','#fefde8','#e8f8fe'];
const sar=(n:number)=>'SAR '+n.toFixed(2);
const getStoredGiftCards=()=>{try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return[];}};
const getWalletBalance=(c:any)=>{if(!c)return 0;try{const ws=JSON.parse(sessionStorage.getItem('wallets')||'[]');const w=ws.find((x:any)=>x.customer===c.name);return w?w.balance:parseFloat(c?.wallet_balance||0);}catch{return 0;}};
const zatcaTlv=(seller:string,vatNumber:string,timestamp:string,total:number,vat:number)=>{
  const bytes:number[]=[];
  [seller,vatNumber,timestamp,total.toFixed(2),vat.toFixed(2)].forEach((value,index)=>{
    const encoded=new TextEncoder().encode(value);bytes.push(index+1,encoded.length,...encoded);
  });
  return btoa(String.fromCharCode(...bytes));
};
const invoiceBarcode=(invoiceNumber:string)=>{
  const canvas=document.createElement('canvas');
  JsBarcode(canvas,invoiceNumber,{format:'CODE128',displayValue:true,fontSize:14,height:52,margin:4,background:'#ffffff',lineColor:'#111827'});
  return canvas.toDataURL('image/png');
};

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
          {sizes.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>SIZE</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{sizes.map(s=><button key={s} onClick={()=>setSz(s)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${sz===s?'#0f766e':'#e5e7eb'}`,background:sz===s?'#ccfbf1':'#fff',color:sz===s?'#0f766e':'#333',fontWeight:sz===s?700:400,cursor:'pointer',fontSize:13}}>{s}</button>)}</div></div>}
          {colors.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>COLOR</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{colors.map(c=><button key={c} onClick={()=>setCl(c)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${cl===c?'#0f766e':'#e5e7eb'}`,background:cl===c?'#ccfbf1':'#fff',color:cl===c?'#0f766e':'#333',fontWeight:cl===c?700:400,cursor:'pointer',fontSize:13}}>{c}</button>)}</div></div>}
          {match&&<div style={{padding:'12px 14px',background:'#f8f9fa',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:11,color:'#666'}}>Price</div><div style={{fontWeight:800,fontSize:20,color:'#0f766e'}}>{sar(parseFloat(match.selling_price||0))}</div></div>
            {match.stock_quantity!==undefined&&<div style={{fontSize:12,color:match.stock_quantity>0?'#10b981':'#ef4444',fontWeight:600}}>{match.stock_quantity>0?`${match.stock_quantity} in stock`:'Out of stock'}</div>}
          </div>}
          <button onClick={()=>{if(match){onAdd({...match,productName:product.name,categoryName:product.categoryName||''});onClose();}}} disabled={!match}
            style={{padding:'12px 0',borderRadius:10,background:match?'#0f766e':'#e5e7eb',color:'#fff',border:'none',cursor:match?'pointer':'not-allowed',fontSize:14,fontWeight:700}}>
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
                <div style={{fontWeight:700,fontSize:14,color:'#0f766e'}}>{sar(h.cart?.reduce((s:number,i:any)=>s+i.price*i.qty,0)||0)}</div>
              </div>
              <div style={{fontSize:11,color:'#666',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.cart?.map((i:any)=>i.name).join(', ')}</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>{onRetrieve(h);del(h.id);onClose();}} style={{flex:1,padding:'6px 0',borderRadius:8,background:'#0f766e',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>Retrieve</button>
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
  const customerPhoneRef=useRef<HTMLInputElement>(null);
  const [search,setSearch]=useState('');
  const [cart,setCart]=useState<CartItem[]>([]);
  const [method,setMethod]=useState('Cash');
  const [custId,setCustId]=useState('');
  const [discPct,setDiscPct]=useState('');
  const [discMode,setDiscMode]=useState<'percent'|'fixed'>('percent');
  const [splitPayment,setSplitPayment]=useState(false);
  const [splitAmounts,setSplitAmounts]=useState<Record<string,string>>({});
  const [receipt,setReceipt]=useState<any>(null);
  const [showPayModal,setShowPayModal]=useState(false);
  const [showCustModal,setShowCustModal]=useState(false);
  const [custSearch,setCustSearch]=useState('');
  const [newCustName,setNewCustName]=useState('');
  const [newCustPhone,setNewCustPhone]=useState('');
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
  const [orderSearch,setOrderSearch]=useState('');
  const [printingOrder,setPrintingOrder]=useState('');
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
  const {data:whData=[]}=useQuery<any[]>({queryKey:['pos-branches'],queryFn:()=>api.get('/branches/my').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[]))});
  const {data:custData=[]}=useQuery({queryKey:['customers'],queryFn:()=>api.get('/customers').then(r=>r.data)});
  const {data:catData=[]}=useQuery({queryKey:['categories'],queryFn:()=>api.get('/catalog/categories').then(r=>r.data).catch(()=>[])});
  const {data:recentOrders=[]}=useQuery({queryKey:['pos-orders'],queryFn:()=>api.get('/sales/orders?limit=20').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[]).catch(()=>[])});
  const {data:currentSession}=useQuery<any>({queryKey:['pos-current-session'],queryFn:()=>api.get('/sales/sessions/current').then(r=>r.data)});

  const products:any[]=Array.isArray(prodData)?prodData:( prodData as any)?.products||( prodData as any)?.data||[];
  const warehouses:any[]=Array.isArray(whData)?whData:[];
  const customers:any[]=Array.isArray(custData)?custData:( custData as any)?.customers||( custData as any)?.data||[];
  const {data:custDetail}=useQuery({queryKey:['cust-detail',custId],enabled:!!custId,queryFn:()=>api.get(`/customers/${custId}`).then(r=>r.data)});
  const {data:custOrders=[]}=useQuery<any[]>({queryKey:['cust-orders',custId],enabled:!!custId,queryFn:()=>api.get(`/customers/${custId}/orders`).then(r=>r.data)});
  const categories:any[]=Array.isArray(catData)?catData:[];
  const customer=customers.find((c:any)=>c.id===custId);
  const phoneDigits=(value:any)=>String(value||'').replace(/\D/g,'');
  const phoneMatch=phoneDigits(newCustPhone).length>=7?customers.find((c:any)=>phoneDigits(c.phone)===phoneDigits(newCustPhone)):null;
  const tier=customer?.loyalty_tier||'bronze';
  const custPoints=customer?.loyalty_points||0;
  const walletBal=getWalletBalance(customer);
  const defaultWarehouseId=currentSession?.warehouse_id??warehouses[0]?.id??null;
  const quickCustomer=useMutation({
    mutationFn:()=>api.post('/customers',{name:newCustName.trim(),phone:newCustPhone.trim()}),
    onSuccess:async r=>{setCustId(r.data.id);setNewCustName('');setNewCustPhone('');setShowCustModal(false);await qc.invalidateQueries({queryKey:['customers']});toast('Customer added','success');},
    onError:(e:any)=>toast(getErr(e),'error'),
  });

  const filteredProducts=products.filter((p:any)=>{
    if(p.is_active===false||(p.tags||[]).includes('channel:no-pos'))return false;
    const q=search.toLowerCase();
    const ms=!search||p.name?.toLowerCase().includes(q)||p.name_ar?.toLowerCase().includes(q)||(p.variants||[]).some((v:any)=>v.sku?.toLowerCase().includes(q)||v.barcode?.toLowerCase().includes(q));
    const mc=!catFilter||p.category_id===catFilter;
    return ms&&mc;
  });

  const sub=cart.reduce((s,i)=>s+i.price*i.qty-(i.discount||0),0);
  const manualDisc=discMode==='percent'?sub*(Math.min(100,parseFloat(discPct||'0'))/100):Math.min(sub,parseFloat(discPct||'0'));
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
  const splitLines=METHODS.map(paymentMethod=>({method:paymentMethod,amount:Math.max(0,parseFloat(splitAmounts[paymentMethod]||'0'))})).filter(line=>line.amount>0);
  const splitPaid=splitLines.reduce((sum,line)=>sum+line.amount,0);
  const splitRemaining=Math.max(0,cashDue-splitPaid);
  const splitComplete=!splitPayment||(splitLines.length>=2&&Math.abs(splitPaid-cashDue)<0.01);
  const change=!splitPayment&&method==='Cash'?parseFloat(cashGiven||'0')-cashDue:0;
  const ptsEarned=customer?Math.floor(cashDue*(TIER_RATE[tier]||0.2)):0;

  const addToCart=(v:any)=>{
    const price=parseFloat(v.selling_price||0);
    if(price<=0){toast('Selling price is required before this product can be sold','error');return;}
    setCart(prev=>{
      const ex=prev.find(i=>i.id===v.id);
      if(ex)return prev.map(i=>i.id===v.id?{...i,qty:i.qty+1}:i);
      const label=`${v.productName||v.name}${v.size?' · '+v.size:''}${v.color?' · '+v.color:''}`;
      return[...prev,{id:v.id,sku:v.sku||'',name:label,price,qty:1,category:v.categoryName||'',size:v.size,color:v.color}];
    });
  };
  const scanOrAddProduct=()=>{
    const q=search.trim().toLowerCase();
    if(!q)return;
    for(const product of products){
      if(product.is_active===false||(product.tags||[]).includes('channel:no-pos'))continue;
      const variant=(product.variants||[]).find((v:any)=>(v.barcode||'').toLowerCase()===q||(v.sku||'').toLowerCase()===q);
      if(variant){
        const catName=categories.find((c:any)=>c.id===product.category_id)?.name||'';
        addToCart({...variant,productName:product.name,categoryName:catName});
        setSearch('');setTimeout(()=>searchRef.current?.focus(),50);return;
      }
    }
    const exactProduct=products.find((p:any)=>p.is_active!==false&&!(p.tags||[]).includes('channel:no-pos')&&(p.name||'').toLowerCase()===q);
    if(exactProduct&&(exactProduct.variants||[]).length===1){
      const catName=categories.find((c:any)=>c.id===exactProduct.category_id)?.name||'';
      addToCart({...exactProduct.variants[0],productName:exactProduct.name,categoryName:catName});
      setSearch('');return;
    }
    toast('Barcode or exact SKU not found','error');
  };
  const removeFromCart=(id:string)=>setCart(p=>p.filter(i=>i.id!==id));
  const setQty=(id:string,qty:number)=>{if(qty<=0)removeFromCart(id);else setCart(p=>p.map(i=>i.id===id?{...i,qty}:i));};
  const setItemDisc=(id:string,d:number)=>setCart(p=>p.map(i=>i.id===id?{...i,discount:d}:i));
  const cartQtyForProduct=(p:any)=>cart.filter(i=>(p.variants||[]).some((v:any)=>v.id===i.id)).reduce((s,i)=>s+i.qty,0);

  const applyCoupon=async()=>{
    if(!couponInput.trim()){toast('Enter a coupon code','error');return;}
    try{
      const r=await api.get('/sales/discounts/validate-coupon',{params:{code:couponInput.trim().toUpperCase(),amount:sub,customer_id:custId||undefined}});
      const f=r.data.discount;
      setAppliedCoupon({...f,code:f.coupon_code});
      setCouponInput('');
      toast(`Coupon ${f.coupon_code} applied`,'success');
    }catch(e:any){setAppliedCoupon(null);toast(getErr(e),'error');}
  };
  const applyGC=()=>{
    const f=getStoredGiftCards().find((g:any)=>g.code===gcInput.toUpperCase()&&g.is_active&&g.balance>0);
    if(!f){toast('Invalid gift card','error');return;}
    setAppliedGC(f);setGcInput('');toast('Gift card applied!','success');
  };

  const resetSale=()=>{setCart([]);setDiscPct('');setDiscMode('percent');setSplitPayment(false);setSplitAmounts({});setCustId('');setAppliedCoupon(null);setAppliedGC(null);setUseWallet(false);setRedeemPts(false);setCashGiven('');setOrderNote('');setShowPayModal(false);setTimeout(()=>searchRef.current?.focus(),100);};

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
      if(!currentSession?.id)throw new Error('Start a POS shift before taking payment');
      if(!customer?.name||!customer?.phone)throw new Error('Customer name and phone are required before payment');
      const discounts:any[]=[];
      if(parseFloat(discPct||'0')>0)discounts.push({name:'POS Manual Discount',type:discMode==='percent'?'percentage':'fixed_amount',value:parseFloat(discPct)});
      if(appliedCoupon)discounts.push({name:appliedCoupon.name||`Coupon ${appliedCoupon.code}`,type:'coupon',value:appliedCoupon.value,coupon_code:appliedCoupon.code});
      const body:any={customer_id:custId,pos_session_id:currentSession.id,lines:cart.map(i=>({variant_id:i.id,quantity:i.qty,unit_price:i.price,discount_amount:i.discount||0})),discounts,subtotal:sub,tax_amount:tax,discount_amount:totalDisc,total:gross,notes:orderNote||undefined};
      if(defaultWarehouseId)body.warehouse_id=defaultWarehouseId;
      const order=await api.post('/sales/orders',body);
      const payments:any[]=[];
      if(gcUsed>0)payments.push({method:'gift_card',amount:gcUsed,reference:appliedGC?.code});
      if(walletUsed>0)payments.push({method:'wallet',amount:walletUsed});
      if(ptsVal>0)payments.push({method:'loyalty_points',amount:ptsVal,reference:ptsUsed+' pts'});
      if(splitPayment){
        splitLines.forEach(line=>payments.push({method:line.method.toLowerCase().replace(/ /g,'_'),amount:line.amount}));
      }else if(cashDue>0)payments.push({method:method.toLowerCase().replace(/ /g,'_'),amount:cashDue});
      if(payments.length)await api.post('/sales/payments',{order_id:order.data.id,payments});
      return {...order.data,_paymentLines:payments};
    },
    onSuccess:async(d:any)=>{
      qc.invalidateQueries({queryKey:['dashboard']});qc.invalidateQueries({queryKey:['pos-orders']});
      toast(`Order #${d.order_number} complete`,'success');
      const invoiceTime=d.created_at||new Date().toISOString();
      const vatNumber=import.meta.env.VITE_STORE_VAT_NUMBER||'VAT NUMBER NOT SET';
      const qr=await QRCode.toDataURL(zatcaTlv('NuxFashion',vatNumber,invoiceTime,gross,tax),{errorCorrectionLevel:'M',margin:1,width:180});
      const barcode=invoiceBarcode(String(d.order_number));
      setReceipt({...d,_qr:qr,_barcode:barcode,_invoiceTime:invoiceTime,_vatNumber:vatNumber,_customer:{name:customer.name,phone:customer.phone},_subtotal:sub,_tax:tax,_gross:gross,_cashDue:cashDue,_change:change>0?change:0,_method:splitPayment?splitLines.map(line=>`${line.method} ${sar(line.amount)}`).join(' + '):method,_gcUsed:gcUsed,_walletUsed:walletUsed,_ptsUsed:ptsUsed,_ptsEarned:ptsEarned,_totalDisc:totalDisc,_items:[...cart]});
      resetSale();
    },
    onError:(e:any)=>toast(getErr(e),'error'),
  });

  if(receipt)return(
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'center',height:'100%',overflowY:'auto',background:'#f3f4f6',padding:'24px 14px'}}>
      <div style={{background:'#fff',borderRadius:20,padding:40,maxWidth:440,width:'100%',boxShadow:'0 8px 40px rgba(0,0,0,.12)',textAlign:'center',margin:'auto 0'}}>
        <div style={{fontSize:56,marginBottom:8}}>✅</div>
        <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>Payment Successful</div>
        <div style={{fontSize:13,color:'#666',marginBottom:14}}>Tax Invoice #{receipt.order_number}</div>
        <div style={{display:'flex',justifyContent:'space-between',padding:'9px 12px',background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:9,marginBottom:10,textAlign:'left',fontSize:11}}><div><b>{receipt._customer?.name}</b><div style={{color:'#64748b'}}>{receipt._customer?.phone}</div></div><div style={{textAlign:'right'}}><b>{new Date(receipt._invoiceTime).toLocaleDateString('en-SA')}</b><div style={{color:'#64748b'}}>{new Date(receipt._invoiceTime).toLocaleTimeString('en-SA')}</div></div></div>
        <div style={{background:'#f8f9fa',borderRadius:12,padding:16,marginBottom:16,textAlign:'left'}}>
          {(receipt._items||[]).map((it:any)=><div key={it.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span>{it.name} ×{it.qty}</span><span style={{fontWeight:600}}>{sar(it.price*it.qty)}</span></div>)}
          <div style={{borderTop:'1px dashed #ddd',marginTop:8,paddingTop:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Subtotal</span><span>{sar(receipt._subtotal||0)}</span></div>
            {receipt._totalDisc>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#e74c3c'}}><span>Discount</span><span>−{sar(receipt._totalDisc)}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>VAT 15%</span><span>{sar(receipt._tax||0)}</span></div>
            {receipt._gcUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#27ae60'}}><span>Gift card</span><span>−{sar(receipt._gcUsed)}</span></div>}
            {receipt._walletUsed>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#27ae60'}}><span>Wallet</span><span>−{sar(receipt._walletUsed)}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8,alignItems:'center'}}>
              <span style={{fontWeight:700}}>Total Charged</span>
              <span style={{fontWeight:900,fontSize:22,color:'#0f766e'}}>{sar(receipt._cashDue||0)}</span>
            </div>
            {receipt._change>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#27ae60',fontWeight:700,marginTop:4}}><span>Change</span><span>{sar(receipt._change)}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:700,borderTop:'1px dashed #ddd',marginTop:8,paddingTop:7}}><span>Total Quantity</span><b>{(receipt._items||[]).reduce((sum:number,item:any)=>sum+Number(item.qty||0),0)}</b></div>
            <div style={{borderTop:'1px dashed #ddd',marginTop:7,paddingTop:7}}><div style={{fontSize:9,fontWeight:800,color:'#64748b',marginBottom:3}}>PAYMENT METHOD</div>{(receipt._paymentLines||[]).map((line:any,index:number)=><div key={index} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#475569'}}><span>{String(line.method).replace(/_/g,' ').toUpperCase()}</span><b>{sar(Number(line.amount||0))}</b></div>)}</div>
          </div>
        </div>
        {receipt._barcode&&<div style={{margin:'0 auto 12px',padding:'7px 10px',border:'1px dashed #cbd5e1',borderRadius:8}}><img src={receipt._barcode} alt={`Invoice ${receipt.order_number} barcode`} style={{display:'block',width:'100%',height:62,objectFit:'contain'}}/><div style={{fontSize:9,color:'#64748b',marginTop:2}}>Scan this barcode on the Returns screen</div></div>}
        {receipt._qr&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:12,textAlign:'left'}}><img src={receipt._qr} alt="ZATCA QR" style={{width:92,height:92}}/><div><div style={{fontSize:12,fontWeight:800,color:'#0f766e'}}>ZATCA QR Code</div><div style={{fontSize:10,color:'#64748b',maxWidth:150,lineHeight:1.4}}>Scan to verify seller, VAT, date and invoice totals.</div></div></div>}
        {receipt._ptsEarned>0&&<div style={{padding:'8px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,marginBottom:16,fontSize:13,color:'#92400e',fontWeight:600}}>⭐ +{receipt._ptsEarned} loyalty points earned!</div>}
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{
            const w=window.open('','_blank','width=380,height=620');if(!w)return;
            w.document.write(`<!DOCTYPE html><html><head><title>Tax Invoice ${receipt.order_number}</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{width:72mm;margin:0 auto;font-family:Arial,sans-serif;color:#111;font-size:11px}.brand{text-align:center;border-bottom:2px solid #0f766e;padding-bottom:8px}.brand h1{font-size:21px;margin:0;color:#0f766e;letter-spacing:.5px}.ar{text-align:center;direction:rtl;font-size:11px;font-weight:bold;margin:2px}.muted{text-align:center;color:#64748b;font-size:9px;margin:2px}.title{text-align:center;font-weight:bold;font-size:13px;margin:9px 0}.line{border-top:1px dashed #94a3b8;margin:7px 0}.r{display:flex;justify-content:space-between;gap:8px;margin:3px 0}.r span:first-child{max-width:68%}.items .r{padding:3px 0;border-bottom:1px dotted #e2e8f0}.total{font-size:16px;font-weight:900;color:#0f766e;padding:5px 0}.disc{color:#dc2626}.pay{font-size:10px;color:#334155}.barcode{text-align:center;margin:8px 0}.barcode img{width:68mm;height:18mm;object-fit:contain}.qr{text-align:center;margin:8px 0}.qr img{width:34mm;height:34mm}.footer{text-align:center;font-size:9px;color:#475569;line-height:1.5;margin-top:8px}</style></head><body>
              <div class="brand"><h1>NuxFashion</h1><div class="ar">نكس فاشن</div><div class="muted">Fashion Retail · Saudi Arabia</div><div class="muted">VAT No: ${receipt._vatNumber}</div></div>
              <div class="title">TAX INVOICE · فاتورة ضريبية</div>
              <div class="r"><span>Invoice</span><b>${receipt.order_number}</b></div><div class="r"><span>Date / التاريخ</span><span>${new Date(receipt._invoiceTime).toLocaleString('en-SA')}</span></div>
              <div class="r"><span>Customer</span><b>${receipt._customer?.name||''}</b></div><div class="r"><span>Phone</span><span>${receipt._customer?.phone||''}</span></div><div class="line"></div>
              <div class="items">${(receipt._items||[]).map((it:any)=>`<div class="r"><span><b>${it.name}</b><br><small>${[it.size,it.color].filter(Boolean).join(' · ')} · ${it.qty} × SAR ${it.price.toFixed(2)}</small></span><b>SAR ${(it.price*it.qty).toFixed(2)}</b></div>`).join('')}</div>
              <div class="line"></div><div class="r"><span>Subtotal</span><b>SAR ${(receipt._subtotal||0).toFixed(2)}</b></div>
              ${receipt._totalDisc>0?`<div class="r disc"><span>Discount / الخصم</span><b>− SAR ${receipt._totalDisc.toFixed(2)}</b></div>`:''}
              <div class="r"><span>VAT 15% / الضريبة</span><b>SAR ${(receipt._tax||0).toFixed(2)}</b></div><div class="r total"><span>TOTAL / الإجمالي</span><span>SAR ${(receipt._cashDue||0).toFixed(2)}</span></div>
              ${receipt._change>0?`<div class="r"><span>Change</span><b>SAR ${receipt._change.toFixed(2)}</b></div>`:''}<div class="line"></div><div class="r"><span><b>Total Quantity / إجمالي الكمية</b></span><b>${(receipt._items||[]).reduce((sum:number,item:any)=>sum+Number(item.qty||0),0)}</b></div><div class="line"></div>
              <b>PAYMENT / الدفع</b>${(receipt._paymentLines||[]).map((line:any)=>`<div class="r pay"><span>${String(line.method).replace(/_/g,' ').toUpperCase()}</span><b>SAR ${Number(line.amount||0).toFixed(2)}</b></div>`).join('')}
              <div class="barcode"><img src="${receipt._barcode}" alt="Invoice barcode"><div class="muted">SCAN FOR RETURN · امسح الباركود للاسترجاع</div></div>
              <div class="qr"><img src="${receipt._qr}" alt="ZATCA QR"><div class="muted">ZATCA QR · رمز هيئة الزكاة والضريبة والجمارك</div></div>
              <div class="line"></div><div class="footer"><b>Thank you for shopping!</b><br><b>شكراً لتسوقكم معنا</b><br>Returns accepted according to store policy with original invoice.</div>
              </body></html>`);
            w.document.close();w.print();
          }} style={{flex:1,padding:'12px 0',border:'1px solid #ddd',borderRadius:10,background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>🖨 Print Receipt</button>
          <button onClick={()=>setReceipt(null)} style={{flex:1,padding:'12px 0',border:'none',borderRadius:10,background:'#0f766e',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>+ New Sale</button>
        </div>
      </div>
    </div>
  );

  const CustModal=()=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2300,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80}} onClick={()=>{setShowCustModal(false);setCustSearch('');}}>
      <div style={{background:'#fff',borderRadius:16,width:440,maxHeight:480,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',gap:10}}>
          <i className="ti ti-search" style={{fontSize:16,color:'#999'}}/>
          <input autoFocus value={custSearch} onChange={e=>setCustSearch(e.target.value)} placeholder="Search name or phone…" style={{flex:1,border:'none',outline:'none',fontSize:14}}/>
          <button onClick={()=>{setShowCustModal(false);setCustSearch('');}} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#999'}}>×</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          <div style={{padding:14,borderBottom:'1px solid #e5e7eb',background:'#f8fafc'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f766e',marginBottom:8}}>QUICK ADD CUSTOMER — REQUIRED FOR PAYMENT</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
              <input value={newCustName} onChange={e=>setNewCustName(e.target.value)} placeholder="Customer name *" style={{padding:'9px 10px',border:'1px solid #d1d5db',borderRadius:8,fontSize:12}}/>
              <input value={newCustPhone} onChange={e=>setNewCustPhone(e.target.value)} placeholder="Phone *" inputMode="tel" style={{padding:'9px 10px',border:'1px solid #d1d5db',borderRadius:8,fontSize:12}}/>
            </div>
            <button className="btn-nx primary sm" style={{width:'100%',justifyContent:'center',marginTop:7}} disabled={!newCustName.trim()||!newCustPhone.trim()||quickCustomer.isPending} onClick={()=>quickCustomer.mutate()}>{quickCustomer.isPending?'Adding...':'Add & Select Customer'}</button>
          </div>
          {customers.filter((c:any)=>!custSearch||c.name?.toLowerCase().includes(custSearch.toLowerCase())||c.phone?.includes(custSearch)).map((c:any)=>(
            <div key={c.id} onClick={()=>{setCustId(c.id);setShowCustModal(false);setCustSearch('');setUseWallet(false);setRedeemPts(false);}} style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:12}} onMouseEnter={e=>(e.currentTarget.style.background='#f5f5f5')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'#ccfbf1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#0f766e'}}>{c.name?.slice(0,2).toUpperCase()}</div>
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

  const printDuplicate=async(orderId:string)=>{
    setPrintingOrder(orderId);
    try{
      const {data:o}=await api.get('/sales/orders/'+orderId);
      const payments=Array.isArray(o.payments)?o.payments:[];
      const lines=Array.isArray(o.lines)?o.lines:[];
      const paid=payments.reduce((sum:number,p:any)=>sum+Number(p.amount||0),0);
      const total=paid||Number(o.total||0);
      const tax=Number(o.tax_amount||o.vat_amount||0)||(total*15/115);
      const subtotal=Number(o.subtotal||o.sub_total||0);
      const discount=Number(o.discount_amount||0);
      const vatNumber=import.meta.env.VITE_STORE_VAT_NUMBER||'VAT NUMBER NOT SET';
      const invoiceTime=o.created_at||new Date().toISOString();
      const qr=await QRCode.toDataURL(zatcaTlv('NuxFashion',vatNumber,invoiceTime,total,tax),{errorCorrectionLevel:'M',margin:1,width:180});
      const barcode=invoiceBarcode(String(o.order_number));
      const w=window.open('','_blank','width=380,height=700');if(!w)return;
      w.document.write(`<!DOCTYPE html><html><head><title>Duplicate Invoice ${o.order_number}</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{width:72mm;margin:0 auto;font-family:Arial,sans-serif;color:#111;font-size:11px}.brand{text-align:center;border-bottom:2px solid #0f766e;padding-bottom:7px}.brand h1{font-size:21px;margin:0;color:#0f766e}.ar{text-align:center;direction:rtl;font-weight:bold;margin:2px}.muted{text-align:center;color:#64748b;font-size:9px;margin:2px}.copy{text-align:center;border:2px solid #111;padding:4px;margin:8px 0;font-size:12px;font-weight:900;letter-spacing:1px}.title{text-align:center;font-weight:bold;font-size:13px;margin:8px 0}.line{border-top:1px dashed #94a3b8;margin:7px 0}.r{display:flex;justify-content:space-between;gap:8px;margin:3px 0}.r span:first-child{max-width:68%}.items .r{padding:3px 0;border-bottom:1px dotted #e2e8f0}.total{font-size:16px;font-weight:900;color:#0f766e;padding:5px 0}.disc{color:#dc2626}.barcode,.qr{text-align:center;margin:8px 0}.barcode img{width:68mm;height:18mm;object-fit:contain}.qr img{width:34mm;height:34mm}.footer{text-align:center;font-size:9px;color:#475569;line-height:1.5}</style></head><body>
        <div class="brand"><h1>NuxFashion</h1><div class="ar">نكس فاشن</div><div class="muted">VAT No: ${vatNumber}</div></div><div class="copy">DUPLICATE COPY · نسخة مكررة</div><div class="title">TAX INVOICE · فاتورة ضريبية</div>
        <div class="r"><span>Invoice</span><b>${o.order_number}</b></div><div class="r"><span>Original date</span><span>${new Date(invoiceTime).toLocaleString('en-SA')}</span></div><div class="r"><span>Customer</span><b>${o.customer_name||'Walk-in'}</b></div>${o.customer_phone?`<div class="r"><span>Phone</span><span>${o.customer_phone}</span></div>`:''}<div class="line"></div>
        <div class="items">${lines.map((line:any)=>`<div class="r"><span><b>${line.product_name||line.variant_name||line.sku||'Product'}</b><br><small>${line.quantity} × SAR ${Number(line.unit_price||0).toFixed(2)}</small></span><b>SAR ${Number(line.line_total||Number(line.unit_price||0)*Number(line.quantity||0)).toFixed(2)}</b></div>`).join('')}</div>
        <div class="line"></div><div class="r"><span>Subtotal</span><b>SAR ${subtotal.toFixed(2)}</b></div>${discount>0?`<div class="r disc"><span>Discount / الخصم</span><b>− SAR ${discount.toFixed(2)}</b></div>`:''}<div class="r"><span>VAT 15% / الضريبة</span><b>SAR ${tax.toFixed(2)}</b></div><div class="r total"><span>TOTAL / الإجمالي</span><span>SAR ${total.toFixed(2)}</span></div>
        <div class="line"></div><div class="r"><span><b>Total Quantity / إجمالي الكمية</b></span><b>${lines.reduce((sum:number,line:any)=>sum+Number(line.quantity||0),0)}</b></div><div class="line"></div><b>PAYMENT / الدفع</b>${payments.map((p:any)=>`<div class="r"><span>${String(p.method||'').replace(/_/g,' ').toUpperCase()}</span><b>SAR ${Number(p.amount||0).toFixed(2)}</b></div>`).join('')}<div class="barcode"><img src="${barcode}"><div class="muted">SCAN FOR RETURN · امسح الباركود للاسترجاع</div></div><div class="qr"><img src="${qr}"><div class="muted">ZATCA QR</div></div><div class="line"></div><div class="footer"><b>Duplicate printed ${new Date().toLocaleString('en-SA')}</b><br>Returns accepted according to store policy with original invoice.</div></body></html>`);
      w.document.close();w.print();
    }catch(e:any){toast(getErr(e),'error');}
    finally{setPrintingOrder('');}
  };

  const filteredRecentOrders=(recentOrders as any[]).filter((o:any)=>!orderSearch.trim()||(o.order_number||'').toLowerCase().includes(orderSearch.trim().toLowerCase())||(o.customer_name||'').toLowerCase().includes(orderSearch.trim().toLowerCase()));

  const OrdersModal=()=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowOrders(false)}>
      <div style={{background:'#fff',borderRadius:16,width:580,maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><span style={{fontWeight:700,fontSize:16}}>Recent Orders</span><div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Reprint any completed sale as a duplicate copy</div></div>
          <button onClick={()=>setShowOrders(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#999'}}>×</button>
        </div>
        <div style={{padding:'10px 14px',borderBottom:'1px solid #f1f5f9'}}><div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:'1px solid #d1d5db',borderRadius:9,background:'#f8fafc'}}><i className="ti ti-search" style={{color:'#94a3b8'}}/><input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="Search invoice number or customer…" style={{flex:1,border:0,outline:0,background:'transparent',fontSize:12}}/></div></div>
        <div style={{overflowY:'auto',flex:1}}>
          {filteredRecentOrders.map((o:any)=>(
            <div key={o.id} style={{padding:'12px 20px',borderBottom:'1px solid #f5f5f5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontWeight:700,fontSize:13}}>#{o.order_number}</div><div style={{fontSize:11,color:'#999'}}>{new Date(o.created_at).toLocaleString('en-SA')} · {o.customer_name||'Walk-in'}</div></div>
              <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{textAlign:'right'}}><div style={{fontWeight:700,color:'#0f766e'}}>{sar(parseFloat(o.total||0))}</div><div style={{fontSize:10,color:'#999'}}>{o.status}</div></div><button disabled={printingOrder===o.id} onClick={()=>printDuplicate(o.id)} style={{padding:'7px 10px',border:'1px solid #99f6e4',borderRadius:8,background:'#f0fdfa',color:'#0f766e',fontSize:11,fontWeight:700,cursor:'pointer'}}><i className="ti ti-printer"/> {printingOrder===o.id?'Loading…':'Duplicate'}</button></div>
            </div>
          ))}
          {!filteredRecentOrders.length&&<div style={{padding:40,textAlign:'center',color:'#999'}}>No matching orders</div>}
        </div>
      </div>
    </div>
  );

  const PaymentModal=()=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowPayModal(false)}>
      <div style={{background:'#fff',borderRadius:20,width:520,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 24px',background:'#0f766e',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontWeight:800,fontSize:18}}>Payment — {sar(cashDue)}</span>
          <button onClick={()=>setShowPayModal(false)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'rgba(255,255,255,.7)'}}>×</button>
        </div>
        <div style={{padding:20,display:'flex',flexDirection:'column',gap:14,overflowY:'auto'}}>
          {customer?.name&&customer?.phone?(<>
            <div style={{padding:'10px 12px',border:'1px solid #bbf7d0',background:'#f0fdf4',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
              <div style={{display:'flex',alignItems:'center',gap:9}}><span style={{width:30,height:30,borderRadius:'50%',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',color:'#15803d'}}><i className="ti ti-user-check"/></span><div><div style={{fontSize:10,fontWeight:800,color:'#15803d'}}>CUSTOMER CONFIRMED</div><div style={{fontSize:13,fontWeight:700}}>{customer.name}</div><div style={{fontSize:11,color:'#64748b'}}>{customer.phone}</div></div></div>
              <button className="btn-nx ghost sm" onClick={()=>{setNewCustPhone(customer.phone||'');setNewCustName('');setCustId('');}}>Change</button>
            </div>
            {custDetail&&<div style={{padding:'10px 12px',border:'1px solid #e2e8f0',background:'#f8fafc',borderRadius:9,fontSize:12,marginTop:6}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6}}>
                <div style={{textAlign:'center',padding:'6px 4px',background:'#fff',borderRadius:7,border:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:10,color:'#64748b',fontWeight:700}}>TOTAL SPENT</div>
                  <div style={{fontWeight:800,color:'#0f766e',fontSize:13}}>SAR {Number(custDetail.lifetime_value||0).toFixed(0)}</div>
                </div>
                <div style={{textAlign:'center',padding:'6px 4px',background:'#fff',borderRadius:7,border:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:10,color:'#64748b',fontWeight:700}}>VISITS</div>
                  <div style={{fontWeight:800,fontSize:13}}>{custDetail.order_count||0}</div>
                </div>
                <div style={{textAlign:'center',padding:'6px 4px',background:'#fff',borderRadius:7,border:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:10,color:'#64748b',fontWeight:700}}>POINTS</div>
                  <div style={{fontWeight:800,color:'#f59e0b',fontSize:13}}>{custDetail.loyalty_points||0}</div>
                </div>
              </div>
              {(custOrders as any[]).length>0&&<div>
                <div style={{fontSize:10,fontWeight:800,color:'#64748b',marginBottom:4}}>RECENT ORDERS</div>
                {(custOrders as any[]).slice(0,4).map((o:any)=>(
                  <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderTop:'1px solid #f1f5f9'}}>
                    <div><div style={{fontWeight:700,fontSize:11}}>#{o.order_number}</div><div style={{fontSize:10,color:'#94a3b8'}}>{new Date(o.created_at).toLocaleDateString('en-SA')} · {o.item_count} items</div></div>
                    <div style={{fontWeight:700,fontSize:12,color:'#0f766e'}}>SAR {Number(o.total||0).toFixed(0)}</div>
                  </div>
                ))}
              </div>}
            </div>}
          </>):(
            <div style={{padding:13,border:'1px solid #99f6e4',background:'#f8fafc',borderRadius:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div><div style={{fontSize:10,fontWeight:800,color:'#115e59'}}>CUSTOMER · STEP 1</div><div style={{fontSize:12,color:'#64748b',marginTop:2}}>Enter phone to find loyalty profile</div></div><button style={{border:0,background:'none',color:'#0f766e',fontSize:11,fontWeight:700,cursor:'pointer'}} onClick={()=>setShowCustModal(true)}>Search by name</button></div>
              <div style={{display:'flex',gap:7}}>
                <div style={{position:'relative',flex:1}}><i className="ti ti-phone" style={{position:'absolute',left:10,top:11,color:'#9ca3af'}}/><input ref={customerPhoneRef} autoFocus value={newCustPhone} onChange={e=>{setNewCustPhone(e.target.value);setNewCustName('');requestAnimationFrame(()=>customerPhoneRef.current?.focus())}} onKeyDown={e=>e.stopPropagation()} placeholder="05X XXX XXXX" inputMode="tel" autoComplete="tel" style={{width:'100%',boxSizing:'border-box',padding:'10px 11px 10px 32px',border:'1px solid #5eead4',borderRadius:8,fontSize:14,fontWeight:600}}/></div>
              </div>
              {phoneMatch?(
                <button style={{width:'100%',marginTop:8,padding:'9px 11px',border:'1px solid #bbf7d0',borderRadius:8,background:'#f0fdf4',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}} onClick={()=>{setCustId(phoneMatch.id);setNewCustName('');setNewCustPhone('')}}><span style={{textAlign:'left'}}><b style={{fontSize:13}}>{phoneMatch.name}</b><span style={{display:'block',fontSize:11,color:'#64748b'}}>{phoneMatch.phone} · Existing customer</span></span><span style={{fontSize:11,fontWeight:800,color:'#15803d'}}>SELECT <i className="ti ti-chevron-right"/></span></button>
              ):phoneDigits(newCustPhone).length>=7?(
                <div style={{marginTop:10,paddingTop:10,borderTop:'1px dashed #99f6e4'}}>
                  <div style={{fontSize:10,fontWeight:800,color:'#115e59',marginBottom:6}}>NEW CUSTOMER · STEP 2</div>
                  <div style={{display:'flex',gap:7}}><input value={newCustName} onChange={e=>setNewCustName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&newCustName.trim()&&quickCustomer.mutate()} placeholder="Customer name *" style={{flex:1,padding:'9px 10px',border:'1px solid #5eead4',borderRadius:8,fontSize:13}}/><button className="btn-nx primary sm" disabled={!newCustName.trim()||quickCustomer.isPending} onClick={()=>quickCustomer.mutate()}>{quickCustomer.isPending?'Creating...':'Create & Continue'}</button></div>
                </div>
              ):<div style={{fontSize:10,color:'#94a3b8',marginTop:6}}>Enter at least 7 digits to continue</div>}
            </div>
          )}
          <div style={{padding:12,border:'2px solid #fde68a',background:'#fffbeb',borderRadius:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><div><div style={{fontSize:11,fontWeight:800,color:'#92400e'}}>ORDER DISCOUNT</div><div style={{fontSize:10,color:'#a16207'}}>Applied to the complete bill</div></div>{manualDisc>0&&<span style={{fontWeight:800,color:'#dc2626'}}>− {sar(manualDisc)}</span>}</div>
            <div style={{display:'grid',gridTemplateColumns:'110px 1fr',gap:7}}>
              <select value={discMode} onChange={e=>setDiscMode(e.target.value as 'percent'|'fixed')} style={{padding:'9px 8px',border:'1px solid #fbbf24',borderRadius:8,background:'#fff',fontSize:12,fontWeight:700}}><option value="percent">Percentage %</option><option value="fixed">Fixed SAR</option></select>
              <input type="number" min="0" max={discMode==='percent'?100:sub} value={discPct} onChange={e=>setDiscPct(e.target.value)} placeholder={discMode==='percent'?'Enter discount %':'Enter discount SAR'} style={{padding:'9px 10px',border:'1px solid #fbbf24',borderRadius:8,fontSize:13,fontWeight:700}}/>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>PAYMENT METHOD</div>
            <label style={{display:'flex',alignItems:'center',gap:8,padding:'9px 11px',marginBottom:8,border:'1px solid #99f6e4',background:splitPayment?'#f0fdfa':'#fff',borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:700,color:'#115e59'}}><input type="checkbox" checked={splitPayment} onChange={e=>{setSplitPayment(e.target.checked);setSplitAmounts({})}}/> Split Payment (Any 2 or More Methods)</label>
            {splitPayment?(
              <div style={{padding:12,border:'1px solid #99f6e4',background:'#f8fafc',borderRadius:10}}>
                <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:7}}>ENTER AMOUNT AGAINST EACH PAYMENT METHOD</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:7}}>
                  {METHODS.map((paymentMethod,index)=><label key={paymentMethod} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 9px',background:Number(splitAmounts[paymentMethod]||0)>0?'#f0fdfa':'#fff',border:'1px solid #99f6e4',borderRadius:8}}>
                    <span style={{width:76,fontSize:11,fontWeight:700,color:'#115e59'}}>{paymentMethod}</span>
                    <input autoFocus={index===0} type="number" min="0" max={cashDue} value={splitAmounts[paymentMethod]||''} onChange={e=>setSplitAmounts(values=>({...values,[paymentMethod]:e.target.value}))} placeholder="0.00" style={{width:'100%',minWidth:0,boxSizing:'border-box',padding:'7px 8px',border:'1px solid #d1d5db',borderRadius:6,fontSize:13,fontWeight:700,textAlign:'right'}}/>
                  </label>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginTop:10,paddingTop:10,borderTop:'1px dashed #99f6e4',textAlign:'center'}}>
                  <div><div style={{fontSize:9,color:'#64748b'}}>BILL TOTAL</div><b style={{fontSize:12}}>{sar(cashDue)}</b></div>
                  <div><div style={{fontSize:9,color:'#64748b'}}>ALLOCATED</div><b style={{fontSize:12,color:splitPaid>cashDue?'#dc2626':'#115e59'}}>{sar(splitPaid)}</b></div>
                  <div><div style={{fontSize:9,color:'#64748b'}}>REMAINING</div><b style={{fontSize:12,color:splitRemaining<.01?'#16a34a':'#dc2626'}}>{splitPaid>cashDue?`Over ${sar(splitPaid-cashDue)}`:sar(splitRemaining)}</b></div>
                </div>
                {splitLines.length<2&&<div style={{fontSize:10,color:'#b45309',marginTop:7,fontWeight:600}}>Enter amounts in at least two payment methods.</div>}
              </div>
            ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {METHODS.map(m=><button key={m} onClick={()=>setMethod(m)} style={{padding:'9px 4px',borderRadius:10,border:`2px solid ${method===m?'#0f766e':'#e5e7eb'}`,background:method===m?'#ccfbf1':'#fff',color:method===m?'#0f766e':'#555',fontWeight:method===m?700:400,cursor:'pointer',fontSize:11}}>{m}</button>)}
            </div>
            )}
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:6}}>COUPON / GIFT CARD</div>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              {appliedCoupon?<div style={{flex:1,display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12}}><span style={{color:'#15803d',fontWeight:700}}>{appliedCoupon.code} — {appliedCoupon.type==='percentage'?appliedCoupon.value+'%':'SAR '+appliedCoupon.value} off</span><button onClick={()=>setAppliedCoupon(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button></div>:(
                <><input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="COUPON CODE" onKeyDown={e=>e.key==='Enter'&&applyCoupon()} style={{flex:1,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'monospace',letterSpacing:1}}/><button onClick={applyCoupon} style={{padding:'8px 14px',borderRadius:8,background:'#0f766e',color:'#fff',border:'none',cursor:'pointer',fontWeight:600,fontSize:12}}>Apply</button></>
              )}
            </div>
            <div style={{display:'flex',gap:8}}>
              {appliedGC?<div style={{flex:1,display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12}}><span style={{color:'#15803d',fontWeight:700}}>{appliedGC.code} · using {sar(gcUsed)}</span><button onClick={()=>setAppliedGC(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button></div>:(
                <><input value={gcInput} onChange={e=>setGcInput(e.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX" onKeyDown={e=>e.key==='Enter'&&applyGC()} style={{flex:1,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'monospace',letterSpacing:1}}/><button onClick={applyGC} style={{padding:'8px 14px',borderRadius:8,background:'#0f766e',color:'#fff',border:'none',cursor:'pointer',fontWeight:600,fontSize:12}}>Apply</button></>
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
          {!splitPayment&&method==='Cash'&&cashDue>0&&(
            <div style={{padding:12,background:'#f8f9fa',borderRadius:10}}>
              <div style={{fontSize:11,fontWeight:700,color:'#999',marginBottom:8}}>CASH RECEIVED</div>
              <input type="number" value={cashGiven} onChange={e=>setCashGiven(e.target.value)} placeholder={cashDue.toFixed(2)} style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:18,fontWeight:700,boxSizing:'border-box',marginBottom:8}}/>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                {[50,100,200,500].map(a=><button key={a} onClick={()=>setCashGiven(String(a))} style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:13}}>{a}</button>)}
                <button onClick={()=>setCashGiven(String(Math.ceil(cashDue/10)*10))} style={{flex:1,padding:'6px 0',borderRadius:6,border:'1px solid #0f766e',background:'#ccfbf1',color:'#0f766e',cursor:'pointer',fontSize:11,fontWeight:700}}>Round↑</button>
              </div>
              {change>0&&<div style={{padding:'6px 12px',background:'#f0fdf4',borderRadius:8,display:'flex',justifyContent:'space-between',fontSize:13,color:'#15803d',fontWeight:700}}><span>Change</span><span>{sar(change)}</span></div>}
              {cashGiven&&parseFloat(cashGiven)<cashDue&&<div style={{marginTop:4,fontSize:12,color:'#ef4444',fontWeight:600}}>⚠ Short {sar(cashDue-parseFloat(cashGiven))}</div>}
            </div>
          )}
          <input value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Order note (optional)…" style={{padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13}}/>
          <button disabled={cart.length===0||!currentSession?.id||!customer?.name||!customer?.phone||!splitComplete||chargeMut.isPending} onClick={()=>chargeMut.mutate()} style={{padding:'16px 0',borderRadius:12,background:cart.length===0||!currentSession?.id||!customer?.name||!customer?.phone||!splitComplete?'#e5e7eb':'#0f766e',color:'#fff',border:'none',cursor:cart.length===0||!currentSession?.id||!customer?.name||!customer?.phone||!splitComplete?'not-allowed':'pointer',fontSize:15,fontWeight:800}}>
            {chargeMut.isPending?'Processing…':`✓ Charge ${sar(cashDue)}`}
          </button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 56px)',background:'#f3f4f6',overflow:'hidden'}}>
      {showCustModal&&<CustModal/>}
      {showPayModal&&PaymentModal()}
      {showOrders&&<OrdersModal/>}
      {showHeld&&<HeldOrders onRetrieve={h=>{setCart(Array.isArray(h.cart)?h.cart:[]);setCustId(h.custId||'');setMethod(h.method||'Cash');setDiscPct(h.discPct||'');setOrderNote(h.orderNote||h.note||'');}} onClose={()=>setShowHeld(false)}/>}
      {pickerProd&&<VariantPicker product={pickerProd} onAdd={addToCart} onClose={()=>setPickerProd(null)}/>}

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Product workspace */}
        <div style={{display:'flex',flexDirection:'column',flex:1,minWidth:0,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#fff',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:'#0f766e',color:'#fff',borderRadius:8,fontSize:12,fontWeight:700,flexShrink:0}}><i className="ti ti-clock" style={{fontSize:13}}/><Clock/></div>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:10}}>
          <i className="ti ti-barcode" style={{fontSize:15,color:'#9ca3af'}}/>
          <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&scanOrAddProduct()} placeholder="Search product or scan barcode…" autoFocus={!showPayModal} style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13}}/>
          {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:18}}>×</button>}
        </div>
        <button onClick={()=>setShowCustModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',border:`2px solid ${custId?'#0f766e':'#e5e7eb'}`,borderRadius:10,background:custId?'#ccfbf1':'#fff',cursor:'pointer',fontSize:12,color:custId?'#0f766e':'#666',fontWeight:custId?700:400,flexShrink:0}}>
          <i className={'ti '+(custId?'ti-user-check':'ti-user-search')} style={{fontSize:14}}/>
          <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{customer?customer.name:'Customer'}</span>
          {custId&&<span onClick={e=>{e.stopPropagation();setCustId('');setUseWallet(false);setRedeemPts(false);}} style={{fontSize:16,color:'#9ca3af',cursor:'pointer'}}>×</span>}
        </button>
        {customer&&<div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:11,flexShrink:0}}>
          <span style={{color:TIER_C[tier]||'#cd7f32',fontWeight:700,textTransform:'capitalize'}}>{tier}</span>·
          <span style={{color:'#92400e',fontWeight:600}}>{custPoints} pts</span>·
          <span style={{color:'#059669',fontWeight:600}}>{sar(walletBal)}</span>
        </div>}
      </div>

      {custId&&custDetail&&<div style={{padding:'7px 14px',background:'#f0fdf4',borderBottom:'1px solid #bbf7d0',display:'flex',alignItems:'center',gap:14,fontSize:12,flexShrink:0,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <i className="ti ti-user-circle" style={{color:'#15803d',fontSize:16}}/>
          <b style={{color:'#15803d'}}>{custDetail.name}</b>
          <span style={{color:'#64748b'}}>{custDetail.phone}</span>
        </div>
        <div style={{display:'flex',gap:12,paddingLeft:8,borderLeft:'1px solid #bbf7d0'}}>
          <span><b style={{color:'#0f766e'}}>SAR {Number(custDetail.lifetime_value||0).toFixed(0)}</b><span style={{color:'#64748b',marginLeft:3}}>spent</span></span>
          <span><b>{custDetail.order_count||0}</b><span style={{color:'#64748b',marginLeft:3}}>visits</span></span>
          <span><b style={{color:'#f59e0b'}}>{custDetail.loyalty_points||0}</b><span style={{color:'#64748b',marginLeft:3}}>pts</span></span>
        </div>
        {(custOrders as any[]).length>0&&<div style={{display:'flex',gap:6,marginLeft:'auto',overflowX:'auto'}}>
          <span style={{fontSize:10,color:'#64748b',alignSelf:'center',fontWeight:700}}>RECENT:</span>
          {(custOrders as any[]).slice(0,4).map((o:any)=>(
            <div key={o.id} style={{padding:'3px 9px',background:'#fff',border:'1px solid #bbf7d0',borderRadius:7,whiteSpace:'nowrap',fontSize:11}}>
              <b style={{color:'#0f766e'}}>SAR {Number(o.total||0).toFixed(0)}</b>
              <span style={{color:'#94a3b8',marginLeft:5}}>{new Date(o.created_at).toLocaleDateString('en-SA',{day:'2-digit',month:'short'})}</span>
            </div>
          ))}
        </div>}
      </div>}

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Category sidebar */}
        <div style={{width:76,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:6,gap:2,overflowY:'auto',flexShrink:0}}>
          <button onClick={()=>setCatFilter('')} style={{width:64,padding:'8px 4px',borderRadius:10,border:'none',background:catFilter===''?'#ccfbf1':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,marginBottom:4}}>
            <div style={{width:38,height:38,borderRadius:10,background:catFilter===''?'#0f766e':'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-layout-grid" style={{fontSize:17,color:catFilter===''?'#fff':'#666'}}/></div>
            <span style={{fontSize:9,fontWeight:600,color:catFilter===''?'#0f766e':'#666'}}>All</span>
          </button>
          {categories.map((cat:any,i:number)=>{
            const icon=CAT_ICONS[cat.name]||CAT_ICONS['default'];const active=catFilter===cat.id;
            return(<button key={cat.id} onClick={()=>setCatFilter(active?'':cat.id)} style={{width:64,padding:'7px 4px',borderRadius:10,border:'none',background:active?'#ccfbf1':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <div style={{width:38,height:38,borderRadius:10,background:active?'#0f766e':BG[i%BG.length],display:'flex',alignItems:'center',justifyContent:'center'}}><i className={'ti '+icon} style={{fontSize:17,color:active?'#fff':'#555'}}/></div>
              <span style={{fontSize:9,fontWeight:600,color:active?'#0f766e':'#666',textAlign:'center',maxWidth:60,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat.name}</span>
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
                  style={{background:'#fff',borderRadius:12,overflow:'hidden',cursor:'pointer',border:`2px solid ${inCart?'#0f766e':'transparent'}`,boxShadow:inCart?'0 0 0 3px #ccfbf1':'0 1px 3px rgba(0,0,0,.06)',transition:'all .15s',position:'relative'}}>
                  {inCart&&<div style={{position:'absolute',top:7,right:7,width:20,height:20,background:'#0f766e',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',zIndex:1}}>{qty}</div>}
                  <div style={{height:100,background:BG[i%BG.length],display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {p.images?.[0]?<img src={p.images[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={p.name}/>:<i className={'ti '+(CAT_ICONS[catName]||'ti-hanger')} style={{fontSize:38,color:'rgba(0,0,0,.18)'}}/>}
                  </div>
                  <div style={{padding:'7px 9px'}}>
                    <div style={{fontSize:9,color:'#9ca3af',marginBottom:1}}>{catName}</div>
                    <div style={{fontWeight:700,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:4}}>{p.name}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontWeight:800,fontSize:12}}>{sar(price)}</span>
                      <span style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:hasVars?'#fef3e8':'#ccfbf1',color:hasVars?'#d97706':'#0f766e',fontWeight:600}}>{hasVars?`${p.variants.length} vars`:'+ Add'}</span>
                    </div>
                  </div>
                </div>);
              })}
            </div>
          )}
        </div>
        </div>
        </div>

        {/* Cart */}
        <div style={{width:350,background:'#fff',borderLeft:'1px solid #e5e7eb',display:'flex',flexDirection:'column',flexShrink:0,boxShadow:'-4px 0 18px rgba(15,23,42,.05)'}}>
          <div style={{padding:'13px 15px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center',background:'linear-gradient(135deg,#fff,#f8fafc)'}}>
            <div><span style={{fontWeight:900,fontSize:15,display:'flex',alignItems:'center',gap:6}}><i className="ti ti-receipt" style={{color:'#0f766e'}}/>Current Order</span><div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Items added to this sale</div></div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:11,padding:'3px 9px',borderRadius:10,background:'#ccfbf1',color:'#0f766e',fontWeight:800}}>{cart.reduce((sum,item)=>sum+item.qty,0)} pcs</span>
              {cart.length>0&&<button onClick={()=>setCart([])} style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'#fef2f2',color:'#ef4444',fontWeight:600,border:'none',cursor:'pointer'}}>Clear</button>}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
            {cart.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#cbd5e1',gap:8,padding:24,textAlign:'center'}}><div style={{width:62,height:62,borderRadius:18,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-shopping-cart" style={{fontSize:30,color:'#94a3b8'}}/></div><span style={{fontSize:14,fontWeight:700,color:'#64748b'}}>Order is empty</span><span style={{fontSize:11}}>Scan a barcode or select a product to begin</span></div>
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
                    <button onClick={()=>setQty(item.id,item.qty+1)} style={{width:20,height:20,borderRadius:'50%',border:'none',background:'#0f766e',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>+</button>
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
              <span style={{fontWeight:900,fontSize:20,color:'#0f766e'}}>{sar(cashDue)}</span>
            </div>
            {ptsEarned>0&&cart.length>0&&<div style={{fontSize:10,color:'#f59e0b',textAlign:'right',fontWeight:600}}>+{ptsEarned} pts will be earned</div>}
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div style={{display:'flex',padding:'0 10px',height:52,background:'#0f172a',alignItems:'center',gap:6,flexShrink:0}}>
        {[
          {label:'Hold',icon:'ti-player-pause',color:'#fbbf24',bg:'rgba(251,191,36,.15)',action:holdSale},
          {label:'Retrieve',icon:'ti-player-play',color:'#6ee7b7',bg:'rgba(110,231,183,.15)',action:()=>setShowHeld(true)},
          {label:'Orders',icon:'ti-list',color:'#93c5fd',bg:'rgba(147,197,253,.15)',action:()=>setShowOrders(true)},
          {label:'Void',icon:'ti-ban',color:'#f87171',bg:'rgba(248,113,113,.15)',action:()=>{if(cart.length&&confirm('Void current sale?'))resetSale();}},
          {label:'Payment',icon:'ti-credit-card',color:'#fff',bg:'#0f766e',action:()=>{if(!cart.length){toast('Add items first','error');return;}if(!currentSession?.id){toast('Start shift from Z-Report before payment','error');return;}setShowPayModal(true);}},
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
