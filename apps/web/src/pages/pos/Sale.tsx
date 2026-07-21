
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; discount:number; }

const METHODS = [
  ['Cash','ti-cash'],['Card','ti-credit-card'],['Tabby','ti-device-mobile'],
  ['Tamara','ti-device-mobile'],['Apple Pay','ti-brand-apple'],['Mada','ti-credit-card'],
];

export default function POSSale() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState('Cash');
  const [customer, setCustomer] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [receipt, setReceipt] = useState<any>(null);
  const [showDiscount, setShowDiscount] = useState(false);

  const { data: products=[] } = useQuery({
    queryKey:['products'],
    queryFn:()=>api.get('/catalog/products').then(r=>r.data)
  });
  const { data: customers=[] } = useQuery({
    queryKey:['customers'],
    queryFn:()=>api.get('/customers').then(r=>r.data)
  });

  const chargeMut = useMutation({
    mutationFn: async () => {
      const sub = cart.reduce((s,i)=>s+i.price*i.qty,0);
      const discAmt = discount;
      const taxable = sub - discAmt;
      const tax = taxable * 0.15;
      const total = taxable + tax;
      const lines = cart.map(i=>({ variant_id:i.id, quantity:i.qty, unit_price:i.price, discount_amount:i.discount }));
      const order = await api.post('/sales/orders', {
        customer_id: customer?.id || null,
        lines, subtotal:sub, tax_amount:tax, discount_amount:discAmt, total
      });
      await api.post('/sales/payments', {
        order_id:order.data.id,
        method:method.toLowerCase().replace(/ /g,'_'),
        amount:total
      });
      return order.data;
    },
    onSuccess: d => {
      toast(`Order #${d.order_number} completed — SAR ${parseFloat(d.total).toFixed(2)}`, 'success');
      qc.invalidateQueries({ queryKey:['dashboard'] });
      qc.invalidateQueries({ queryKey:['orders-recent'] });
      setReceipt(d);
      setCart([]);
      setDiscount(0);
      setCustomer(null);
    },
    onError: () => toast('Payment failed — check connection and try again', 'error')
  });

  const addToCart = (v:any, pname:string) => {
    setCart(prev => {
      const ex = prev.find(i=>i.id===v.id);
      if (ex) return prev.map(i=>i.id===v.id ? {...i,qty:i.qty+1} : i);
      return [...prev, { id:v.id, sku:v.sku, name:`${pname} — ${v.name}`, price:parseFloat(v.selling_price), qty:1, discount:0 }];
    });
    setSearch('');
    toast(`${pname} added to cart`, 'success');
  };

  const sub = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const discAmt = discount;
  const tax = (sub-discAmt)*0.15;
  const total = sub - discAmt + tax;

  const filtered = products.filter((p:any) =>
    search && p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (receipt) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:500 }}>
      <div className="card" style={{ maxWidth:380, width:'100%', padding:32, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>Payment Successful!</div>
        <div style={{ color:'var(--text-secondary)', fontSize:12, marginBottom:4 }}>Order #{receipt.order_number}</div>
        <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:16 }}>
          {method} · {customer?.name||'Walk-in'} · ZATCA e-invoice generated
        </div>
        <div style={{ fontSize:32, fontWeight:800, color:'var(--fill-accent)', marginBottom:8 }}>
          SAR {parseFloat(receipt.total).toFixed(2)}
        </div>
        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:20 }}>
          Incl. VAT SAR {parseFloat(receipt.tax_amount||0).toFixed(2)}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="bt" style={{ flex:1, justifyContent:'center' }} onClick={()=>window.print()}>
            <i className="ti ti-printer" /> Print receipt
          </button>
          <button className="bt bt-p" style={{ flex:1, justifyContent:'center' }} onClick={()=>setReceipt(null)}>
            <i className="ti ti-plus" /> New sale
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 270px', height:'calc(100vh - 140px)', gap:0 }}>
      {/* ── Left: product search + cart ──────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border-color)', overflow:'hidden' }}>
        {/* Search bar */}
        <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', background:'var(--surface-2)' }}>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--surface-1)', border:'1px solid var(--border-color)', borderRadius:'var(--radius)' }}>
              <i className="ti ti-barcode" style={{ fontSize:18, color:'var(--text-secondary)' }} />
              <input type="text" placeholder="Scan barcode or type product name…" value={search}
                onChange={e=>setSearch(e.target.value)} autoFocus
                style={{ border:'none', background:'transparent', outline:'none', flex:1, fontSize:13, padding:0 }} />
              {search && <span style={{ cursor:'pointer', color:'var(--text-secondary)' }} onClick={()=>setSearch('')}>×</span>}
            </div>
            {/* Customer search */}
            <select value={customer?.id||''} onChange={e=>{
              const c = customers.find((x:any)=>x.id===e.target.value);
              setCustomer(c||null);
              if(c) toast(`Customer: ${c.name} — ${c.loyalty_points} pts`, 'info');
            }} style={{ padding:'8px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:'var(--surface-2)', fontSize:12, color:'var(--text-primary)', maxWidth:160 }}>
              <option value="">Walk-in customer</option>
              {customers.map((c:any)=>(
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search results */}
        {search && (
          <div style={{ background:'var(--surface-2)', borderBottom:'1px solid var(--border-color)', maxHeight:200, overflowY:'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted-custom)', fontSize:12 }}>No products match "{search}"</div>
            )}
            {filtered.map((p:any) => p.variants?.map((v:any) => (
              <div key={v.id} onClick={()=>addToCart(v,p.name)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-color)' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <div style={{ width:36, height:36, background:'var(--surface-1)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className="ti ti-shirt" style={{ fontSize:18 }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{v.sku} · {v.name}</div>
                </div>
                <div style={{ fontWeight:700, color:'var(--fill-accent)' }}>SAR {parseFloat(v.selling_price).toFixed(2)}</div>
                <span className="bx g">+Add</span>
              </div>
            )))}
          </div>
        )}

        {/* Cart items */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 14px' }}>
          {cart.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, color:'var(--text-muted-custom)', gap:12 }}>
              <i className="ti ti-shopping-cart" style={{ fontSize:48 }} />
              <div style={{ fontSize:14, fontWeight:600 }}>Cart is empty</div>
              <div style={{ fontSize:12 }}>Search or scan a product above to add it</div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.5px' }}>{cart.length} ITEMS IN CART</span>
                <button className="bt bt-d" onClick={()=>{ setCart([]); toast('Cart cleared','info'); }}>
                  <i className="ti ti-trash" /> Clear all
                </button>
              </div>
              {cart.map(item=>(
                <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:10, alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{item.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted-custom)' }}>{item.sku} · SAR {item.price.toFixed(2)} each</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id&&i.qty>1?{...i,qty:i.qty-1}:i))}
                      style={{ width:28, height:28, border:'1px solid var(--border-color)', borderRadius:6, background:'var(--surface-1)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                    <span style={{ fontWeight:700, minWidth:24, textAlign:'center' }}>{item.qty}</span>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i))}
                      style={{ width:28, height:28, border:'1px solid var(--border-color)', borderRadius:6, background:'var(--surface-1)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  </div>
                  <div style={{ fontWeight:700, minWidth:80, textAlign:'right' }}>
                    SAR {(item.price*item.qty).toFixed(2)}
                  </div>
                  <button onClick={()=>setCart(p=>p.filter(i=>i.id!==item.id))}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-danger-custom)', fontSize:18, padding:'0 4px' }}>×</button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Discount bar */}
        {showDiscount && (
          <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border-color)', background:'var(--bg-warning-custom)', display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-warning-custom)' }}>Discount (SAR):</span>
            <input type="number" value={discount||''} onChange={e=>setDiscount(parseFloat(e.target.value)||0)}
              placeholder="0.00" style={{ width:100, padding:'5px 8px', border:'1px solid var(--border-warning-custom)', borderRadius:'var(--radius)', fontSize:12 }} />
            <button className="bt" onClick={()=>{setShowDiscount(false);setDiscount(0);}}>Remove</button>
          </div>
        )}
      </div>

      {/* ── Right: payment panel ──────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, padding:12, background:'var(--surface-2)', overflow:'auto' }}>
        {/* Customer indicator */}
        {customer && (
          <div style={{ padding:'8px 10px', background:'var(--bg-accent)', borderRadius:'var(--radius)', fontSize:11 }}>
            <div style={{ fontWeight:600, color:'var(--text-accent)' }}><i className="ti ti-user-check" /> {customer.name}</div>
            <div style={{ color:'var(--text-accent)' }}>{customer.loyalty_points} loyalty pts · {customer.loyalty_tier}</div>
          </div>
        )}

        {/* Order total */}
        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, letterSpacing:'.5px' }}>ORDER TOTAL</div>
          {[['Subtotal ('+cart.reduce((s,i)=>s+i.qty,0)+' items)', 'SAR '+sub.toFixed(2)],
            ['Discount', discount>0?'− SAR '+discAmt.toFixed(2):'—'],
            ['VAT 15%', '+ SAR '+tax.toFixed(2)]].map(([l,v])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', color:'var(--text-secondary)', marginBottom:5, fontSize:12 }}>
              <span>{l}</span><span>{v}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid var(--border-color)', paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:14 }}>TOTAL</span>
            <span style={{ fontWeight:800, fontSize:22, color:'var(--fill-accent)' }}>SAR {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', marginBottom:6, letterSpacing:'.5px' }}>PAYMENT METHOD</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
            {METHODS.map(([name,icon])=>(
              <button key={name} onClick={()=>setMethod(name)}
                style={{ padding:'8px 6px', fontSize:11, fontWeight:500, border:`2px solid ${method===name?'var(--fill-accent)':'var(--border-color)'}`, borderRadius:'var(--radius)', cursor:'pointer', background:method===name?'var(--bg-accent)':'var(--surface-1)', color:method===name?'var(--fill-accent)':'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <i className={'ti '+icon} style={{ fontSize:14 }} />{name}
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display:'flex', gap:5 }}>
          <button className="bt" style={{ flex:1, justifyContent:'center' }} onClick={()=>setShowDiscount(p=>!p)}>
            <i className="ti ti-percentage" /> Discount
          </button>
          <button className="bt" style={{ flex:1, justifyContent:'center' }}>
            <i className="ti ti-player-pause" /> Hold
          </button>
        </div>

        {/* Charge button */}
        <button className="charge-btn" disabled={cart.length===0||chargeMut.isPending}
          onClick={()=>chargeMut.mutate()} style={{ marginTop:'auto' }}>
          {chargeMut.isPending
            ? <><div className="spinner-border spinner-border-sm me-2" />Processing…</>
            : <><i className="ti ti-check" style={{ fontSize:18 }} /> &nbsp;Charge SAR {total.toFixed(2)}</>}
        </button>

        {/* ZATCA notice */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:'var(--surface-1)', borderRadius:'var(--radius)' }}>
          <i className="ti ti-shield-check" style={{ fontSize:13, color:'var(--text-success-custom)' }} />
          <span style={{ fontSize:10, color:'var(--text-secondary)' }}>ZATCA e-invoice generated automatically on charge</span>
        </div>
      </div>
    </div>
  );
}
