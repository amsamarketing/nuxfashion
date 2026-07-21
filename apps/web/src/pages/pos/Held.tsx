const HELD=[{id:'Hold-001',name:'Walk-in customer',ini:'WI',time:'12:15 PM',items:'2 items · SAR 630',note:'Waiting for customer to return with correct card'},{id:'Hold-002',name:'Khalid Al-Saud',ini:'KA',time:'11:48 AM',items:'5 items · SAR 1,840',note:'Checking size availability in backroom'},{id:'Hold-003',name:'Sara Abdullah',ini:'SA',time:'10:22 AM',items:'1 item · SAR 280',note:'Price check requested by customer'}];
export default function POSHeld() {
  return (
    <div style={{ padding:14 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div><div style={{ fontSize:14,fontWeight:600 }}>Held / parked orders</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>3 orders on hold</div></div>
        <button className="bt bt-p"><i className="ti ti-plus" /> New sale</button>
      </div>
      {HELD.map(h=>(
        <div key={h.id} className="card" style={{ marginBottom:8 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <div style={{ width:36,height:36,borderRadius:'50%',background:'var(--bg-accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'var(--text-accent)' }}>{h.ini}</div>
              <div><div style={{ fontSize:13,fontWeight:600 }}>{h.name}</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>Held at {h.time} · {h.items}</div></div>
            </div>
            <span className="bx a"><i className="ti ti-clock" /> On hold</span>
          </div>
          <div style={{ fontSize:11,color:'var(--text-muted)',padding:'5px 9px',background:'var(--surface-1)',borderRadius:'var(--radius)',marginBottom:8 }}><i className="ti ti-note" style={{ marginRight:4 }} />{h.note}</div>
          <div style={{ display:'flex',gap:5 }}>
            <button className="bt bt-p"><i className="ti ti-player-play" /> Resume</button>
            <button className="bt"><i className="ti ti-eye" /> View</button>
            <button className="bt bt-d"><i className="ti ti-trash" /> Discard</button>
          </div>
        </div>
      ))}
    </div>
  );
}
