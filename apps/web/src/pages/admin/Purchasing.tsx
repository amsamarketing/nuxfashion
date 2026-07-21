
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import StatRow from '../../components/StatRow';

export default function Purchasing() {
  const { data } = useQuery({ queryKey:['pos'], queryFn:() => api.get('/purchasing/orders').then(r=>r.data) });
  const { data: suppliers } = useQuery({ queryKey:['suppliers'], queryFn:() => api.get('/purchasing/suppliers').then(r=>r.data) });
  const statusCls: Record<string,string> = { draft:'n', approved:'b', sent:'a', received:'g', partially_received:'a', cancelled:'r' };
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div><div style={{ fontSize:14, fontWeight:600 }}>Purchasing</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{data?.length||0} purchase orders</div></div>
        <div style={{ display:'flex', gap:5 }}>
          <button className="bt"><i className="ti ti-users" /> Suppliers</button>
          <button className="bt bt-p"><i className="ti ti-plus" /> New PO</button>
        </div>
      </div>
      <StatRow stats={[
        { label:'Total POs', value:data?.length||0 },
        { label:'Suppliers', value:suppliers?.length||0 },
        { label:'Total Value', value:'SAR '+((data||[]).reduce((s:number,p:any)=>s+parseFloat(p.total||0),0)).toLocaleString() },
      ]} />
      <div style={{ display:'flex', gap:5, marginBottom:8 }}>
        {['All POs','Pending approval','Ordered','Partially received','Completed'].map((t,i) => <button key={t} className={'snb'+(i===0?' on':'')}>{t}</button>)}
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tr th" style={{ gridTemplateColumns:'90px 1fr 100px 100px 70px' }}>
          {['PO #','Supplier','Date','Total','Status'].map(h=><span key={h}>{h}</span>)}
        </div>
        {data?.map((po:any) => (
          <div key={po.id} className="tr" style={{ gridTemplateColumns:'90px 1fr 100px 100px 70px' }}>
            <span style={{ fontWeight:600 }}>{po.po_number}</span>
            <span>{po.supplier_name}</span>
            <span style={{ color:'var(--text-secondary)' }}>{po.order_date?.slice(0,10)}</span>
            <span style={{ fontWeight:600 }}>SAR {parseFloat(po.total||0).toLocaleString()}</span>
            <span><span className={'bx '+(statusCls[po.status]||'n')}>{po.status}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
