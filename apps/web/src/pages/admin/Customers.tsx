import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
export default function Customers() {
  const { data } = useQuery({ queryKey:['customers'], queryFn:()=>api.get('/customers').then(r=>r.data) });
  const tc:Record<string,string>={bronze:'n',silver:'n',gold:'b',vip:'b',platinum:'b'};
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <div><div style={{ fontSize:14,fontWeight:600 }}>Customers</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>{data?.length||0} customers</div></div>
        <div style={{ display:'flex',gap:5 }}>
          <button className="bt"><i className="ti ti-filter" /> Segment</button>
          <button className="bt bt-p"><i className="ti ti-plus" /> Add customer</button>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 270px',gap:8 }}>
        <div className="card" style={{ padding:0,overflow:'hidden' }}>
          <div className="tr th" style={{ gridTemplateColumns:'1fr 70px 70px 80px' }}>
            {['Customer','Tier','Points','Joined'].map(h=><span key={h}>{h}</span>)}
          </div>
          {data?.map((c:any)=>(
            <div key={c.id} className="tr" style={{ gridTemplateColumns:'1fr 70px 70px 80px' }}>
              <span><div style={{ fontWeight:500 }}>{c.name}</div><div style={{ color:'var(--text-muted)',fontSize:10 }}>{c.phone||c.email||'—'}</div></span>
              <span><span className={'bx '+(tc[c.loyalty_tier]||'n')} style={{ textTransform:'capitalize' }}>{c.loyalty_tier}</span></span>
              <span style={{ fontWeight:600,color:'var(--fill-accent)' }}>{c.loyalty_points}</span>
              <span style={{ color:'var(--text-muted)',fontSize:10 }}>{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {(!data||data.length===0)&&<div style={{ padding:24,textAlign:'center',color:'var(--text-muted)' }}>No customers yet</div>}
        </div>
        <div className="card">{data?.[0] && (<>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
            <div style={{ width:44,height:44,borderRadius:'50%',background:'var(--bg-accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'var(--text-accent)' }}>{data[0].name?.slice(0,2).toUpperCase()}</div>
            <div><div style={{ fontSize:13,fontWeight:600 }}>{data[0].name}</div><span className={'bx '+(tc[data[0].loyalty_tier]||'n')} style={{ textTransform:'capitalize' }}>{data[0].loyalty_tier}</span></div>
          </div>
          {[['Phone',data[0].phone||'—'],['Email',data[0].email||'—'],['Points',data[0].loyalty_points+' pts'],['Joined',new Date(data[0].created_at).toLocaleDateString()]].map(([l,v])=>(
            <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'0.5px solid var(--border)',fontSize:11 }}><span style={{ color:'var(--text-secondary)' }}>{l}</span><span style={{ fontWeight:500 }}>{v}</span></div>
          ))}
          <div style={{ display:'flex',gap:4,marginTop:10 }}>
            <button className="bt"><i className="ti ti-history" /> History</button>
            <button className="bt"><i className="ti ti-edit" /> Edit</button>
          </div>
        </>)}</div>
      </div>
    </div>
  );
}
