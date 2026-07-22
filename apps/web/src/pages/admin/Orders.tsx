import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
export default function Orders() {
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data:orders=[], isLoading } = useQuery<any[]>({
    queryKey:['orders'],
    queryFn:()=>api.get('/sales/orders').then(r=>Array.isArray(r.data)?r.data:[])
  });
  const { data:detail } = useQuery<any>({
    queryKey:['order',selectedId],
    queryFn:()=>api.get('/sales/orders/'+selectedId).then(r=>r.data),
    enabled:!!selectedId
  });
  const filtered = orders.filter((o:any)=>{
    if(filter!=='all'&&o.status!==filter) return false;
    if(search){
      const q=search.toLowerCase();
      return (o.order_number||'').toLowerCase().includes(q)||(o.customer_name||'').toLowerCase().includes(q)||(o.cashier_name||'').toLowerCase().includes(q);
    }
    return true;
  });
  const sc:Record<string,string>={paid:'g',pending:'a',refunded:'n',cancelled:'r',confirmed:'a',partial_return:'a'};
  const exportCSV = () => {
    const rows = [['Order#','Date','Customer','Total','Status'],...orders.map((o:any)=>[o.order_number,o.created_at,o.customer_name||'Walk-in',o.total,o.status])];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='orders.csv'; a.click();
  };
  const printOrder = (o:any) => {
    if(!o) return;
    const lines = (o.lines||[]).map((l:any)=>`<tr><td>${l.product_name||'Item'}</td><td>${l.variant_name||''}</td><td>${l.quantity}</td><td>SAR ${parseFloat(l.unit_price||0).toFixed(2)}</td><td>SAR ${(parseFloat(l.unit_price||0)*l.quantity).toFixed(2)}</td></tr>`).join('');
    const w = window.open('','_blank','width=600,height=700');
    if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${o.order_number}</title><style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px}h2{margin:0}table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}.total{font-size:14px;font-weight:bold}.right{text-align:right}
    </style></head><body>
      <h2>NuxFashion — Invoice</h2><p style="color:#666">${o.order_number} · ${new Date(o.created_at).toLocaleString()}</p>
      <p><strong>Customer:</strong> ${o.customer_name||'Walk-in'} &nbsp;&nbsp; <strong>Cashier:</strong> ${o.cashier_name||''}</p>
      <table><thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>
      <div class="right"><div>Subtotal: SAR ${parseFloat(o.subtotal||0).toFixed(2)}</div>
      <div>Discount: SAR ${parseFloat(o.discount_amount||0).toFixed(2)}</div>
      <div>VAT 15%: SAR ${parseFloat(o.tax_amount||0).toFixed(2)}</div>
      <div class="total">TOTAL: SAR ${parseFloat(o.total||0).toFixed(2)}</div></div>
      <p style="margin-top:20px;font-size:10px;color:#999">ZATCA e-invoice · Thank you for shopping at NuxFashion</p>
    </body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };
  return (
    <div style={{ display:'grid', gridTemplateColumns:selectedId?'1fr 340px':'1fr', gap:12 }}>
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div style={{ fontSize:14,fontWeight:700 }}>Orders</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{filtered.length} of {orders.length} orders</div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <div style={{ position:'relative' }}>
              <i className="ti ti-search" style={{ position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'var(--text-secondary)',pointerEvents:'none' }}/>
              <input
                value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search order #, customer…"
                style={{ padding:'6px 10px 6px 28px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)',width:220 }}
              />
              {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14,color:'var(--text-secondary)',padding:0 }}>×</button>}
            </div>
            <button className="bt" onClick={exportCSV}><i className="ti ti-download" /> Export CSV</button>
          </div>
        </div>
        <div className="d-flex gap-2 mb-3">
          {[['all','All'],['paid','Paid'],['pending','Pending'],['refunded','Refunded'],['cancelled','Cancelled']].map(([v,l])=>(
            <button key={v} className={'snb'+(filter===v?' on':'')} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>
        {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div> : (
          <div className="card" style={{ padding:0,overflow:'hidden' }}>
            <div className="tr th" style={{ gridTemplateColumns:'120px 130px 1fr 90px 100px 90px' }}>
              {['Order #','Date','Customer','Cashier','Total','Status'].map(h=><span key={h}>{h}</span>)}
            </div>
            {filtered.map((o:any)=>(
              <div key={o.id} className="tr" style={{ gridTemplateColumns:'120px 130px 1fr 90px 100px 90px',cursor:'pointer',background:selectedId===o.id?'var(--bg-accent)':'' }}
                onClick={()=>setSelectedId(selectedId===o.id?null:o.id)}>
                <span style={{ fontWeight:700,color:'var(--fill-accent)',fontSize:11 }}>#{o.order_number}</span>
                <span style={{ fontSize:11,color:'var(--text-secondary)' }}>
                  {o.created_at?new Date(o.created_at).toLocaleString('en-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
                </span>
                <span style={{ fontWeight:500 }}>{o.customer_name||'Walk-in'}</span>
                <span style={{ fontSize:11,color:'var(--text-secondary)' }}>{o.cashier_name||'—'}</span>
                <span style={{ fontWeight:700 }}>SAR {parseFloat(o.total||0).toFixed(2)}</span>
                <span><span className={'bx '+(sc[o.status]||'n')} style={{ textTransform:'capitalize',fontSize:10 }}>{o.status}</span></span>
              </div>
            ))}
            {filtered.length===0&&<div style={{ padding:32,textAlign:'center',color:'var(--text-secondary)' }}>
              {search?`No orders matching "${search}"`:'No orders found'}
            </div>}
          </div>
        )}
      </div>
      {selectedId && (
        <div className="card" style={{ alignSelf:'start',position:'sticky',top:0,maxHeight:'90vh',overflowY:'auto' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div style={{ fontSize:13,fontWeight:700 }}>#{detail?.order_number||'...'}</div>
            <button onClick={()=>setSelectedId(null)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-secondary)' }}>×</button>
          </div>
          {!detail ? <div className="d-flex justify-content-center py-3"><div className="spinner-border spinner-border-sm"/></div> : (<>
            {(()=>{
              const days=Math.floor((Date.now()-new Date(detail.created_at).getTime())/(86400000));
              const canReturn=days<=7;
              return <div style={{ fontSize:11,padding:'5px 8px',borderRadius:4,marginBottom:8,background:canReturn?'#f0faf0':'#fff5f5',color:canReturn?'#27ae60':'#e74c3c' }}>
                {canReturn?<><i className="ti ti-refresh" /> Return eligible · {7-days} day{7-days!==1?'s':''} left</>:<><i className="ti ti-lock" /> Return period expired ({days} days ago)</>}
              </div>;
            })()}
            <span className={'bx '+(sc[detail.status]||'n')} style={{ marginBottom:10,display:'inline-block',textTransform:'capitalize' }}>{detail.status}</span>
            <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:10 }}>
              {new Date(detail.created_at).toLocaleString()} · {detail.cashier_name}
            </div>
            {(()=>{
              const retQty:Record<string,number>={};
              (detail.returns||[]).forEach((r:any)=>{
                (r.lines||[]).forEach((rl:any)=>{ if(rl.order_line_id) retQty[rl.order_line_id]=(retQty[rl.order_line_id]||0)+rl.quantity; });
              });
              const hasReturns=(detail.returns||[]).length>0;
              return (<>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:6 }}>ITEMS</div>
                {(detail.lines||[]).map((l:any)=>{
                  const returned=retQty[l.id]||0;
                  const remaining=l.quantity-returned;
                  const up=parseFloat(l.unit_price||0);
                  return (
                    <div key={l.id} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid var(--border)',fontSize:12 }}>
                      <div>
                        <div style={{ fontWeight:500 }}>{l.product_name||'Item'}</div>
                        <div style={{ fontSize:10,color:'var(--text-secondary)' }}>
                          {l.variant_name&&l.variant_name!=='Default'?l.variant_name+' · ':''}{l.sku?`SKU-${l.sku} · `:''}
                          ×{l.quantity} @ SAR {up.toFixed(2)}
                        </div>
                        {returned>0&&<div style={{ fontSize:10,marginTop:2 }}>
                          <span style={{ color:'#e74c3c' }}>Returned ×{returned} (SAR {(up*returned).toFixed(2)})</span>
                          {remaining>0&&<span style={{ color:'#27ae60' }}> · Remaining ×{remaining}</span>}
                        </div>}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        {returned>0&&<div style={{ fontSize:10,color:'#e74c3c',textDecoration:'line-through' }}>SAR {(up*l.quantity).toFixed(2)}</div>}
                        <div style={{ fontWeight:600,color:returned>0?'#27ae60':'' }}>SAR {(up*(remaining>0?remaining:l.quantity)).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
                {hasReturns&&(
                  <div style={{ marginTop:10,marginBottom:4 }}>
                    <div style={{ fontSize:11,fontWeight:600,color:'#e74c3c',marginBottom:6 }}>RETURNS</div>
                    {(detail.returns||[]).map((r:any)=>(
                      <div key={r.id} style={{ background:'#fff5f5',borderRadius:6,padding:'8px 10px',marginBottom:6,fontSize:11 }}>
                        <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                          <span style={{ fontWeight:600 }}>#{r.return_number}</span>
                          <span style={{ color:'#e74c3c',fontWeight:600 }}>−SAR {parseFloat(r.refund_amount||0).toFixed(2)}</span>
                        </div>
                        <div style={{ color:'var(--text-secondary)' }}>Via {(r.refund_method||'').replace('_',' ')} {r.reason?`· ${r.reason}`:''}</div>
                        {(r.lines||[]).filter((rl:any)=>rl.quantity).map((rl:any,i:number)=>(
                          <div key={i} style={{ color:'#e74c3c',marginTop:2 }}>× {rl.quantity} returned · SAR {parseFloat(rl.refund_amount||0).toFixed(2)}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>);
            })()}
            <div style={{ marginTop:10 }}>
              {(()=>{
                const totalReturned=(detail.returns||[]).reduce((s:number,r:any)=>s+parseFloat(r.refund_amount||0),0);
                const netTotal=parseFloat(detail.total||0)-totalReturned;
                const vatAmt=parseFloat(detail.tax_amount||0)||parseFloat(detail.total||0)*15/115;
                const discAmt=parseFloat(detail.discount_amount||0);
                const rows=[['Customer',detail.customer_name||'Walk-in'],['Subtotal','SAR '+parseFloat(detail.subtotal||0).toFixed(2)],...(discAmt>0?[['Discount','−SAR '+discAmt.toFixed(2)]]:[ ]),['VAT 15%','SAR '+vatAmt.toFixed(2)],['Original total','SAR '+parseFloat(detail.total||0).toFixed(2)],...(totalReturned>0?[['Returned','−SAR '+totalReturned.toFixed(2)],['NET TOTAL','SAR '+netTotal.toFixed(2)]]:[ ['TOTAL','SAR '+parseFloat(detail.total||0).toFixed(2)] ])];
                return rows;
              })().map(([l,v],i)=>(
                <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid var(--border)',fontSize:12,fontWeight:i===4?700:400 }}>
                  <span style={{ color:'var(--text-secondary)' }}>{l}</span>
                  <span style={{ color:i===4?'var(--fill-accent)':'' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="bt" style={{ flex:1,justifyContent:'center' }} onClick={()=>printOrder(detail)}>
                <i className="ti ti-printer" /> Print
              </button>
            </div>
          </>)}
        </div>
      )}
    </div>
  );
}
