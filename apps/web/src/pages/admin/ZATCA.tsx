export default function ZATCA() {
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <div><div style={{ fontSize:14,fontWeight:600 }}>ZATCA e-invoices — Phase 2</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>Certificate valid · Hash chain intact</div></div>
        <div style={{ display:'flex',gap:5 }}>
          <button className="bt"><i className="ti ti-refresh" /> Sync</button>
          <button className="bt"><i className="ti ti-download" /> Export XML</button>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:7,marginBottom:10 }}>
        {[['Total invoices','1,284'],['B2C cleared','1,261'],['B2B cleared','23'],['Pending','0'],['Failed','0'],['VAT collected','SAR 192,600']].map(([l,v])=>(
          <div key={l} className="card" style={{ textAlign:'center' }}><div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:3 }}>{l}</div><div style={{ fontSize:14,fontWeight:700 }}>{v}</div></div>
        ))}
      </div>
      <div className="card" style={{ marginBottom:10,display:'flex',alignItems:'center',gap:10,background:'var(--bg-success)',borderColor:'var(--border-success)' }}>
        <i className="ti ti-certificate" style={{ fontSize:20,color:'var(--text-success)' }} />
        <div><div style={{ fontSize:13,fontWeight:600,color:'var(--text-success)' }}><i className="ti ti-check" /> All invoices cleared — ZATCA compliance: 100%</div>
          <div style={{ fontSize:11,color:'var(--text-success)' }}>Hash chain valid · Certificate active · HSM secured</div></div>
      </div>
      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div className="tr th" style={{ gridTemplateColumns:'100px 1fr 60px 100px 80px 80px 80px' }}>
          {['Invoice #','Customer / party','Type','Total incl. VAT','VAT','ZATCA status','Date'].map(h=><span key={h}>{h}</span>)}
        </div>
        {[['INV-10841','Sara Abdullah · B2C','B2C','SAR 1,088','SAR 142','14 Jul 10:42'],['INV-10840','Khalid Trading Co. · VAT 310012345','B2B','SAR 24,000','SAR 3,130','14 Jul 10:38'],['INV-10839','Walk-in customer','B2C','SAR 215','SAR 28','14 Jul 10:30'],['INV-10838','Fatima Hassan','B2C','SAR 890','SAR 116','14 Jul 10:18'],['INV-10837','Al-Rashid Group · VAT 310098765','B2B','SAR 48,000','SAR 6,261','14 Jul 09:55']].map(r=>(
          <div key={r[0]} className="tr" style={{ gridTemplateColumns:'100px 1fr 60px 100px 80px 80px 80px' }}>
            <span style={{ fontWeight:600 }}>{r[0]}</span>
            <span style={{ color:'var(--text-secondary)' }}>{r[1]}</span>
            <span><span className={'bx '+(r[2]==='B2B'?'b':'n')}>{r[2]}</span></span>
            <span style={{ fontWeight:600 }}>{r[3]}</span>
            <span>{r[4]}</span>
            <span><span className="bx g">Cleared</span></span>
            <span style={{ color:'var(--text-muted)' }}>{r[5]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
