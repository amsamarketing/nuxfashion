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
  const [selected, setSelected] = useState<Record<string,boolean>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [done, setDone] = useState<any>(null);

  const { data: orders=[], isLoading } = useQuery<any[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/sales/orders').then(r => Array.isArray(r.data) ? r.data : []),
  });

  const handleSearch = () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const found = orders.find((o:any) =>
      (o.order_number||'').toLowerCase().includes(q) ||
      (o.customer_name||'').toLowerCase().includes(q)
    );
    if (found) {
      setOrder(found);
      const init: Record<string,boolean> = {};
      (found.lines||[]).forEach((l:any) => { init[l.id] = false; });
      setSelected(init);
    } else {
      toast('Order not found', 'error');
    }
  };

  const returnMut = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('No order selected');
      const lines = (order.lines||[])
        .filter((l:any) => selected[l.id])
        .map((l:any) => ({
          order_line_id: l.id,
          variant_id: l.variant_id,
          quantity: l.quantity,
          refund_amount: parseFloat(l.unit_price) * l.quantity,
          restock: true,
        }));
      if (!lines.length) throw new Error('Select at least one item to return');
      const res = await api.post('/sales/returns', {
        original_order_id: order.id,
        refund_method: refundMethod,
        lines,
        reason: reason || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => { setDone(data); qc.invalidateQueries({ queryKey:['orders'] }); },
    onError: (e:any) => toast(getErr(e), 'error'),
  });

  const selectedLines = order ? (order.lines||[]).filter((l:any) => selected[l.id]) : [];
  const returnTotal = selectedLines.reduce((s:number,l:any) => s + parseFloat(l.unit_price||0)*l.quantity, 0);

  if (done) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12 }}>
      <div style={{ fontSize:52 }}>✅</div>
      <div style={{ fontSize:20,fontWeight:800 }}>Return Processed</div>
      <div style={{ fontSize:13,color:'var(--text-secondary)' }}>Return #{done.return_number}</div>
      <div style={{ fontSize:28,fontWeight:700,color:'var(--fill-accent)' }}>SAR {parseFloat(done.total_refund||returnTotal).toFixed(2)}</div>
      <div style={{ fontSize:12,color:'var(--text-secondary)' }}>Refund via {refundMethod.replace('_',' ')}</div>
      <button className="bt bt-p" onClick={()=>{ setDone(null);setOrder(null);setSearch('');setSelected({}); }}>+ New return</button>
    </div>
  );

  return (
    <div style={{ padding:14 }}>
      <div style={{ fontSize:14,fontWeight:600,marginBottom:12 }}>Process return / exchange</div>

      {/* Search */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:12 }}>
        <input
          className="form-control form-control-sm"
          placeholder="Search by order # or customer name..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleSearch()}
          style={{ fontSize:13 }}
        />
        <button className="bt bt-p" onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Search'}
        </button>
      </div>

      {!order && (
        <div style={{ textAlign:'center',padding:40,color:'var(--text-secondary)',fontSize:13 }}>
          <i className="ti ti-search" style={{ fontSize:32,display:'block',marginBottom:8 }} />
          Search for an order to process a return
        </div>
      )}

      {order && (
        <>
          {/* Order header */}
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:600 }}>Order #{order.order_number} {order.customer_name ? `— ${order.customer_name}` : ''}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>
                  {new Date(order.created_at).toLocaleDateString()} · SAR {parseFloat(order.total||0).toFixed(2)}
                </div>
              </div>
              <span className="bx g">Eligible for return</span>
            </div>
            {(order.lines||[]).map((l:any) => (
              <div key={l.id} className="fl" style={{ padding:'8px 0',borderTop:'0.5px solid var(--border)' }}>
                <input type="checkbox" checked={!!selected[l.id]} onChange={e=>setSelected(s=>({...s,[l.id]:e.target.checked}))} />
                <div style={{ flex:1,marginLeft:8 }}>
                  <div style={{ fontWeight:500,fontSize:13 }}>{l.product_name||l.variant_name||'Item'}</div>
                  <div style={{ color:'var(--text-secondary)',fontSize:11 }}>
                    {l.variant_name} {l.sku ? `· SKU-${l.sku}` : ''} · Qty: {l.quantity}
                  </div>
                </div>
                <span style={{ fontWeight:600,fontSize:13 }}>SAR {(parseFloat(l.unit_price||0)*l.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Reason + Refund method */}
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

          {/* Footer */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--surface-1)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)' }}>
            <div>
              <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Return total ({selectedLines.length} selected items)</div>
              <div style={{ fontSize:17,fontWeight:700 }}>SAR {returnTotal.toFixed(2)}</div>
            </div>
            <div style={{ display:'flex',gap:6 }}>
              <button className="bt" onClick={()=>{ setOrder(null);setSearch('');setSelected({}); }}>Cancel</button>
              <button className="bt bt-p" onClick={()=>returnMut.mutate()} disabled={returnMut.isPending||selectedLines.length===0}>
                {returnMut.isPending ? 'Processing…' : <><i className="ti ti-check" /> Process return</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
