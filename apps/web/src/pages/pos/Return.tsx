import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

const REASONS = ['Wrong size / fit','Defective / damaged','Changed mind','Wrong item received','Other'];
const REFUND_METHODS = [
  { value:'cash', label:'Cash', desc:'Immediate' },
  { value:'card', label:'Original card', desc:'~3–5 business days' },
  { value:'store_credit', label:'Store credit', desc:'Instant' },
];

export default function POSReturn() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [qtys, setQtys] = useState<Record<string,number>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [done, setDone] = useState<any>(null);

  const { data: orders=[], isLoading } = useQuery<any[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/sales/orders').then(r => Array.isArray(r.data) ? r.data : []),
  });

  const handleSearch = async () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    // Search by order number, customer name, or SKU/barcode
    let found = orders.find((o:any) =>
      (o.order_number||'').toLowerCase().includes(q) ||
      (o.customer_name||'').toLowerCase().includes(q)
    );
    // If not found by order number, search by barcode/SKU — fetch each order
    if (!found && q.length > 3) {
      toast('Searching by SKU/barcode…', 'info');
      for (const o of orders.slice(0,20)) {
        try {
          const res = await api.get('/sales/orders/'+o.id);
          const full = res.data;
          const hasSku = (full.lines||[]).some((l:any) =>
            (l.sku||'').toLowerCase().includes(q) ||
            (l.barcode||'').toLowerCase().includes(q) ||
            (l.variant_name||'').toLowerCase().includes(q) ||
            (l.product_name||'').toLowerCase().includes(q)
          );
          if (hasSku) { found = o; break; }
        } catch { continue; }
      }
    }
    if (!found) { toast('Order not found', 'error'); return; }
    try {
      const res = await api.get('/sales/orders/'+found.id);
      const full = res.data;
      setOrder(full);
      const init: Record<string,number> = {};
      (full.lines||[]).forEach((l:any) => { init[l.id] = 0; });
      setQtys(init);
    } catch(e:any) { toast(getErr(e),'error'); }
  };

  const returnMut = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('No order selected');
      const lines = (order.lines||[])
        .filter((l:any) => (qtys[l.id]||0) > 0)
        .map((l:any) => ({
          order_line_id: l.id,
          variant_id: l.variant_id,
          quantity: qtys[l.id],
          refund_amount: parseFloat(l.unit_price) * qtys[l.id],
          restock: true,
        }));
      if (!lines.length) throw new Error('Set qty > 0 for at least one item');
      const res = await api.post('/sales/returns', {
        original_order_id: order.id,
        refund_method: refundMethod,
        lines,
        reason: reason || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => { setDone(data); qc.invalidateQueries({ queryKey:['orders'] }); },
    onError: (e:any) => toast(getErr(e),'error'),
  });

  const selectedLines = (order?.lines||[]).filter((l:any) => (qtys[l.id]||0) > 0);
  const returnTotal = selectedLines.reduce((s:number,l:any) => s + parseFloat(l.unit_price||0)*(qtys[l.id]||0), 0);

  if (done) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,padding:40 }}>
      <div style={{ fontSize:52 }}>✅</div>
      <div style={{ fontSize:20,fontWeight:800 }}>Return Processed</div>
      <div style={{ fontSize:13,color:'var(--text-secondary)' }}>Return #{done.return_number}</div>
      <div style={{ fontSize:28,fontWeight:700,color:'var(--fill-accent)' }}>SAR {parseFloat(done.refund_amount||returnTotal).toFixed(2)}</div>
      <div style={{ fontSize:12,color:'var(--text-secondary)' }}>Refund via {refundMethod.replace('_',' ')}</div>
      <button className="bt bt-p" onClick={()=>{ setDone(null);setOrder(null);setSearch('');setQtys({}); }}>+ New return</button>
    </div>
  );

  return (
    <div style={{ padding:14 }}>
      <div style={{ fontSize:14,fontWeight:600,marginBottom:12 }}>Process return / exchange</div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:12 }}>
        <input
          className="form-control form-control-sm"
          placeholder="Search by order #, customer name, SKU or barcode…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleSearch()}
          style={{ fontSize:13 }}
        />
        <button className="bt bt-p" onClick={handleSearch} disabled={isLoading}>
          {isLoading?'Loading…':'Search'}
        </button>
      </div>

      {!order && (
        <div style={{ textAlign:'center',padding:40,color:'var(--text-secondary)',fontSize:13 }}>
          <i className="ti ti-search" style={{ fontSize:32,display:'block',marginBottom:8 }} />
          Search by order #, customer name, SKU or barcode
        </div>
      )}

      {order && (
        <>
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:600 }}>Order #{order.order_number}{order.customer_name?` — ${order.customer_name}`:''}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>
                  {new Date(order.created_at).toLocaleDateString()} · SAR {parseFloat(order.total||0).toFixed(2)} · {order.cashier_name}
                </div>
              </div>
              <span className="bx g">Eligible for return</span>
            </div>

            {/* Header row */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 80px 100px 100px',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:10,fontWeight:600,color:'var(--text-secondary)' }}>
              <span>PRODUCT</span><span style={{ textAlign:'center' }}>ORDERED</span><span style={{ textAlign:'center' }}>RETURN QTY</span><span style={{ textAlign:'right' }}>AMOUNT</span>
            </div>

            {(order.lines||[]).map((l:any) => {
              const qty = qtys[l.id]||0;
              const maxQty = l.quantity;
              const lineAmt = parseFloat(l.unit_price||0)*qty;
              return (
                <div key={l.id} style={{ display:'grid',gridTemplateColumns:'1fr 80px 100px 100px',gap:8,padding:'10px 0',borderBottom:'0.5px solid var(--border)',alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:500,fontSize:13 }}>{l.product_name||'Item'}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)' }}>
                      {l.variant_name&&l.variant_name!=='Default'?l.variant_name+' · ':''}{l.sku?`SKU-${l.sku}`:''} · SAR {parseFloat(l.unit_price||0).toFixed(2)} each
                    </div>
                  </div>
                  <div style={{ textAlign:'center',fontSize:13,color:'var(--text-secondary)' }}>×{maxQty}</div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}>
                    <button className="bt" style={{ padding:'2px 8px',fontSize:14,lineHeight:1 }}
                      onClick={()=>setQtys(q=>({...q,[l.id]:Math.max(0,(q[l.id]||0)-1)}))} disabled={qty===0}>−</button>
                    <span style={{ minWidth:20,textAlign:'center',fontWeight:600 }}>{qty}</span>
                    <button className="bt" style={{ padding:'2px 8px',fontSize:14,lineHeight:1 }}
                      onClick={()=>setQtys(q=>({...q,[l.id]:Math.min(maxQty,(q[l.id]||0)+1)}))} disabled={qty>=maxQty}>+</button>
                  </div>
                  <div style={{ textAlign:'right',fontWeight:600,fontSize:13,color:qty>0?'var(--fill-accent)':'var(--text-secondary)' }}>
                    {qty>0?`SAR ${lineAmt.toFixed(2)}`:'-'}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
            <div className="card">
              <div style={{ fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:8 }}>RETURN REASON</div>
              {REASONS.map(r=>(
                <label key={r} style={{ display:'flex',alignItems:'center',gap:7,padding:'4px 0',cursor:'pointer',fontSize:12 }}>
                  <input type="radio" name="reason" checked={reason===r} onChange={()=>setReason(r)} />{r}
                </label>
              ))}
            </div>
            <div className="card">
              <div style={{ fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:8 }}>REFUND METHOD</div>
              {REFUND_METHODS.map(m=>(
                <label key={m.value} style={{ display:'flex',alignItems:'flex-start',gap:7,padding:'5px 0',cursor:'pointer' }}>
                  <input type="radio" name="refund" checked={refundMethod===m.value} onChange={()=>setRefundMethod(m.value)} style={{ marginTop:2 }} />
                  <div><div style={{ fontWeight:500,fontSize:12 }}>{m.label}</div><div style={{ fontSize:10,color:'var(--text-secondary)' }}>{m.desc}</div></div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--surface-1)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)' }}>
            <div>
              <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Return total ({selectedLines.length} item{selectedLines.length!==1?'s':''})</div>
              <div style={{ fontSize:17,fontWeight:700 }}>SAR {returnTotal.toFixed(2)}</div>
            </div>
            <div style={{ display:'flex',gap:6 }}>
              <button className="bt" onClick={()=>{ setOrder(null);setSearch('');setQtys({}); }}>Cancel</button>
              <button className="bt bt-p" onClick={()=>returnMut.mutate()} disabled={returnMut.isPending||selectedLines.length===0}>
                {returnMut.isPending?'Processing…':<><i className="ti ti-check" /> Process return</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
