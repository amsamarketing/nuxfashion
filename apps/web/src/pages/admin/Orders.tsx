
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function Orders() {
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const { data:orders=[], isLoading } = useQuery({ queryKey:['orders'], queryFn:()=>api.get('/sales/orders').then(r=>r.data) });

  const filtered = filter==='all' ? orders : orders.filter((o:any)=>o.status===filter);
  const sc:Record<string,string>={paid:'g',pending:'a',returned:'r',cancelled:'r'};

  return (
    <div style={{ display:'grid', gridTemplateColumns: selected?'1fr 320px':'1fr', gap:12 }}>
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>Orders</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{orders.length} total orders</div>
          </div>
          <div className="d-flex gap-2">
            <button className="bt"><i className="ti ti-download" /> Export</button>
          </div>
        </div>
        <div className="d-flex gap-2 mb-3">
          {[['all','All'],['paid','Paid'],['pending','Pending'],['returned','Returned'],['cancelled','Cancelled']].map(([v,l])=>(
            <button key={v} className={'snb'+(filter===v?' on':'')} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>
        {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div> : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div className="tr th" style={{ gridTemplateColumns:'90px 140px 1fr 90px 100px 80px' }}>
              {['Order #','Date','Customer','Payment','Total','Status'].map(h=><span key={h}>{h}</span>)}
            </div>
            {filtered.map((o:any)=>(
              <div key={o.id} className="tr" style={{ gridTemplateColumns:'90px 140px 1fr 90px 100px 80px', cursor:'pointer', background:selected?.id===o.id?'var(--bg-accent)':'' }}
                onClick={()=>setSelected(selected?.id===o.id?null:o)}>
                <span style={{ fontWeight:700, color:'var(--fill-accent)' }}>#{o.order_number}</span>
                <span style={{ fontSize:11, color:'var(--text-secondary)' }}>
                  {o.created_at ? new Date(o.created_at).toLocaleString('en-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                </span>
                <span>
                  <div style={{ fontWeight:500 }}>{o.customer_name||'Walk-in'}</div>
                </span>
                <span style={{ fontSize:11, color:'var(--text-secondary)', textTransform:'capitalize' }}>
                  {(o.payment_method||'—').replace(/_/g,' ')}
                </span>
                <span>
                  <div style={{ fontWeight:700 }}>SAR {parseFloat(o.total||0).toFixed(2)}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted-custom)' }}>VAT: SAR {parseFloat(o.tax_amount||0).toFixed(2)}</div>
                </span>
                <span><span className={'bx '+(sc[o.status]||'n')}>{o.status}</span></span>
              </div>
            ))}
            {filtered.length===0 && (
              <div style={{ padding:32, textAlign:'center', color:'var(--text-muted-custom)' }}>No orders found</div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="card" style={{ alignSelf:'start', position:'sticky', top:0 }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div style={{ fontSize:13, fontWeight:700 }}>Order #{selected.order_number}</div>
            <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--text-secondary)' }}>×</button>
          </div>
          <span className={'bx '+(sc[selected.status]||'n')} style={{ marginBottom:12, display:'inline-block', textTransform:'capitalize' }}>{selected.status}</span>

          {[['Customer',selected.customer_name||'Walk-in'],['Date',selected.created_at?new Date(selected.created_at).toLocaleString():'—'],['Payment',(selected.payment_method||'—').replace(/_/g,' ')],['Subtotal','SAR '+parseFloat(selected.subtotal||0).toFixed(2)],['Discount','SAR '+parseFloat(selected.discount_amount||0).toFixed(2)],['VAT 15%','SAR '+parseFloat(selected.tax_amount||0).toFixed(2)],['TOTAL','SAR '+parseFloat(selected.total||0).toFixed(2)]].map(([l,v],i)=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-color)', fontSize:12, fontWeight:i===6?700:400, color:i===6?'var(--fill-accent)':'var(--text-primary)' }}>
              <span style={{ color:i===6?'var(--fill-accent)':'var(--text-secondary)' }}>{l}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="d-flex gap-2 mt-3">
            <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-printer" /> Print</button>
            <button className="bt bt-d" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-arrow-back" /> Return</button>
          </div>
        </div>
      )}
    </div>
  );
}
