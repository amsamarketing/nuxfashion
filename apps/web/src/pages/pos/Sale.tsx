import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; }
const METHODS = [['Cash','ti-cash'],['Card','ti-credit-card'],['Tabby','ti-device-mobile'],['Tamara','ti-device-mobile'],['Apple Pay','ti-brand-apple'],['Mada','ti-credit-card']];
const TIER_RATE:Record<string,number> = {bronze:1/5,silver:1/4,gold:1/3,platinum:1/2};

// Read from sessionStorage (set by Loyalty page)
const getStoredCoupons = () => { try{return JSON.parse(sessionStorage.getItem('coupons')||'[]');}catch{return [];} };
const getStoredGiftCards = () => { try{return JSON.parse(sessionStorage.getItem('giftcards')||'[]');}catch{return [];} };
const getStoredPromos = () => { try{return JSON.parse(sessionStorage.getItem('localPromos')||'[]');}catch{return [];} };

export default function POSSale() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState('Cash');
  const [custId, setCustId] = useState('');
  const [discPct, setDiscPct] = useState('');
  const [discFlat, setDiscFlat] = useState('');
  const [showDisc, setShowDisc] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  // Loyalty additions
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [gcInput, setGcInput] = useState('');
  const [appliedGC, setAppliedGC] = useState<any>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [redeemPts, setRedeemPts] = useState(false);
  const [autoPromo, setAutoPromo] = useState<any>(null);
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [receiptPoints, setReceiptPoints] = useState(0);

  const { data:products=[] } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data) });
  const { data:warehouses } = useQuery<{id:string;name:string}[]>({ queryKey:['warehouses'], queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[]) });
  const { data:customers=[] } = useQuery({ queryKey:['customers'], queryFn:()=>api.get('/customers').then(r=>r.data) });

  const defaultWarehouseId = warehouses?.[0]?.id ?? null;
  const customer = customers.find((c:any)=>c.id===custId) as any;
  const tier = customer?.loyalty_tier||'bronze';
  const custPoints = customer?.loyalty_points||0;
  const walletBal = parseFloat(customer?.wallet_balance||0);

  // Auto-apply promotion when cart changes
  useEffect(()=>{
    if(cart.length===0){setAutoPromo(null);return;}
    const promos = getStoredPromos().filter((p:any)=>p.is_active);
    // Find best % discount promo
    const best = promos.filter((p:any)=>p.discount_type==='percentage'&&p.discount_value>0)
      .sort((a:any,b:any)=>b.discount_value-a.discount_value)[0];
    setAutoPromo(best||null);
  },[cart]);

  // Totals
  const sub = cart.reduce((s,i)=>s+i.price*i.qty, 0);
  const pctAmt = Math.min(sub*(parseFloat(discPct||'0')/100), sub);
  const flatAmt = Math.min(parseFloat(discFlat||'0'), sub-pctAmt);
  const manualDisc = pctAmt+flatAmt;
  const couponDisc = appliedCoupon ? (appliedCoupon.type==='percentage' ? Math.min(sub*appliedCoupon.value/100,sub) : Math.min(appliedCoupon.value,sub)) : 0;
  const promoDisc = autoPromo&&!appliedCoupon ? Math.min(sub*autoPromo.discount_value/100,sub) : 0;
  const totalDisc = manualDisc+couponDisc+promoDisc;
  const taxable = Math.max(sub-totalDisc,0);
  const tax = taxable*0.15;
  const grossTotal = taxable+tax;
  const walletUsed = useWallet ? Math.min(walletBal, grossTotal) : 0;
  const gcUsed = appliedGC ? Math.min(appliedGC.balance, grossTotal-walletUsed) : 0;
  const ptsValue = redeemPts&&custPoints>0 ? Math.min(custPoints*0.1, grossTotal-walletUsed-gcUsed) : 0;
  const ptsUsed = Math.ceil(ptsValue/0.1);
  const cashDue = Math.max(grossTotal-walletUsed-gcUsed-ptsValue, 0);
  const ptsEarned = customer ? Math.floor(cashDue*(TIER_RATE[tier]||0.2)) : 0;

  const filtered = products.filter((p:any)=>
    !search||p.name.toLowerCase().includes(search.toLowerCase())||
    p.variants?.some((v:any)=>v.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const addItem = (v:any,pname:string) => {
    setCart(prev=>{
      const ex=prev.find(i=>i.id===v.id);
      if(ex) return prev.map(i=>i.id===v.id?{...i,qty:i.qty+1}:i);
      return [...prev,{id:v.id,sku:v.sku||'',name:`${pname}${v.name&&v.name!=='Default'?' ('+v.name+')':''}`,price:parseFloat(v.selling_price||0),qty:1}];
    });
  };

  const applyCoupon = () => {
    const coupons = getStoredCoupons();
    const found = coupons.find((c:any)=>c.code===couponInput.toUpperCase()&&c.is_active&&(!c.expires||new Date(c.expires)>new Date())&&(!c.usage_limit||c.used<c.usage_limit));
    if(!found){toast('Invalid or expired coupon','error');return;}
    if(found.min_purchase>0&&sub<found.min_purchase){toast(`Min purchase SAR ${found.min_purchase} required`,'error');return;}
    setAppliedCoupon(found); setCouponInput(''); toast(`Coupon ${found.code} applied!`,'success');
  };

  const applyGiftCard = () => {
    const gcs = getStoredGiftCards();
    const found = gcs.find((g:any)=>g.code===gcInput.toUpperCase()&&g.is_active&&g.balance>0&&new Date(g.expires)>new Date());
    if(!found){toast('Invalid or used gift card','error');return;}
    setAppliedGC(found); setGcInput(''); toast(`Gift card SAR ${found.balance} applied!`,'success');
  };

  const resetSale = () => {
    setCart([]); setDiscPct(''); setDiscFlat(''); setShowDisc(false);
    setCustId(''); setAppliedCoupon(null); setAppliedGC(null);
    setUseWallet(false); setRedeemPts(false); setAutoPromo(null); setShowLoyalty(false);
  };

  const chargeMut = useMutation({
    mutationFn: async () => {
      const body:any = {
        customer_id: custId||null,
        lines: cart.map(i=>({variant_id:i.id,quantity:i.qty,unit_price:i.price,discount_amount:0})),
        subtotal:sub, tax_amount:tax, discount_amount:totalDisc, total:grossTotal,
      };
      if(defaultWarehouseId) body.warehouse_id=defaultWarehouseId;
      const order = await api.post('/sales/orders',body);
      const payments:any[] = [];
      if(gcUsed>0) payments.push({method:'gift_card',amount:gcUsed,reference:appliedGC?.code});
      if(walletUsed>0) payments.push({method:'wallet',amount:walletUsed});
      if(ptsValue>0) payments.push({method:'loyalty_points',amount:ptsValue,reference:ptsUsed+' pts'});
      if(cashDue>0) payments.push({method:method.toLowerCase().replace(/ /g,'_'),amount:cashDue});
      await api.post('/sales/payments',{order_id:order.data.id,payments});
      // Update gift card balance locally
      if(appliedGC&&gcUsed>0){
        const gcs=getStoredGiftCards().map((g:any)=>g.id===appliedGC.id?{...g,balance:Math.max(g.balance-gcUsed,0)}:g);
        try{sessionStorage.setItem('giftcards',JSON.stringify(gcs));}catch{}
      }
      return order.data;
    },
    onSuccess: d => {
      toast(`✅ Order #${d.order_number} — SAR ${cashDue.toFixed(2)}`, 'success');
      qc.invalidateQueries({queryKey:['dashboard']});
      qc.invalidateQueries({queryKey:['orders']});
      setReceiptPoints(ptsEarned);
      setReceipt({...d,_gcUsed:gcUsed,_walletUsed:walletUsed,_ptsUsed:ptsUsed,_ptsEarned:ptsEarned,_coupon:appliedCoupon,_promo:autoPromo,_cashDue:cashDue});
      resetSale();
    },
    onError: e => toast(getErr(e),'error')
  });

  // ── Receipt screen ──────────────────────────────────────────────
  if(receipt) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:480}}>
      <div className="card" style={{maxWidth:400,width:'100%',padding:36,textAlign:'center'}}>
        <div style={{fontSize:52,marginBottom:12}}>✅</div>
        <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Payment Complete</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:16}}>Order #{receipt.order_number}</div>

        {/* Payment breakdown */}
        <div style={{background:'var(--surface-1)',borderRadius:'var(--radius)',padding:14,marginBottom:16,textAlign:'left'}}>
          {[
            receipt._gcUsed>0&&['Gift card',`− SAR ${receipt._gcUsed.toFixed(2)}`,'#27ae60'],
            receipt._walletUsed>0&&['Wallet',`− SAR ${receipt._walletUsed.toFixed(2)}`,'#27ae60'],
            receipt._ptsUsed>0&&['Points redeemed',`${receipt._ptsUsed} pts = − SAR ${(receipt._ptsUsed*0.1).toFixed(2)}`,'#27ae60'],
            receipt._coupon&&['Coupon '+receipt._coupon.code,`− SAR ${couponDisc.toFixed(2)}`,'#27ae60'],
          ].filter(Boolean).map((r:any)=>(
            <div key={r[0]} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}>
              <span style={{color:'var(--text-secondary)'}}>{r[0]}</span><span style={{color:r[2],fontWeight:600}}>{r[1]}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-secondary)',marginBottom:6}}>
            <span>Paid by</span><span>{method}</span>
          </div>
          <div style={{borderTop:'1px solid var(--border-color)',paddingTop:8,display:'flex',justifyContent:'space-between'}}>
            <span style={{fontWeight:700}}>Amount charged</span>
            <span style={{fontWeight:800,fontSize:20,color:'var(--fill-accent)'}}>SAR {receipt._cashDue?.toFixed(2)}</span>
          </div>
        </div>

        {/* Points earned */}
        {receiptPoints>0&&<div style={{padding:'10px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'var(--radius)',marginBottom:16,fontSize:12}}>
          <i className="ti ti-star" style={{color:'#16a34a',marginRight:6}}/>
          <strong style={{color:'#15803d'}}>+{receiptPoints} loyalty points earned!</strong>
          <div style={{fontSize:10,color:'#16a34a',marginTop:2}}>Total: {custPoints+receiptPoints} pts · {tier} tier</div>
        </div>}

        <div style={{display:'flex',gap:8}}>
          <button className="bt" style={{flex:1,justifyContent:'center'}} onClick={()=>{
            const w=window.open('','_blank','width=400,height=600'); if(!w)return;
            w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:monospace;font-size:13px;padding:20px;margin:0}h2{text-align:center;margin:0 0 4px}.center{text-align:center}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between}.total{font-size:18px;font-weight:bold}</style></head><body>
              <h2>NuxFashion</h2><div class="center" style="font-size:11px;margin-bottom:8px">Riyadh · Tel: +966-XX-XXXXXXX</div>
              <div class="line"></div>
              <div class="row"><span>Order #</span><span>${receipt.order_number}</span></div>
              <div class="row"><span>Date</span><span>${new Date().toLocaleString()}</span></div>
              <div class="line"></div>
              ${receipt._gcUsed>0?`<div class="row"><span>Gift card</span><span>- SAR ${receipt._gcUsed.toFixed(2)}</span></div>`:''}
              ${receipt._walletUsed>0?`<div class="row"><span>Wallet</span><span>- SAR ${receipt._walletUsed.toFixed(2)}</span></div>`:''}
              ${receipt._ptsUsed>0?`<div class="row"><span>Points (${receipt._ptsUsed})</span><span>- SAR ${(receipt._ptsUsed*0.1).toFixed(2)}</span></div>`:''}
              <div class="line"></div>
              <div class="row total"><span>Charged</span><span>SAR ${receipt._cashDue?.toFixed(2)}</span></div>
              <div class="row"><span>VAT 15%</span><span>SAR ${parseFloat(receipt.tax_amount||0).toFixed(2)}</span></div>
              ${receiptPoints>0?`<div class="line"></div><div class="center" style="font-size:12px">+${receiptPoints} loyalty points earned!</div>`:''}
              <div class="line"></div>
              <div class="center" style="font-size:11px;margin-top:8px">Thank you for shopping!</div>
              <div class="center" style="font-size:10px;color:#666">ZATCA e-invoice generated</div>
            </body></html>`);
            w.document.close(); w.focus(); w.print(); w.close();
          }}><i className="ti ti-printer"/> Print</button>
          <button className="bt bt-p" style={{flex:1,justifyContent:'center'}} onClick={()=>{setReceipt(null);setReceiptPoints(0);}}>
            <i className="ti ti-plus"/> New sale
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main POS ────────────────────────────────────────────────────
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 290px',height:'calc(100vh - 145px)'}}>
      {/* LEFT — products + cart */}
      <div style={{display:'flex',flexDirection:'column',borderRight:'1px solid var(--border-color)',overflow:'hidden'}}>
        {/* Search + customer */}
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border-color)',background:'var(--surface-2)'}}>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--surface-1)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)'}}>
              <i className="ti ti-barcode" style={{fontSize:18,color:'var(--text-secondary)'}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Scan barcode or type product name…" autoFocus
                style={{border:'none',background:'transparent',outline:'none',flex:1,fontSize:13,padding:0}}/>
              {search&&<span style={{cursor:'pointer',color:'var(--text-secondary)',fontSize:16}} onClick={()=>setSearch('')}>×</span>}
            </div>
            <select value={custId} onChange={e=>{setCustId(e.target.value);setUseWallet(false);setRedeemPts(false);}}
              style={{padding:'8px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',background:'var(--surface-2)',fontSize:12,color:'var(--text-primary)',maxWidth:170}}>
              <option value="">Walk-in customer</option>
              {customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Product dropdown */}
        {filtered.length>0&&search&&(
          <div style={{borderBottom:'1px solid var(--border-color)',maxHeight:220,overflowY:'auto',background:'var(--surface-2)'}}>
            {filtered.slice(0,20).map((p:any)=>p.variants?.map((v:any)=>(
              <div key={v.id} onClick={()=>{addItem(v,p.name);setSearch('');}}
                style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',borderBottom:'1px solid var(--border-color)'}}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <div style={{width:34,height:34,background:'var(--surface-1)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="ti ti-shirt" style={{fontSize:17}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:12}}>{p.name}</div>
                  <div style={{fontSize:10,color:'var(--text-secondary)'}}>{v.sku} · {v.name}</div>
                </div>
                <div style={{fontWeight:700,color:'var(--fill-accent)',fontSize:13}}>SAR {parseFloat(v.selling_price||0).toFixed(2)}</div>
              </div>
            )))}
          </div>
        )}

        {/* Cart */}
        <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
          {cart.length===0?(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted-custom)',gap:10}}>
              <i className="ti ti-shopping-cart" style={{fontSize:44}}/>
              <div style={{fontSize:14,fontWeight:600}}>Cart is empty</div>
              <div style={{fontSize:12}}>Search or scan a product to add</div>
            </div>
          ):(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',letterSpacing:'.5px'}}>
                  {cart.reduce((s,i)=>s+i.qty,0)} ITEMS
                </span>
                <button className="bt bt-d" style={{fontSize:10}} onClick={()=>setCart([])}>
                  <i className="ti ti-trash"/> Clear
                </button>
              </div>
              {cart.map(item=>(
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border-color)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:12}}>{item.name}</div>
                    <div style={{fontSize:10,color:'var(--text-muted-custom)'}}>{item.sku} · SAR {item.price.toFixed(2)} each</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id&&i.qty>1?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0))}
                      style={{width:26,height:26,border:'1px solid var(--border-color)',borderRadius:5,background:'var(--surface-1)',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                    <span style={{fontWeight:700,minWidth:22,textAlign:'center',fontSize:13}}>{item.qty}</span>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i))}
                      style={{width:26,height:26,border:'1px solid var(--border-color)',borderRadius:5,background:'var(--surface-1)',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  </div>
                  <div style={{fontWeight:700,minWidth:75,textAlign:'right',fontSize:13}}>SAR {(item.price*item.qty).toFixed(2)}</div>
                  <button onClick={()=>setCart(p=>p.filter(i=>i.id!==item.id))}
                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-danger-custom)',fontSize:18,padding:'0 2px'}}>×</button>
                </div>
              ))}

              {/* Auto promo banner */}
              {autoPromo&&!appliedCoupon&&(
                <div style={{margin:'10px 0',padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:12,color:'#15803d',fontWeight:600}}><i className="ti ti-tag" style={{marginRight:5}}/>{autoPromo.name} — {autoPromo.discount_value}% off auto-applied</span>
                  <span style={{fontWeight:700,color:'#15803d'}}>− SAR {promoDisc.toFixed(2)}</span>
                </div>
              )}

              {/* Manual discount */}
              <div style={{marginTop:8,padding:'10px 12px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:showDisc?10:0}}>
                  <span style={{fontSize:12,fontWeight:600,flex:1}}>Manual discount</span>
                  {manualDisc>0&&<span style={{fontSize:11,fontWeight:700,color:'var(--text-success-custom)'}}>− SAR {manualDisc.toFixed(2)}</span>}
                  <button className={'snb'+(showDisc?' on':'')} onClick={()=>{setShowDisc(p=>!p);if(showDisc){setDiscPct('');setDiscFlat('');}}}>
                    {showDisc?'Remove':'+ Add'}
                  </button>
                </div>
                {showDisc&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>% PERCENTAGE</div>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',overflow:'hidden',background:'var(--surface-2)'}}>
                        <input type="number" value={discPct} onChange={e=>setDiscPct(e.target.value)} placeholder="0" min="0" max="100"
                          style={{flex:1,border:'none',outline:'none',padding:'6px 8px',fontSize:13,fontWeight:600,background:'transparent',width:0}}/>
                        <span style={{padding:'0 10px',fontSize:13,fontWeight:700,color:'var(--fill-accent)',borderLeft:'1px solid var(--border-color)',background:'var(--surface-1)'}}>%</span>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>SAR FLAT</div>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',overflow:'hidden',background:'var(--surface-2)'}}>
                        <span style={{padding:'0 8px',fontSize:11,fontWeight:700,color:'var(--text-secondary)',borderRight:'1px solid var(--border-color)',background:'var(--surface-1)'}}>SAR</span>
                        <input type="number" value={discFlat} onChange={e=>setDiscFlat(e.target.value)} placeholder="0.00" min="0"
                          style={{flex:1,border:'none',outline:'none',padding:'6px 8px',fontSize:13,fontWeight:600,background:'transparent',width:0}}/>
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
      <div style={{display:'flex',flexDirection:'column',gap:8,padding:12,background:'var(--surface-2)',overflow:'auto'}}>

        {/* Customer loyalty card */}
        {customer&&(
          <div style={{padding:'10px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:700}}><i className="ti ti-user-check" style={{marginRight:5}}/>{customer.name}</div>
              <span className={'bx b'} style={{fontSize:10,textTransform:'capitalize'}}>{tier}</span>
            </div>
            <div style={{display:'flex',gap:12,fontSize:11,color:'var(--text-secondary)'}}>
              <span><strong style={{color:'var(--fill-accent)'}}>{custPoints.toLocaleString()}</strong> pts</span>
              <span><strong style={{color:'#27ae60'}}>SAR {walletBal.toFixed(2)}</strong> wallet</span>
              {ptsEarned>0&&cart.length>0&&<span><strong style={{color:'#f59e0b'}}>+{ptsEarned} pts</strong> earning</span>}
            </div>
            <button onClick={()=>setShowLoyalty(p=>!p)} style={{marginTop:6,fontSize:10,color:'var(--fill-accent)',background:'none',border:'none',cursor:'pointer',padding:0}}>
              {showLoyalty?'▲ Hide loyalty options':'▼ Loyalty & wallet options'}
            </button>
            {showLoyalty&&(
              <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
                {/* Wallet */}
                {walletBal>0&&(
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',padding:'6px 8px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                    <input type="checkbox" checked={useWallet} onChange={e=>setUseWallet(e.target.checked)} style={{width:14,height:14}}/>
                    <span>Use wallet (SAR {walletBal.toFixed(2)})</span>
                    {useWallet&&<span style={{marginLeft:'auto',color:'#27ae60',fontWeight:700}}>− SAR {walletUsed.toFixed(2)}</span>}
                  </label>
                )}
                {/* Points redeem */}
                {custPoints>=10&&(
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',padding:'6px 8px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                    <input type="checkbox" checked={redeemPts} onChange={e=>setRedeemPts(e.target.checked)} style={{width:14,height:14}}/>
                    <span>Redeem {Math.min(custPoints,Math.ceil((grossTotal-walletUsed-gcUsed)/0.1))} pts</span>
                    {redeemPts&&<span style={{marginLeft:'auto',color:'#27ae60',fontWeight:700}}>− SAR {ptsValue.toFixed(2)}</span>}
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Coupon code */}
        <div style={{padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:6}}><i className="ti ti-ticket" style={{marginRight:5}}/>Coupon code</div>
          {appliedCoupon?(
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'#27ae60',fontWeight:700,fontFamily:'monospace'}}>{appliedCoupon.code} — {appliedCoupon.type==='percentage'?appliedCoupon.value+'%':'SAR '+appliedCoupon.value} off</span>
              <button onClick={()=>setAppliedCoupon(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button>
            </div>
          ):(
            <div style={{display:'flex',gap:6}}>
              <input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Enter coupon code"
                onKeyDown={e=>e.key==='Enter'&&applyCoupon()}
                style={{flex:1,padding:'5px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,fontFamily:'monospace',fontWeight:700,background:'var(--surface-2)',color:'var(--text-primary)',letterSpacing:1}}/>
              <button className="bt" onClick={applyCoupon} disabled={!couponInput}>Apply</button>
            </div>
          )}
          {couponDisc>0&&<div style={{fontSize:10,color:'#27ae60',marginTop:4}}>Saving SAR {couponDisc.toFixed(2)}</div>}
        </div>

        {/* Gift card */}
        <div style={{padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)'}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:6}}><i className="ti ti-gift" style={{marginRight:5}}/>Gift card</div>
          {appliedGC?(
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'#27ae60',fontWeight:700,fontFamily:'monospace'}}>{appliedGC.code} — SAR {appliedGC.balance} balance</span>
              <button onClick={()=>setAppliedGC(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontSize:16}}>×</button>
            </div>
          ):(
            <div style={{display:'flex',gap:6}}>
              <input value={gcInput} onChange={e=>setGcInput(e.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX"
                onKeyDown={e=>e.key==='Enter'&&applyGiftCard()}
                style={{flex:1,padding:'5px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,fontFamily:'monospace',fontWeight:700,background:'var(--surface-2)',color:'var(--text-primary)',letterSpacing:1}}/>
              <button className="bt" onClick={applyGiftCard} disabled={!gcInput}>Apply</button>
            </div>
          )}
          {gcUsed>0&&<div style={{fontSize:10,color:'#27ae60',marginTop:4}}>Using SAR {gcUsed.toFixed(2)} from gift card</div>}
        </div>

        {/* Order total */}
        <div className="card" style={{padding:'10px 12px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',marginBottom:8,letterSpacing:'.5px'}}>ORDER TOTAL</div>
          {[
            ['Subtotal ('+cart.reduce((s,i)=>s+i.qty,0)+' items)', 'SAR '+sub.toFixed(2), ''],
            manualDisc>0&&['Manual discount','− SAR '+manualDisc.toFixed(2),'#e74c3c'],
            promoDisc>0&&[autoPromo?.name||'Promo','− SAR '+promoDisc.toFixed(2),'#27ae60'],
            couponDisc>0&&['Coupon '+appliedCoupon?.code,'− SAR '+couponDisc.toFixed(2),'#27ae60'],
            ['VAT 15%','+ SAR '+tax.toFixed(2),''],
            gcUsed>0&&['Gift card','− SAR '+gcUsed.toFixed(2),'#27ae60'],
            walletUsed>0&&['Wallet','− SAR '+walletUsed.toFixed(2),'#27ae60'],
            ptsValue>0&&['Points ('+ptsUsed+' pts)','− SAR '+ptsValue.toFixed(2),'#27ae60'],
          ].filter(Boolean).map((row:any)=>(
            <div key={row[0]} style={{display:'flex',justifyContent:'space-between',color:row[2]||'var(--text-secondary)',marginBottom:4,fontSize:11}}>
              <span style={{color:row[2]||'var(--text-secondary)'}}>{row[0]}</span>
              <span style={{fontWeight:row[2]?700:400}}>{row[1]}</span>
            </div>
          ))}
          <div style={{borderTop:'1px solid var(--border-color)',paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
            <span style={{fontWeight:700,fontSize:13}}>CASH DUE</span>
            <span style={{fontWeight:800,fontSize:22,color:'var(--fill-accent)'}}>SAR {cashDue.toFixed(2)}</span>
          </div>
          {ptsEarned>0&&cart.length>0&&<div style={{fontSize:10,color:'#f59e0b',marginTop:4,textAlign:'right'}}>+{ptsEarned} pts will be earned</div>}
        </div>

        {/* Payment method */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',marginBottom:6,letterSpacing:'.5px'}}>PAYMENT METHOD</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
            {METHODS.map(([name,icon])=>(
              <button key={name} onClick={()=>setMethod(name)}
                style={{padding:'7px 5px',fontSize:11,fontWeight:500,border:`2px solid ${method===name?'var(--fill-accent)':'var(--border-color)'}`,borderRadius:'var(--radius)',cursor:'pointer',background:method===name?'var(--bg-accent)':'var(--surface-1)',color:method===name?'var(--fill-accent)':'var(--text-secondary)',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                <i className={'ti '+icon} style={{fontSize:14}}/>{name}
              </button>
            ))}
          </div>
        </div>

        {/* Hold + Charge */}
        <button className="bt" style={{justifyContent:'center',width:'100%'}} disabled={cart.length===0}
          onClick={()=>{
            const held=JSON.parse(localStorage.getItem('held_orders')||'[]');
            const note=prompt('Note for this held order (optional):');
            held.push({id:'Hold-'+Date.now(),cart,custId,discPct,discFlat,note:note||'',time:new Date().toLocaleTimeString(),heldAt:Date.now()});
            localStorage.setItem('held_orders',JSON.stringify(held));
            resetSale(); alert('Order held successfully');
          }}>
          <i className="ti ti-player-pause"/> Hold sale
        </button>
        <button className="charge-btn" disabled={cart.length===0||chargeMut.isPending} onClick={()=>chargeMut.mutate()} style={{marginTop:'auto'}}>
          {chargeMut.isPending
            ?<><div className="spinner-border spinner-border-sm me-2"/>Processing…</>
            :<><i className="ti ti-check" style={{fontSize:18}}/> Charge SAR {cashDue.toFixed(2)}</>}
        </button>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 9px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
          <i className="ti ti-shield-check" style={{fontSize:12,color:'var(--text-success-custom)'}}/>
          <span style={{fontSize:10,color:'var(--text-secondary)'}}>ZATCA e-invoice auto-generated on charge</span>
        </div>
      </div>
    </div>
  );
}
