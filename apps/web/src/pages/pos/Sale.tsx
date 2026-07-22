
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

interface CartItem { id:string; sku:string; name:string; price:number; qty:number; }
const METHODS = [['Cash','ti-cash'],['Card','ti-credit-card'],['Tabby','ti-device-mobile'],['Tamara','ti-device-mobile'],['Apple Pay','ti-brand-apple'],['Mada','ti-credit-card']];

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

  const { data: products=[] } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data) });
  const { data: warehouses } = useQuery<{id:string;name:string}[]>({ queryKey:['warehouses'], queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[]) });
  const defaultWarehouseId: string|null = (warehouses && warehouses.length > 0) ? warehouses[0].id : null;
  const { data: customers=[] } = useQuery({ queryKey:['customers'], queryFn:()=>api.get('/customers').then(r=>r.data) });

  const sub = cart.reduce((s,i)=>s+i.price*i.qty, 0);
  const pctAmt = Math.min(sub * (parseFloat(discPct||'0')/100), sub);
  const flatAmt = Math.min(parseFloat(discFlat||'0'), sub - pctAmt);
  const discAmt = pctAmt + flatAmt;
  const taxable = sub - discAmt;
  const tax = taxable * 0.15;
  const total = taxable + tax;

  const filtered = products.filter((p:any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.variants?.some((v:any)=>v.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const addItem = (v:any, pname:string) => {
    setCart(prev => {
      const ex = prev.find(i=>i.id===v.id);
      if (ex) return prev.map(i=>i.id===v.id ? {...i,qty:i.qty+1} : i);
      return [...prev, { id:v.id, sku:v.sku||'', name:`${pname} (${v.name})`, price:parseFloat(v.selling_price||0), qty:1 }];
    });
    toast(`Added: ${pname}`, 'success');
  };

  const chargeMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        customer_id: custId || null,
        lines: cart.map(i=>({ variant_id:i.id, quantity:i.qty, unit_price:i.price, discount_amount:0 })),
        subtotal: sub, tax_amount: tax, discount_amount: discAmt, total
      };
      if (defaultWarehouseId) body.warehouse_id = defaultWarehouseId;
      const order = await api.post('/sales/orders', body);
      await api.post('/sales/payments', {
        order_id: order.data.id,
        payments: [{ method: method.toLowerCase().replace(/ /g,'_'), amount: total }]
      });
      return order.data;
    },
    onSuccess: d => {
      toast(`✅ Order #${d.order_number} — SAR ${parseFloat(d.total).toFixed(2)}`, 'success');
      qc.invalidateQueries({ queryKey:['dashboard'] });
      qc.invalidateQueries({ queryKey:['orders'] });
      setReceipt(d); setCart([]); setDiscPct(''); setDiscFlat(''); setShowDisc(false); setCustId('');
    },
    onError: e => toast(getErr(e), 'error')
  });

  if (receipt) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:480 }}>
      <div className="card" style={{ maxWidth:380, width:'100%', padding:36, textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
        <div style={{ fontSize:20, fontWeight:800, marginBottom:6 }}>Payment Complete</div>
        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4 }}>Order #{receipt.order_number}</div>
        <div style={{ fontSize:11, color:'var(--text-muted-custom)', marginBottom:20 }}>
          {method} · ZATCA e-invoice generated
        </div>
        <div style={{ fontSize:36, fontWeight:800, color:'var(--fill-accent)', marginBottom:4 }}>
          SAR {parseFloat(receipt.total).toFixed(2)}
        </div>
        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:24 }}>
          Incl. VAT 15%: SAR {(parseFloat(receipt.tax_amount)||parseFloat(receipt.total)*15/115).toFixed(2)}
          {discAmt > 0 && ` · Discount: SAR ${discAmt.toFixed(2)}`}{discPct && discAmt>0 && ` (${discPct}%${flatAmt>0?' + SAR '+flatAmt.toFixed(2):''})`}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="bt" style={{ flex:1, justifyContent:'center' }} onClick={()=>{
              const w = window.open('','_blank','width=400,height=600');
              if(!w) return;
              w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
                body{font-family:monospace;font-size:13px;padding:20px;margin:0}
                h2{text-align:center;margin:0 0 4px}
                .center{text-align:center} .line{border-top:1px dashed #000;margin:8px 0}
                .row{display:flex;justify-content:space-between}
                .total{font-size:18px;font-weight:bold}
              </style></head><body>
                <h2>NuxFashion</h2>
                <div class="center" style="font-size:11px;margin-bottom:8px">Riyadh · Tel: +966-XX-XXXXXXX</div>
                <div class="line"></div>
                <div class="row"><span>Order #</span><span>${receipt.order_number}</span></div>
                <div class="row"><span>Date</span><span>${new Date().toLocaleString()}</span></div>
                <div class="line"></div>
                <div class="row total"><span>Total</span><span>SAR ${parseFloat(receipt.total).toFixed(2)}</span></div>
                <div class="row"><span>VAT 15%</span><span>SAR ${parseFloat(receipt.tax_amount||0).toFixed(2)}</span></div>
                <div class="line"></div>
                <div class="center" style="font-size:11px;margin-top:8px">Thank you for shopping!</div>
                <div class="center" style="font-size:10px;color:#666">ZATCA e-invoice generated</div>
              </body></html>`);
              w.document.close(); w.focus(); w.print(); w.close();
            }}><i className="ti ti-printer" /> Print</button>
          <button className="bt bt-p" style={{ flex:1, justifyContent:'center' }} onClick={()=>setReceipt(null)}>
            <i className="ti ti-plus" /> New sale
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 270px', height:'calc(100vh - 145px)' }}>

      {/* LEFT — products + cart */}
      <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border-color)', overflow:'hidden' }}>

        {/* Search bar */}
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-color)', background:'var(--surface-2)' }}>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--surface-1)', border:'1px solid var(--border-color)', borderRadius:'var(--radius)' }}>
              <i className="ti ti-barcode" style={{ fontSize:18, color:'var(--text-secondary)' }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Scan barcode or type product name…" autoFocus
                style={{ border:'none', background:'transparent', outline:'none', flex:1, fontSize:13, padding:0 }} />
              {search && <span style={{ cursor:'pointer', color:'var(--text-secondary)', fontSize:16 }} onClick={()=>setSearch('')}>×</span>}
            </div>
            <select value={custId} onChange={e=>setCustId(e.target.value)}
              style={{ padding:'8px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:'var(--surface-2)', fontSize:12, color:'var(--text-primary)', maxWidth:170 }}>
              <option value="">Walk-in customer</option>
              {customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Product grid */}
        {filtered.length > 0 && (
          <div style={{ borderBottom:'1px solid var(--border-color)', maxHeight:220, overflowY:'auto', background:'var(--surface-2)' }}>
            {filtered.slice(0,20).map((p:any) => p.variants?.map((v:any) => (
              <div key={v.id} onClick={()=>addItem(v,p.name)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-color)' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <div style={{ width:34, height:34, background:'var(--surface-1)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className="ti ti-shirt" style={{ fontSize:17 }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:12 }}>{p.name}</div>
                  <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{v.sku} · {v.name}</div>
                </div>
                <div style={{ fontWeight:700, color:'var(--fill-accent)', fontSize:13 }}>SAR {parseFloat(v.selling_price||0).toFixed(2)}</div>
                <span className="bx g" style={{ fontSize:9 }}>+ Add</span>
              </div>
            )))}
          </div>
        )}

        {/* Cart */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 14px' }}>
          {cart.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted-custom)', gap:10 }}>
              <i className="ti ti-shopping-cart" style={{ fontSize:44 }} />
              <div style={{ fontSize:14, fontWeight:600 }}>Cart is empty</div>
              <div style={{ fontSize:12 }}>Click any product above to add it</div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.5px' }}>
                  {cart.reduce((s,i)=>s+i.qty,0)} ITEMS IN CART
                </span>
                <button className="bt bt-d" style={{ fontSize:10 }} onClick={()=>setCart([])}>
                  <i className="ti ti-trash" /> Clear
                </button>
              </div>
              {cart.map(item => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border-color)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:12 }}>{item.name}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{item.sku} · SAR {item.price.toFixed(2)} each</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id&&i.qty>1?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0))}
                      style={{ width:26, height:26, border:'1px solid var(--border-color)', borderRadius:5, background:'var(--surface-1)', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                    <span style={{ fontWeight:700, minWidth:22, textAlign:'center', fontSize:13 }}>{item.qty}</span>
                    <button onClick={()=>setCart(p=>p.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i))}
                      style={{ width:26, height:26, border:'1px solid var(--border-color)', borderRadius:5, background:'var(--surface-1)', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  </div>
                  <div style={{ fontWeight:700, minWidth:75, textAlign:'right', fontSize:13 }}>SAR {(item.price*item.qty).toFixed(2)}</div>
                  <button onClick={()=>setCart(p=>p.filter(i=>i.id!==item.id))}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-danger-custom)', fontSize:18, padding:'0 2px' }}>×</button>
                </div>
              ))}

              {/* Discount row */}
              <div style={{ marginTop:10, padding:'10px 12px', background:'var(--surface-1)', borderRadius:'var(--radius)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:showDisc?10:0 }}>
                  <span style={{ fontSize:12, fontWeight:600, flex:1 }}>Discount</span>
                  {discAmt>0 && <span style={{ fontSize:11, fontWeight:700, color:'var(--text-success-custom)' }}>− SAR {discAmt.toFixed(2)}</span>}
                  <button className={'snb'+(showDisc?' on':'')} onClick={()=>{ setShowDisc(p=>!p); if(showDisc){setDiscPct('');setDiscFlat('');} }}>
                    {showDisc?'Remove':'+ Add discount'}
                  </button>
                </div>
                {showDisc && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--text-secondary)', marginBottom:4 }}>% PERCENTAGE</div>
                      <div style={{ display:'flex', alignItems:'center', gap:5, border:'1px solid var(--border-color)', borderRadius:'var(--radius)', overflow:'hidden', background:'var(--surface-2)' }}>
                        <input type="number" value={discPct} onChange={e=>setDiscPct(e.target.value)}
                          placeholder="0" min="0" max="100"
                          style={{ flex:1, border:'none', outline:'none', padding:'6px 8px', fontSize:13, fontWeight:600, background:'transparent', width:0 }} />
                        <span style={{ padding:'0 10px', fontSize:13, fontWeight:700, color:'var(--fill-accent)', borderLeft:'1px solid var(--border-color)', background:'var(--surface-1)' }}>%</span>
                      </div>
                      {discPct && <div style={{ fontSize:10, color:'var(--text-success-custom)', marginTop:3 }}>= SAR {pctAmt.toFixed(2)} off</div>}
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--text-secondary)', marginBottom:4 }}>SAR FLAT AMOUNT</div>
                      <div style={{ display:'flex', alignItems:'center', gap:5, border:'1px solid var(--border-color)', borderRadius:'var(--radius)', overflow:'hidden', background:'var(--surface-2)' }}>
                        <span style={{ padding:'0 8px', fontSize:11, fontWeight:700, color:'var(--text-secondary)', borderRight:'1px solid var(--border-color)', background:'var(--surface-1)' }}>SAR</span>
                        <input type="number" value={discFlat} onChange={e=>setDiscFlat(e.target.value)}
                          placeholder="0.00" min="0"
                          style={{ flex:1, border:'none', outline:'none', padding:'6px 8px', fontSize:13, fontWeight:600, background:'transparent', width:0 }} />
                      </div>
                      {discFlat && <div style={{ fontSize:10, color:'var(--text-success-custom)', marginTop:3 }}>= SAR {flatAmt.toFixed(2)} off</div>}
                    </div>
                    {discAmt>0 && (
                      <div style={{ gridColumn:'1/-1', padding:'7px 10px', background:'var(--bg-success-custom)', borderRadius:'var(--radius)', display:'flex', justifyContent:'space-between', fontSize:12 }}>
                        <span style={{ color:'var(--text-success-custom)', fontWeight:600 }}>Total discount</span>
                        <span style={{ fontWeight:800, color:'var(--text-success-custom)' }}>− SAR {discAmt.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT — payment panel */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, padding:12, background:'var(--surface-2)', overflow:'auto' }}>
        {custId && customers.find((c:any)=>c.id===custId) && (() => {
          const c = customers.find((x:any)=>x.id===custId);
          return <div style={{ padding:'8px 10px', background:'var(--bg-accent)', borderRadius:'var(--radius)', fontSize:11 }}>
            <i className="ti ti-user-check" style={{ marginRight:5 }} />
            <strong>{c.name}</strong> · {c.loyalty_points} pts · <span style={{ textTransform:'capitalize' }}>{c.loyalty_tier}</span>
          </div>;
        })()}

        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, letterSpacing:'.5px' }}>ORDER TOTAL</div>
          {[
            ['Items ('+cart.reduce((s,i)=>s+i.qty,0)+')', 'SAR '+sub.toFixed(2)],
            (pctAmt>0||flatAmt>0) ? ['Discount'+(discPct?' '+discPct+'%':'')+(discFlat?' + SAR '+parseFloat(discFlat).toFixed(2):''), '− SAR '+discAmt.toFixed(2)] : null,
            ['VAT 15%', '+ SAR '+tax.toFixed(2)],
          ].filter(Boolean).map((row:any) => (
            <div key={row[0]} style={{ display:'flex', justifyContent:'space-between', color:'var(--text-secondary)', marginBottom:5, fontSize:12 }}>
              <span>{row[0]}</span><span style={{ color: row[0].startsWith('Disc')?'var(--text-success-custom)':'' }}>{row[1]}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid var(--border-color)', paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:14 }}>TOTAL</span>
            <span style={{ fontWeight:800, fontSize:22, color:'var(--fill-accent)' }}>SAR {total.toFixed(2)}</span>
          </div>
        </div>

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

        <button className="charge-btn" disabled={cart.length===0||chargeMut.isPending} onClick={()=>chargeMut.mutate()}
          style={{ marginTop:'auto' }}>
          {chargeMut.isPending
            ? <><div className="spinner-border spinner-border-sm me-2" />Processing…</>
            : <><i className="ti ti-check" style={{ fontSize:18 }} /> Charge SAR {total.toFixed(2)}</>}
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 9px', background:'var(--surface-1)', borderRadius:'var(--radius)' }}>
          <i className="ti ti-shield-check" style={{ fontSize:12, color:'var(--text-success-custom)' }} />
          <span style={{ fontSize:10, color:'var(--text-secondary)' }}>ZATCA e-invoice auto-generated on charge</span>
        </div>
      </div>
    </div>
  );
}
