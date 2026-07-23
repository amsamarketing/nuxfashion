import { useState, useEffect } from 'react';

export default function POSHeld() {
  const [held, setHeld] = useState<any[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        const parsed = JSON.parse(localStorage.getItem('held_orders')||'[]');
        const h = Array.isArray(parsed) ? parsed : [];
        const normalized = h.map((o:any) => ({
          ...o,
          heldAt: o.heldAt || Number(String(o.id||'').match(/\d{13}/)?.[0]) || Date.now(),
        }));
        const valid = normalized.filter((o:any) => Date.now() - o.heldAt < TWO_HOURS);
        localStorage.setItem('held_orders', JSON.stringify(valid));
        setHeld(valid);
      } catch {
        setHeld([]);
      }
    };
    load();
    const interval = setInterval(load, 30000); // re-check every 30s
    window.addEventListener('storage', load);
    return () => { clearInterval(interval); window.removeEventListener('storage', load); };
  }, []);

  const resume = (h: any) => {
    localStorage.setItem('resume_cart', JSON.stringify(h));
    window.dispatchEvent(new CustomEvent('resume-held', { detail: h }));
    // Remove from held list
    const updated = held.filter(o => o.id !== h.id);
    localStorage.setItem('held_orders', JSON.stringify(updated));
    setHeld(updated);
  };

  const discard = (id: string) => {
    if (!confirm('Discard this held order?')) return;
    const updated = held.filter(h => h.id !== id);
    localStorage.setItem('held_orders', JSON.stringify(updated));
    setHeld(updated);
  };

  const total = (cart: any[]) => cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2);

  return (
    <div className="pos-page">
      <div className="pos-page-inner">
      <div className="pos-page-header">
        <div className="pos-page-title">
          <div className="pos-page-title-icon"><i className="ti ti-player-pause"/></div>
          <div>
            <h2>Held Orders</h2>
            <p>{held.length} order{held.length!==1?'s':''} waiting · automatically expires after 2 hours</p>
          </div>
        </div>
      </div>

      {held.length===0 && (
        <div className="pos-empty">
          <i className="ti ti-player-pause"/>
          <div style={{fontWeight:700,color:'#374151',marginBottom:4}}>No held orders</div>
          <div style={{fontSize:12}}>Use the Hold button in New Sale to park an order</div>
        </div>
      )}

      <div className="pos-held-grid">
      {held.map(h=>(
        <div key={h.id} className="pos-held-card">
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
            <span className="bx a"><i className="ti ti-clock" /> {(()=>{
              const mins=Math.max(0,Math.floor((2*3600000-(Date.now()-(h.heldAt||0)))/60000));
              return mins>60?`${Math.floor(mins/60)}h ${mins%60}m left`:`${mins}m left`;
            })()}</span>
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
            <button className="pos-action" style={{flex:1}} onClick={()=>resume(h)}><i className="ti ti-player-play" /> Resume order</button>
            <button className="pos-action danger" onClick={()=>discard(h.id)}><i className="ti ti-trash" /> Discard</button>
          </div>
        </div>
      ))}
      </div>
      </div>
    </div>
  );
}
