
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';
import StatRow from '../../components/StatRow';

const EMPTY_PO = { supplier_id:'', expected_delivery_date:'', notes:'' };
const EMPTY_SUP = { name:'', email:'', phone:'', contact_person:'', city:'Riyadh', vat_number:'', payment_terms:'30' };

export default function Purchasing() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showPO, setShowPO] = useState(false);
  const [showSup, setShowSup] = useState(false);
  const [po, setPo] = useState({...EMPTY_PO});
  const [sup, setSup] = useState({...EMPTY_SUP});

  const { data:orders=[] } = useQuery({ queryKey:['po-orders'], queryFn:()=>api.get('/purchasing/orders').then(r=>r.data) });
  const { data:suppliers=[] } = useQuery({ queryKey:['suppliers'], queryFn:()=>api.get('/purchasing/suppliers').then(r=>r.data) });

  const createPO = useMutation({
    mutationFn: ()=>api.post('/purchasing/orders', {
      supplier_id: po.supplier_id,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: po.expected_delivery_date || undefined,
      notes: po.notes || undefined,
      status: 'draft',
      subtotal: 0, tax_amount: 0, total: 0
    }),
    onSuccess: d => {
      toast('Purchase order '+d.data.po_number+' created!', 'success');
      qc.invalidateQueries({ queryKey:['po-orders'] });
      setShowPO(false); setPo({...EMPTY_PO});
    },
    onError: e => toast(getErr(e), 'error')
  });

  const createSup = useMutation({
    mutationFn: ()=>api.post('/purchasing/suppliers', {
      name: sup.name,
      email: sup.email || undefined,
      phone: sup.phone || undefined,
      contact_person: sup.contact_person || undefined,
      city: sup.city || undefined,
      vat_number: sup.vat_number || undefined,
      payment_terms: parseInt(sup.payment_terms)||30,
    }),
    onSuccess: () => {
      toast('Supplier added!', 'success');
      qc.invalidateQueries({ queryKey:['suppliers'] });
      setShowSup(false); setSup({...EMPTY_SUP});
    },
    onError: e => toast(getErr(e), 'error')
  });

  const sc:Record<string,string>={draft:'n',approved:'b',sent:'a',received:'g',partially_received:'a',cancelled:'r'};
  const sp=(k:string,v:string)=>setPo(p=>({...p,[k]:v}));
  const ss=(k:string,v:string)=>setSup(p=>({...p,[k]:v}));
  const totalVal = orders.reduce((s:number,p:any)=>s+parseFloat(p.total||0),0);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>Purchasing</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{orders.length} POs · {suppliers.length} suppliers</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt" onClick={()=>setShowSup(true)}><i className="ti ti-plus" /> Add supplier</button>
          <button className="bt bt-p" onClick={()=>setShowPO(true)}><i className="ti ti-plus" /> New purchase order</button>
        </div>
      </div>

      <StatRow stats={[{label:'Total POs',value:orders.length},{label:'Suppliers',value:suppliers.length},{label:'Total PO value',value:'SAR '+totalVal.toLocaleString(undefined,{maximumFractionDigits:0})}]} />

      <div className="card mb-3" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', fontWeight:700, fontSize:12, borderBottom:'1px solid var(--border-color)' }}>Purchase orders</div>
        <div className="tr th" style={{ gridTemplateColumns:'100px 1fr 110px 110px 100px 90px' }}>
          {['PO #','Supplier','Order date','Expected','Total','Status'].map(h=><span key={h}>{h}</span>)}
        </div>
        {orders.map((o:any)=>(
          <div key={o.id} className="tr" style={{ gridTemplateColumns:'100px 1fr 110px 110px 100px 90px' }}>
            <span style={{ fontWeight:700, color:'var(--fill-accent)' }}>{o.po_number}</span>
            <span style={{ fontWeight:500 }}>{o.supplier_name}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{o.order_date?.slice(0,10)}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{o.expected_delivery_date?.slice(0,10)||'—'}</span>
            <span style={{ fontWeight:700 }}>SAR {parseFloat(o.total||0).toFixed(2)}</span>
            <span><span className={'bx '+(sc[o.status]||'n')} style={{ textTransform:'capitalize' }}>{o.status}</span></span>
          </div>
        ))}
        {orders.length===0 && <div style={{ padding:32, textAlign:'center', color:'var(--text-muted-custom)' }}>No purchase orders yet</div>}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', fontWeight:700, fontSize:12, borderBottom:'1px solid var(--border-color)' }}>Suppliers ({suppliers.length})</div>
        <div className="tr th" style={{ gridTemplateColumns:'1fr 120px 140px 80px 90px' }}>
          {['Name','Contact','Email','City','VAT reg.'].map(h=><span key={h}>{h}</span>)}
        </div>
        {suppliers.map((s:any)=>(
          <div key={s.id} className="tr" style={{ gridTemplateColumns:'1fr 120px 140px 80px 90px' }}>
            <span style={{ fontWeight:600 }}>{s.name}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.contact_person||'—'}<br/>{s.phone||'—'}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.email||'—'}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.city||'—'}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.vat_number||'—'}</span>
          </div>
        ))}
        {suppliers.length===0 && <div style={{ padding:24, textAlign:'center', color:'var(--text-muted-custom)' }}>No suppliers — add your first supplier</div>}
      </div>

      {showPO && (
        <Modal title="New purchase order" onClose={()=>setShowPO(false)}>
          <Field label="Supplier" required>
            <Sel value={po.supplier_id} onChange={v=>sp('supplier_id',v)}>
              <option value="">Select supplier…</option>
              {suppliers.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
          </Field>
          {suppliers.length===0 && (
            <div style={{ padding:'8px 12px', background:'var(--bg-warning-custom)', borderRadius:'var(--radius)', fontSize:11, color:'var(--text-warning-custom)', marginBottom:12 }}>
              No suppliers yet — close this and add a supplier first
            </div>
          )}
          <Row2>
            <Field label="Order date"><Inp value={new Date().toISOString().split('T')[0]} onChange={()=>{}} disabled /></Field>
            <Field label="Expected delivery">
              <Inp type="date" value={po.expected_delivery_date} onChange={v=>sp('expected_delivery_date',v)} />
            </Field>
          </Row2>
          <Field label="Notes / instructions">
            <textarea value={po.notes} onChange={e=>sp('notes',e.target.value)}
              placeholder="Priority order, delivery instructions…"
              style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', fontSize:12, minHeight:70, resize:'vertical', background:'var(--surface-2)', color:'var(--text-primary)' }} />
          </Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowPO(false)}>Cancel</button>
            <SaveBtn label="Create PO" loading={createPO.isPending} disabled={!po.supplier_id} onClick={()=>createPO.mutate()} />
          </div>
        </Modal>
      )}

      {showSup && (
        <Modal title="Add supplier" onClose={()=>setShowSup(false)}>
          <Row2>
            <Field label="Company name" required><Inp value={sup.name} onChange={v=>ss('name',v)} placeholder="Al-Rashid Trading Co." /></Field>
            <Field label="Contact person"><Inp value={sup.contact_person} onChange={v=>ss('contact_person',v)} placeholder="Ahmed Al-Rashid" /></Field>
          </Row2>
          <Row2>
            <Field label="Phone"><Inp value={sup.phone} onChange={v=>ss('phone',v)} placeholder="+966 5x xxx xxxx" /></Field>
            <Field label="Email"><Inp type="email" value={sup.email} onChange={v=>ss('email',v)} placeholder="info@supplier.com" /></Field>
          </Row2>
          <Row2>
            <Field label="City"><Inp value={sup.city} onChange={v=>ss('city',v)} placeholder="Riyadh" /></Field>
            <Field label="VAT registration number"><Inp value={sup.vat_number} onChange={v=>ss('vat_number',v)} placeholder="3100xxxxxxxxxxxxx" /></Field>
          </Row2>
          <Field label="Payment terms (days)">
            <Sel value={sup.payment_terms} onChange={v=>ss('payment_terms',v)}>
              <option value="0">Cash on delivery</option>
              <option value="15">Net 15 days</option>
              <option value="30">Net 30 days</option>
              <option value="45">Net 45 days</option>
              <option value="60">Net 60 days</option>
            </Sel>
          </Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowSup(false)}>Cancel</button>
            <SaveBtn label="Add supplier" loading={createSup.isPending} disabled={!sup.name} onClick={()=>createSup.mutate()} />
          </div>
        </Modal>
      )}
    </div>
  );
}
