
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function Orders() {
  const { data } = useQuery({ queryKey:['orders'], queryFn:() => api.get('/sales/orders').then(r=>r.data) });
  const statusCls: Record<string,string> = { paid:'g', pending:'a', returned:'r', cancelled:'n' };
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div><div style={{ fontSize:14, fontWeight:600 }}>Orders</div><div style={{ fontSize:11, color:'var(--text-secondary)' }}>All channels · POS · Web · App</div></div>
        <div style={{ display:'flex', gap:5 }}>
          <button className="bt"><i className="ti ti-filter" /> Filter</button>
          <button className="bt"><i className="ti ti-download" /> Export</button>
          <button className="bt bt-p"><i className="ti ti-plus" /> Manual order</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:5, marginBottom:8 }}>
        {['All','POS','Website','App','Amazon','Noon'].map((t,i) => <button key={t} className={'snb'+(i===0?' on':'')}>{t}</button>)}
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tr th" style={{ gridTemplateColumns:'90px 1fr 80px 90px 80px 70px' }}>
          {['Order #','Customer','Channel','Payment','Total','Status'].map(h => <span key={h}>{h}</span>)}
        </div>
        {data?.map((o:any) => (
          <div key={o.id} className="tr" style={{ gridTemplateColumns:'90px 1fr 80px 90px 80px 70px' }}>
            <span style={{ fontWeight:600 }}>#{o.order_number}</span>
            <span>{o.customer_name || 'Walk-in'}</span>
            <span style={{ color:'var(--text-secondary)' }}>POS</span>
            <span style={{ color:'var(--text-secondary)' }}>{o.payment_method || '—'}</span>
            <span style={{ fontWeight:600 }}>SAR {parseFloat(o.total||0).toLocaleString()}</span>
            <span><span className={'bx '+(statusCls[o.status]||'n')}>{o.status}</span></span>
          </div>
        ))}
        {(!data||data.length===0) && <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)' }}>No orders found</div>}
      </div>
    </div>
  );
}
