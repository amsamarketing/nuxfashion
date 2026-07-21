import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
interface Item { id:string; sku:string; name:string; price:number; qty:number; }
const PAY = [['Cash','ti-cash'],['Card','ti-credit-card'],['Tabby','ti-device-mobile'],['Tamara','ti-device-mobile'],['Apple Pay','ti-brand-apple'],['Mada','ti-credit-card'],['Wallet','ti-wallet'],['Split','ti-arrows-split-2']];
export default function POSSale() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Item[]>([]);
  const [pay, setPay] = useState('Cash');
  const [receipt, setReceipt] = useState<any>(null);
  const { data: products } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data) });
  const charge = useMutation({
    mutationFn: async () => {
      const sub = cart.reduce((s,i)=>s+i.price*i.qty,0);
      const tax = sub*0.15;
      const lines = cart.map(i=>({ variant_id:i.id, quantity:i.qty, unit_price:i.price }));
      const order = await api.post('/sales/orders',{ lines, subtotal:sub, tax_amount:tax, discount_amount:0, total:sub+tax });
      await api.post('/sales/payments',{ order_id:order.data.id, method:pay.toLowerCase().replace(' ','_'), amount:order.data.total });
      return order.data;
    },
    onSuccess: d => { setReceipt(d); setCart([]); }
  });
  const add = (v:any, pname:string) => setCart(prev => {
    const ex = prev.find(i=>i.id===v.id);
    if (ex) return prev.map(i=>i.id===v.id?{...i,qty:i.qty+1}:i);
    return [...prev,{ id:v.id, sku:v.sku, name:pname+' · '+v.name, price:parseFloat(v.selling_price), qty:1 }];
  });
  const upd = (id:string,d:number) => setCart(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));
  const rm = (id:string) => setCart(prev=>prev.filter(i=>i.id!==id));
  const sub = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const vat = sub*0.15;
  const total = sub+vat;
  const filtered = (products||[]).filter((p:any)=>p.name.toLowerCase().includes(search.toLowerCase()));
  if (receipt) return (
    <div style={{ padding:32, textAlign:'center' }}>
      <div className="card" style={{ maxWidth:320, margin:'0 auto', padding:28 }}>
        <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Payment Successful</div>
        <div style={{ color:'var(--text-secondary)', marginBottom:12, fontSize:12 }}>Order #{receipt.order_number} · ZATCA e-invoice generated</div>
        <div style={{ fontSize:26, fontWeight:700, color:'var(--fill-accent)', marginBottom:18 }}>SAR {parseFloat(receipt.total).toFixed(2)}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-printer" /> Print</button>
          <button className="bt bt-p" style={{ flex:1, justifyContent:'center' }} onClick={()=>setReceipt(null)}><i className="ti ti-plus" /> New sale</button>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 250px', minHeight:500 }}>
      <div style={{ padding:'12px 14px', borderRight:'0.5px solid var(--border)' }}>
        <div style={{ display:'flex', gap:7, marginBottom:10 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--surface-1)', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius)' }}>
            <i className="ti ti-barcode" style={{ fontSize:15 }} />
            <input type="text" placeholder="Scan or search product…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ border:'none', background:'transparent', outline:'none', flex:1, padding:0, fontSize:12, width:'auto' }} />
          </div>
          <button className="bt"><i className="ti ti-user-plus" /> Customer</button>
          <button className="bt"><i className="ti ti-percentage" /> Discount</button>
        </div>
        {cart.length===0 && !search && (
          <div style={{ padding:'40px 0', textAlign:'center', color:'var(--text-muted)' }}>
            <i className="ti ti-shopping-cart" style={{ fontSize:36, display:'block', marginBottom:8 }} />Search or scan a product
          </div>
        )}
        {search && filtered.slice(0,8).map((p:any)=>p.variants?.map((v:any)=>(
          <div key={v.id} className="fl" style={{ cursor:'pointer' }} onClick={()=>add(v,p.name)}>
            <div style={{ width:34,height:34,background:'var(--surface-1)',border:'0.5px solid var(--border)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><i className="ti ti-shirt" style={{ fontSize:16 }} /></div>
            <div style={{ flex:1 }}><div style={{ fontWeight:500 }}>{p.name}</div><div style={{ color:'var(--text-secondary)',fontSize:10 }}>{v.sku} · {v.name}</div></div>
            <span style={{ fontWeight:600 }}>SAR {parseFloat(v.selling_price).toFixed(2)}</span>
          </div>
        )))}
        {cart.length>0 && (<>
          <div style={{ fontSize:10,fontWeight:600,color:'var(--text-muted)',margin:'8px 0 5px',letterSpacing:'.5px' }}>{cart.length} ITEMS IN CART</div>
          {cart.map(item=>(
            <div key={item.id} className="fl">
              <div style={{ width:34,height:34,background:'var(--surface-1)',border:'0.5px solid var(--border)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><i className="ti ti-shirt" style={{ fontSize:16 }} /></div>
              <div style={{ flex:1,minWidth:0 }}><div style={{ fontWeight:500,fontSize:12 }}>{item.name}</div><div style={{ color:'var(--text-muted)',fontSize:10 }}>{item.sku}</div></div>
              <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                <span style={{ width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',border:'0.5px solid var(--border-strong)',borderRadius:4,cursor:'pointer',fontSize:14 }} onClick={()=>upd(item.id,-1)}>−</span>
                <span style={{ fontWeight:600,width:18,textAlign:'center' }}>{item.qty}</span>
                <span style={{ width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',border:'0.5px solid var(--border-strong)',borderRadius:4,cursor:'pointer',fontSize:14 }} onClick={()=>upd(item.id,1)}>+</span>
              </div>
              <span style={{ fontWeight:600,minWidth:65,textAlign:'right',fontSize:12 }}>SAR {(item.price*item.qty).toFixed(2)}</span>
              <span style={{ color:'var(--text-danger)',cursor:'pointer',fontSize:16,paddingLeft:4 }} onClick={()=>rm(item.id)}>×</span>
            </div>
          ))}
          <div style={{ display:'flex',gap:5,marginTop:8,paddingTop:8,borderTop:'0.5px solid var(--border)' }}>
            <button className="bt"><i className="ti ti-player-pause" /> Hold</button>
            <button className="bt"><i className="ti ti-scan" /> Coupon</button>
            <button className="bt bt-d" onClick={()=>setCart([])}><i className="ti ti-trash" /> Void</button>
          </div>
        </>)}
      </div>
      <div style={{ padding:10,display:'flex',flexDirection:'column',gap:7 }}>
        <div style={{ fontSize:10,fontWeight:600,color:'var(--text-muted)',letterSpacing:'.5px' }}>ORDER SUMMARY</div>
        <div className="card">
          {[['Subtotal ('+cart.length+' items)','SAR '+sub.toFixed(2)],['VAT 15%','+ SAR '+vat.toFixed(2)]].map(([l,v])=>(
            <div key={l} style={{ display:'flex',justifyContent:'space-between',color:'var(--text-secondary)',marginBottom:4 }}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{ borderTop:'0.5px solid var(--border)',paddingTop:7,display:'flex',justifyContent:'space-between',alignItems:'baseline',marginTop:2 }}>
            <span style={{ fontSize:12,fontWeight:600 }}>Total</span>
            <span style={{ fontSize:18,fontWeight:700 }}>SAR {total.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ fontSize:10,fontWeight:600,color:'var(--text-muted)',letterSpacing:'.5px' }}>PAYMENT METHOD</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4 }}>
          {PAY.map(([name,icon])=>(
            <button key={name} onClick={()=>setPay(name)}
              style={{ padding:'6px 3px',fontSize:10,fontWeight:500,border:'1.5px solid '+(pay===name?'var(--border-accent)':'var(--border-strong)'),borderRadius:'var(--radius)',cursor:'pointer',background:pay===name?'var(--bg-accent)':'var(--surface-1)',color:pay===name?'var(--text-accent)':'var(--text-secondary)' }}>
              <i className={'ti '+icon} style={{ fontSize:13,display:'block',margin:'0 auto 2px' }} />{name}
            </button>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4 }}>
          {['1','2','3','4','5','6','7','8','9','00','0','⌫'].map(k=>(
            <button key={k} className="bt" style={{ textAlign:'center',fontSize:14,padding:'8px',justifyContent:'center' }}>{k}</button>
          ))}
        </div>
        <button className="charge-btn" disabled={cart.length===0||charge.isPending} onClick={()=>charge.mutate()}>
          {charge.isPending?'Processing…':'Charge SAR '+total.toFixed(2)}
        </button>
        {charge.isError && <div style={{ color:'var(--text-danger)',fontSize:11,textAlign:'center' }}>Payment failed. Try again.</div>}
        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 8px',background:'var(--surface-1)',borderRadius:'var(--radius)' }}>
          <i className="ti ti-file-check" style={{ fontSize:12 }} />
          <span style={{ fontSize:10,color:'var(--text-secondary)' }}>ZATCA e-invoice auto-generated</span>
        </div>
      </div>
    </div>
  );
}
