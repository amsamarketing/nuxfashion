export default function ZReport() {
  const stats=[['Total sales','SAR 12,840'],['Transactions','47'],['Avg basket','SAR 273'],['Returns','3 · SAR 640'],['Discounts given','SAR 420'],['VAT collected','SAR 1,669'],['Loyalty pts issued','1,284'],['Gift cards redeemed','SAR 200']];
  return (
    <div style={{ padding:14 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div><div style={{ fontSize:14,fontWeight:600 }}>Z-report — End of shift</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>Morning shift 07:00–15:00 · Terminal 1</div></div>
        <div style={{ display:'flex',gap:5 }}>
          <button className="bt"><i className="ti ti-printer" /> Print</button>
          <button className="bt"><i className="ti ti-download" /> Export PDF</button>
          <button className="bt bt-p"><i className="ti ti-lock" /> Close shift</button>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginBottom:12 }}>
        {stats.map(([l,v])=>(
          <div key={l} className="card" style={{ textAlign:'center' }}><div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:4 }}>{l}</div><div style={{ fontSize:15,fontWeight:700 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
        <div className="card"><div style={{ fontSize:12,fontWeight:600,marginBottom:8 }}>Payment breakdown</div>
          {[['Cash','SAR 4,200','33%'],['Card (mada/Visa)','SAR 3,800','30%'],['Tabby','SAR 2,440','19%'],['Tamara','SAR 1,200','9%'],['Apple Pay','SAR 800','6%'],['Store wallet','SAR 400','3%']].map(([l,v,p])=>(
            <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid var(--border)' }}>
              <span style={{ color:'var(--text-secondary)' }}>{l}</span><span style={{ fontWeight:600 }}>{v} <span style={{ color:'var(--text-muted)',fontSize:10 }}>{p}</span></span>
            </div>
          ))}
        </div>
        <div className="card"><div style={{ fontSize:12,fontWeight:600,marginBottom:8 }}>Cash reconciliation</div>
          {[['Opening float','SAR 500.00'],['Cash sales','+ SAR 4,200.00'],['Cash refunds','− SAR 340.00'],['Expected','SAR 4,360.00'],['Actual counted','SAR 4,360.00'],['Variance','SAR 0.00 ✓']].map(([l,v],i)=>(
            <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid var(--border)' }}>
              <span style={{ color:'var(--text-secondary)' }}>{l}</span><span style={{ fontWeight:i===5?700:400,color:i===5?'var(--text-success)':'' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
