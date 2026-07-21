import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
export default function Products() {
  const { data } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data) });
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <div><div style={{ fontSize:14,fontWeight:600 }}>Product catalog</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>{data?.length||0} products</div></div>
        <div style={{ display:'flex',gap:5 }}>
          <button className="bt"><i className="ti ti-upload" /> Import</button>
          <button className="bt"><i className="ti ti-download" /> Export</button>
          <button className="bt bt-p"><i className="ti ti-plus" /> Add product</button>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9 }}>
        {data?.map((p:any)=>(
          <div key={p.id} className="card" style={{ cursor:'pointer' }}>
            <div style={{ width:'100%',height:65,background:'var(--surface-1)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8 }}>
              <i className="ti ti-shirt" style={{ fontSize:28,color:'var(--text-muted)' }} />
            </div>
            <div style={{ fontWeight:600,marginBottom:2 }}>{p.name}</div>
            <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:7 }}>{p.category_name||'—'} · {p.brand_name||'—'} · {p.variants?.length||0} variants</div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontSize:14,fontWeight:700 }}>SAR {parseFloat(p.variants?.[0]?.selling_price||0).toFixed(2)}</span>
              <span className={'bx '+(p.is_active?'g':'n')}>{p.is_active?'Active':'Inactive'}</span>
            </div>
            <div style={{ display:'flex',gap:4,marginTop:8 }}>
              <button className="bt"><i className="ti ti-edit" /> Edit</button>
              <button className="bt"><i className="ti ti-package" /> Stock</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
