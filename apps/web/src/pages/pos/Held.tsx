import { useState, useEffect } from 'react';

export default function POSHeld() {
  const [held, setHeld] = useState<any[]>([]);

  useEffect(() => {
    const load = () => {
      const h = JSON.parse(localStorage.getItem('held_orders')||'[]');
      setHeld(h);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const resume = (h: any) => {
    localStorage.setItem('resume_cart', JSON.stringify(h));
    // Navigate to POS sale — trigger custom event
    window.dispatchEvent(new CustomEvent('resume-held', { detail: h }));
    alert('Cart restored — go to New Sale to continue');
  };

  const discard = (id: string) => {
    if (!confirm('Discard this held order?')) return;
    const updated = held.filter(h => h.id !== id);
    localStorage.setItem('held_orders', JSON.stringify(updated));
    setHeld(updated);
  };

  const total = (cart: any[]) => cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2);

  return (
    <div style={{ padding:14 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:600 }}>Held / parked orders</div>
          <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{held.length} order{held.length!==1?'s':''} on hold</div>
        </div>
      </div>

      {held.length===0 && (
        <div style={{ textAlign:'center',padding:40,color:'var(--text-secondary)' }}>
          <i className="ti ti-player-pause" style={{ fontSize:36,display:'block',marginBottom:8 }} />
          No held orders — use "Hold sale" button in POS to park an order
        </div>
      )}

      {held.map(h=>(
        <div key={h.id} className="card" style={{ marginBottom:8 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <div style={{ width:36,height:36,borderRadius:'50%',background:'var(--bg-accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'var(--fill-accent)' }}>
                {h.cart?.length||0}
              </div>
              <div>
                <div style={{ fontSize:13,fontWeight:600 }}>{h.id}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>
                  Held at {h.time} · {h.cart?.length||0} items · SAR {total(h.cart||[])}
                </div>
              </div>
            </div>
            <span className="bx a"><i className="ti ti-clock" /> On hold</span>
          </div>

          {/* Items */}
          <div style={{ marginBottom:8 }}>
            {(h.cart||[]).slice(0,3).map((item:any,i:number)=>(
              <div key={i} style={{ fontSize:11,color:'var(--text-secondary)',padding:'2px 0' }}>
                {item.name} × {item.qty} — SAR {(item.price*item.qty).toFixed(2)}
              </div>
            ))}
            {(h.cart||[]).length>3&&<div style={{ fontSize:11,color:'var(--text-secondary)' }}>+{h.cart.length-3} more items</div>}
          </div>

          {h.note&&<div style={{ fontSize:11,color:'var(--text-secondary)',padding:'5px 9px',background:'var(--surface-1)',borderRadius:'var(--radius)',marginBottom:8 }}>
            <i className="ti ti-note" style={{ marginRight:4 }} />{h.note}
          </div>}

          <div style={{ display:'flex',gap:5 }}>
            <button className="bt bt-p" onClick={()=>resume(h)}><i className="ti ti-player-play" /> Resume</button>
            <button className="bt bt-d" onClick={()=>discard(h.id)}><i className="ti ti-trash" /> Discard</button>
          </div>
        </div>
      ))}
    </div>
  );
}
