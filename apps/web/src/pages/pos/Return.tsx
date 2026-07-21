export default function POSReturn() {
  return (
    <div style={{ padding:14 }}>
      <div style={{ fontSize:14,fontWeight:600,marginBottom:12 }}>Process return / exchange</div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12 }}>
        <div>
          <div style={{ fontSize:10,fontWeight:600,color:'var(--text-muted)',marginBottom:5,letterSpacing:'.5px' }}>SEARCH BY ORDER NUMBER</div>
          <div style={{ display:'flex',gap:5 }}>
            <div style={{ flex:1,display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'var(--surface-1)',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius)' }}>
              <i className="ti ti-search" style={{ fontSize:14 }} /><span style={{ color:'var(--text-muted)' }}>Order # or receipt</span>
            </div>
            <button className="bt bt-p">Search</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize:10,fontWeight:600,color:'var(--text-muted)',marginBottom:5,letterSpacing:'.5px' }}>FIND BY CUSTOMER</div>
          <div style={{ display:'flex',gap:5 }}>
            <div style={{ flex:1,display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'var(--surface-1)',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius)' }}>
              <i className="ti ti-phone" style={{ fontSize:14 }} /><span style={{ color:'var(--text-muted)' }}>+966 5x xxx xxxx</span>
            </div>
            <button className="bt">Find</button>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
          <div><div style={{ fontSize:13,fontWeight:600 }}>Order #10821 — Sara Abdullah</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>12 Jul 2026 · Card · SAR 1,240.00</div></div>
          <span className="bx g">Eligible for return</span>
        </div>
        {[['Nike Air Max 270','Size 42 · White · SKU-10042','SAR 450.00',true],["Levi's 511 Slim Jeans","32×30 · Indigo · SKU-10198",'SAR 280.00',false],['Ray-Ban Aviator ×2','Gold · Green · SKU-20031','SAR 320.00',true]].map(([n,d,p,c])=>(
          <div key={n as string} className="fl"><input type="checkbox" defaultChecked={c as boolean} />
            <div style={{ flex:1 }}><div style={{ fontWeight:500 }}>{n}</div><div style={{ color:'var(--text-secondary)',fontSize:10 }}>{d}</div></div>
            <span style={{ fontWeight:600 }}>{p}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
        <div className="card">
          <div style={{ fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:8 }}>RETURN REASON</div>
          {['Wrong size / fit','Defective / damaged','Changed mind','Wrong item received','Other'].map(r=>(
            <label key={r} style={{ display:'flex',alignItems:'center',gap:7,padding:'4px 0',cursor:'pointer',fontSize:12,color:'var(--text-secondary)' }}><input type="radio" name="reason" />{r}</label>
          ))}
        </div>
        <div className="card">
          <div style={{ fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:8 }}>REFUND METHOD</div>
          {[['Original card','~3–5 business days',true],['Cash','Immediate',false],['Store credit','Instant',false],['Exchange','Select replacement',false]].map(([l,d,c])=>(
            <label key={l as string} style={{ display:'flex',alignItems:'flex-start',gap:7,padding:'5px 0',cursor:'pointer' }}>
              <input type="radio" name="refund" defaultChecked={c as boolean} style={{ marginTop:2 }} />
              <div><div style={{ fontWeight:500,fontSize:12 }}>{l}</div><div style={{ fontSize:10,color:'var(--text-secondary)' }}>{d}</div></div>
            </label>
          ))}
        </div>
      </div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--surface-1)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)' }}>
        <div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>Return total (2 selected items)</div>
          <div style={{ fontSize:17,fontWeight:700 }}>SAR 770.00 <span style={{ fontSize:12,color:'var(--text-success)' }}>+ VAT SAR 100.50</span></div></div>
        <div style={{ display:'flex',gap:6 }}><button className="bt">Cancel</button><button className="bt bt-p"><i className="ti ti-check" /> Process return</button></div>
      </div>
    </div>
  );
}
