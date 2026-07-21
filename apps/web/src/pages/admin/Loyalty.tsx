
import StatRow from '../../components/StatRow';
const PROMOS = [
  ['Ramadan 2026 Sale','All categories 20% off · All branches','g'],
  ['GOLD10 Coupon','10% off Gold+ · All channels','g'],
  ['Buy 2 Get 1 Free','Accessories · Riyadh Mall','g'],
  ['Flash Friday Shoes','Shoes 30% off Fri 4–8 PM','a'],
  ['New Season Welcome','First purchase 15% off','g'],
  ['VIP Early Access','Platinum members preview','g'],
];
export default function Loyalty() {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div><div style={{ fontSize:14, fontWeight:600 }}>Loyalty & promotions</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>Loyalty tiers · Active promotions · Coupons</div></div>
        <button className="bt bt-p"><i className="ti ti-plus" /> New promotion</button>
      </div>
      <div style={{ display:'flex', gap:5, marginBottom:10 }}>
        {['Loyalty tiers','Promotions (8)','Coupons','Gift cards','Customer wallet'].map((t,i)=><button key={t} className={'snb'+(i===0?' on':'')}>{t}</button>)}
      </div>
      <StatRow stats={[{label:'Active members',value:'4,200'},{label:'Pts issued (Jul)',value:'284,000'},{label:'Pts redeemed',value:'42,000'},{label:'Redemption rate',value:'14.8%'},{label:'Gift cards active',value:'SAR 18,400'},{label:'Coupons used',value:'840'}]} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div className="card">
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Loyalty tier configuration</div>
          {[['Bronze','0 – 999 pts','1 pt per SAR 5 spent'],['Silver','1,000 – 4,999 pts','1 pt per SAR 4 spent'],['Gold','5,000 – 19,999 pts','1 pt per SAR 3 + 5% birthday'],['Platinum','20,000+ pts','1 pt per SAR 2 + free delivery + VIP']].map(([t,r,d])=>(
            <div key={t} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'7px 0', borderBottom:'0.5px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{t} <span style={{ fontWeight:400, color:'var(--text-muted)', fontSize:10 }}>{r}</span></div>
                <div style={{ fontSize:10, color:'var(--text-secondary)', marginTop:2 }}>{d}</div>
              </div>
              <span className="bx g">Active</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Active promotions</div>
          {PROMOS.map(([n,d,c])=>(
            <div key={n} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'5px 0', borderBottom:'0.5px solid var(--border)' }}>
              <div><div style={{ fontWeight:600 }}>{n}</div><div style={{ fontSize:10, color:'var(--text-secondary)' }}>{d}</div></div>
              <span className={'bx '+c}>{c==='g'?'Active':'Scheduled'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
