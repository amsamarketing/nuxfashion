
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';

export default function Inventory() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [adjItem, setAdjItem] = useState<any>(null);
  const [adjForm, setAdjForm] = useState({ quantity:'', type:'add', reason:'' });

  const { data:inv=[], isLoading } = useQuery({ queryKey:['inventory'], queryFn:()=>api.get('/inventory').then(r=>r.data) });
  const { data:warehouses=[] } = useQuery({ queryKey:['warehouses'], queryFn:()=>api.get('/inventory/warehouses').then(r=>r.data).catch(()=>[]) });

  const filtered = inv.filter((i:any)=> {
    if (filter==='low') return i.quantity<=i.reorder_point;
    if (filter==='out') return i.quantity<=0;
    return true;
  });

  const adjMut = useMutation({
    mutationFn: () => {
      const qty = parseFloat(adjForm.quantity);
      const newQty = adjForm.type==='set' ? qty : adjForm.type==='add' ? adjItem.quantity+qty : Math.max(0, adjItem.quantity-qty);
      return api.patch(\`/inventory/\${adjItem.id}\`, { quantity: newQty, reason: adjForm.reason });
    },
    onSuccess: () => {
      toast('Stock adjusted successfully!', 'success');
      qc.invalidateQueries({ queryKey:['inventory'] });
      setAdjItem(null);
      setAdjForm({ quantity:'', type:'add', reason:'' });
    },
    onError: e => toast(getErr(e), 'error')
  });

  const sa=(k:string,v:string)=>setAdjForm(p=>({...p,[k]:v}));

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>Inventory</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{inv.length} SKUs · {warehouses.length} locations</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt"><i className="ti ti-arrows-exchange" /> Transfer stock</button>
          <button className="bt"><i className="ti ti-download" /> Export</button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        {[['all','All items'],['low','Low stock'],['out','Out of stock']].map(([v,l])=>(
          <button key={v} className={'snb'+(filter===v?' on':'')} onClick={()=>setFilter(v)}>{l}
            {v==='low'&&<span className="bx r ms-1" style={{ fontSize:9 }}>{inv.filter((i:any)=>i.quantity<=i.reorder_point).length}</span>}
          </button>
        ))}
      </div>

      {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div> : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="tr th" style={{ gridTemplateColumns:'1fr 80px 80px 120px 80px 100px' }}>
            {['Product / SKU','In stock','Reorder at','Location','Status','Action'].map(h=><span key={h}>{h}</span>)}
          </div>
          {filtered.map((i:any) => {
            const low = i.quantity <= i.reorder_point;
            const out = i.quantity <= 0;
            return (
              <div key={i.id} className="tr" style={{ gridTemplateColumns:'1fr 80px 80px 120px 80px 100px', background:out?'#fff1f2':low?'#fffbeb':'' }}>
                <span><div style={{ fontWeight:600 }}>{i.product_name}</div><div style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{i.sku}</div></span>
                <span style={{ fontWeight:800, fontSize:15, color:out?'var(--text-danger-custom)':low?'var(--text-warning-custom)':'var(--text-primary)' }}>{i.quantity}</span>
                <span style={{ color:'var(--text-secondary)' }}>{i.reorder_point}</span>
                <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{i.warehouse_name||'Main warehouse'}</span>
                <span><span className={'bx '+(out?'r':low?'a':'g')}>{out?'Out':'In stock'}</span></span>
                <span><button className="bt" style={{ fontSize:10 }} onClick={()=>{ setAdjItem(i); setAdjForm({ quantity:'', type:'add', reason:'' }); }}>
                  <i className="ti ti-adjustments" /> Adjust
                </button></span>
              </div>
            );
          })}
          {filtered.length===0 && <div style={{ padding:32, textAlign:'center', color:'var(--text-muted-custom)' }}>No inventory records found</div>}
        </div>
      )}

      {adjItem && (
        <Modal title={\`Adjust stock — \${adjItem.product_name}\`} onClose={()=>setAdjItem(null)}>
          <div style={{ padding:'10px 12px', background:'var(--surface-1)', borderRadius:'var(--radius)', marginBottom:16, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Current stock</span>
            <span style={{ fontSize:18, fontWeight:800 }}>{adjItem.quantity} units</span>
          </div>
          <Field label="Adjustment type" required>
            <Sel value={adjForm.type} onChange={v=>sa('type',v)}>
              <option value="add">Add stock (receive goods)</option>
              <option value="remove">Remove stock (damage / loss)</option>
              <option value="set">Set to exact quantity</option>
            </Sel>
          </Field>
          <Field label="Quantity *" required>
            <Inp type="number" value={adjForm.quantity} onChange={v=>sa('quantity',v)} placeholder="Enter quantity" />
          </Field>
          {adjForm.quantity && (
            <div style={{ padding:'10px 12px', background:'var(--bg-accent)', borderRadius:'var(--radius)', marginBottom:14, fontSize:12, color:'var(--text-accent)' }}>
              New quantity will be: <strong>
                {adjForm.type==='set' ? adjForm.quantity :
                 adjForm.type==='add' ? adjItem.quantity+parseFloat(adjForm.quantity||'0') :
                 Math.max(0, adjItem.quantity-parseFloat(adjForm.quantity||'0'))} units
              </strong>
            </div>
          )}
          <Field label="Reason / notes">
            <Inp value={adjForm.reason} onChange={v=>sa('reason',v)} placeholder="e.g. Received from supplier, damaged items" />
          </Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setAdjItem(null)}>Cancel</button>
            <SaveBtn label="Apply adjustment" loading={adjMut.isPending} disabled={!adjForm.quantity} onClick={()=>adjMut.mutate()} />
          </div>
        </Modal>
      )}
    </div>
  );
}
