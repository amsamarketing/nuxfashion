
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function Inventory() {
  const { data } = useQuery({ queryKey:['inventory'], queryFn:() => api.get('/inventory').then(r=>r.data) });
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600 }}>Inventory</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{data?.length||0} active SKUs · All locations</div>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          <button className="bt"><i className="ti ti-arrows-exchange" /> Transfer stock</button>
          <button className="bt"><i className="ti ti-adjustments" /> Adjustment</button>
          <button className="bt"><i className="ti ti-download" /> Export</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:5, marginBottom:8 }}>
        {['All items','Low stock','Out of stock'].map((t,i) => <button key={t} className={'snb'+(i===0?' on':'')}>{t}</button>)}
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tr th" style={{ gridTemplateColumns:'1fr 60px 70px 80px 70px' }}>
          {['Product / SKU','Qty','Reorder At','Warehouse','Status'].map(h=><span key={h}>{h}</span>)}
        </div>
        {data?.map((i:any) => {
          const low = i.quantity <= i.reorder_point;
          return (
            <div key={i.id} className="tr" style={{ gridTemplateColumns:'1fr 60px 70px 80px 70px', background:low?'var(--bg-danger)':'' }}>
              <span><div style={{ fontWeight:500 }}>{i.product_name}</div><div style={{ color:'var(--text-muted)', fontSize:10 }}>{i.sku}</div></span>
              <span style={{ fontWeight:700 }}>{i.quantity}</span>
              <span style={{ color:'var(--text-secondary)' }}>{i.reorder_point}</span>
              <span style={{ color:'var(--text-secondary)' }}>{i.warehouse_name}</span>
              <span><span className={'bx '+(low?'r':'g')}>{low?'Low stock':'In stock'}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
