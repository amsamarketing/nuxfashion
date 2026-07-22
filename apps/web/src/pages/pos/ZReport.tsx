import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function ZReport() {
  const { data:orders=[], isLoading } = useQuery<any[]>({
    queryKey:['orders-today'],
    queryFn:()=>api.get('/sales/orders').then(r=>Array.isArray(r.data)?r.data:[])
  });

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o:any)=>new Date(o.created_at).toDateString()===today);
  const paidOrders = todayOrders.filter((o:any)=>['paid','partial_return'].includes(o.status));
  const returnedOrders = todayOrders.filter((o:any)=>['refunded','partial_return'].includes(o.status));

  const totalSales = paidOrders.reduce((s:number,o:any)=>s+parseFloat(o.total||0),0);
  const totalReturns = returnedOrders.length;
  const avgBasket = paidOrders.length>0 ? totalSales/paidOrders.length : 0;
  const totalVAT = paidOrders.reduce((s:number,o:any)=>s+parseFloat(o.tax_amount||0)||(parseFloat(o.total||0)*15/115),0);

  const printReport = () => {
    const w = window.open('','_blank','width=500,height=700');
    if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Z-Report</title><style>
      body{font-family:monospace;font-size:12px;padding:20px}h2{text-align:center}
      .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ccc}
      .total{font-weight:bold;font-size:14px}
    </style></head><body>
      <h2>Z-Report — NuxFashion</h2>
      <div style="text-align:center;margin-bottom:12px">${new Date().toLocaleString()}</div>
      <div class="row"><span>Total sales</span><span>SAR ${totalSales.toFixed(2)}</span></div>
      <div class="row"><span>Transactions</span><span>${paidOrders.length}</span></div>
      <div class="row"><span>Avg basket</span><span>SAR ${avgBasket.toFixed(2)}</span></div>
      <div class="row"><span>Returns</span><span>${totalReturns}</span></div>
      <div class="row"><span>VAT collected</span><span>SAR ${totalVAT.toFixed(2)}</span></div>
      <div class="row total"><span>NET TOTAL</span><span>SAR ${totalSales.toFixed(2)}</span></div>
    </body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  if(isLoading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div>;

  const stats=[
    ['Total sales','SAR '+totalSales.toFixed(2)],
    ['Transactions',String(paidOrders.length)],
    ['Avg basket','SAR '+avgBasket.toFixed(2)],
    ['Returns',String(totalReturns)],
    ['VAT collected','SAR '+totalVAT.toFixed(2)],
    ['All orders today',String(todayOrders.length)],
  ];

  return (
    <div style={{ padding:14 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:600 }}>Z-report — End of shift</div>
          <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{new Date().toLocaleDateString('en-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
        <div style={{ display:'flex',gap:5 }}>
          <button className="bt" onClick={printReport}><i className="ti ti-printer" /> Print</button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:12 }}>
        {stats.map(([l,v])=>(
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:16,fontWeight:700,color:'var(--fill-accent)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontSize:12,fontWeight:600,marginBottom:8 }}>Today's orders</div>
        {todayOrders.length===0&&<div style={{ fontSize:12,color:'var(--text-secondary)',padding:'12px 0',textAlign:'center' }}>No orders today yet</div>}
        {todayOrders.slice(0,15).map((o:any)=>(
          <div key={o.id} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid var(--border)',fontSize:12 }}>
            <div>
              <span style={{ fontWeight:600,color:'var(--fill-accent)' }}>#{o.order_number}</span>
              <span style={{ color:'var(--text-secondary)',marginLeft:8,fontSize:11 }}>{new Date(o.created_at).toLocaleTimeString()}</span>
            </div>
            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
              <span style={{ fontWeight:600 }}>SAR {parseFloat(o.total||0).toFixed(2)}</span>
              <span className={'bx '+(o.status==='paid'?'g':o.status==='refunded'?'r':'n')} style={{ fontSize:10,textTransform:'capitalize' }}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
