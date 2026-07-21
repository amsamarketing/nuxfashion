
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import Modal, { Field, Row } from '../../components/Modal';
import StatRow from '../../components/StatRow';

export default function Purchasing() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showPO, setShowPO] = useState(false);
  const [showSupplier, setShowSupplier] = useState(false);
  const [poForm, setPoForm] = useState({ supplier_id:'', expected_date:'', notes:'' });
  const [supForm, setSupForm] = useState({ name:'', email:'', phone:'', contact_person:'', city:'', vat_number:'' });

  const { data:orders=[] } = useQuery({ queryKey:['pos'], queryFn:()=>api.get('/purchasing/orders').then(r=>r.data) });
  const { data:suppliers=[] } = useQuery({ queryKey:['suppliers'], queryFn:()=>api.get('/purchasing/suppliers').then(r=>r.data) });

  const createPO = useMutation({
    mutationFn: ()=>api.post('/purchasing/orders', { ...poForm, order_date: new Date().toISOString().split('T')[0] }),
    onSuccess: d => {
      toast('Purchase order '+d.data.po_number+' created!', 'success');
      qc.invalidateQueries({ queryKey:['pos'] });
      setShowPO(false);
      setPoForm({ supplier_id:'', expected_date:'', notes:'' });
    },
    onError: ()=>toast('Failed to create PO','error')
  });

  const createSupplier = useMutation({
    mutationFn: ()=>api.post('/purchasing/suppliers', supForm),
    onSuccess: () => {
      toast('Supplier added!', 'success');
      qc.invalidateQueries({ queryKey:['suppliers'] });
      setShowSupplier(false);
      setSupForm({ name:'', email:'', phone:'', contact_person:'', city:'', vat_number:'' });
    },
    onError: ()=>toast('Failed to add supplier','error')
  });

  const sc:Record<string,string>={draft:'n',approved:'b',sent:'a',received:'g',partially_received:'a',cancelled:'r'};
  const totalVal = orders.reduce((s:number,p:any)=>s+parseFloat(p.total||0),0);
  const setP=(k:string,v:string)=>setPoForm(p=>({...p,[k]:v}));
  const setS=(k:string,v:string)=>setSupForm(p=>({...p,[k]:v}));

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>Purchasing</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{orders.length} purchase orders · {suppliers.length} suppliers</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt" onClick={()=>setShowSupplier(true)}><i className="ti ti-plus" /> Add supplier</button>
          <button className="bt bt-p" onClick={()=>setShowPO(true)}><i className="ti ti-plus" /> New PO</button>
        </div>
      </div>

      <StatRow stats={[{label:'Total POs',value:orders.length},{label:'Suppliers',value:suppliers.length},{label:'Total PO value',value:'SAR '+totalVal.toLocaleString(undefined,{maximumFractionDigits:0})}]} />

      <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:12 }}>
        <div className="tr th" style={{ gridTemplateColumns:'100px 1fr 110px 110px 80px 90px' }}>
          {['PO #','Supplier','Order date','Expected','Total','Status'].map(h=><span key={h}>{h}</span>)}
        </div>
        {orders.map((po:any)=>(
          <div key={po.id} className="tr" style={{ gridTemplateColumns:'100px 1fr 110px 110px 80px 90px', cursor:'pointer' }}>
            <span style={{ fontWeight:700 }}>{po.po_number}</span>
            <span style={{ fontWeight:500 }}>{po.supplier_name}</span>
            <span style={{ color:'var(--text-secondary)', fontSize:11 }}>{po.order_date?.slice(0,10)}</span>
            <span style={{ color:'var(--text-secondary)', fontSize:11 }}>{po.expected_delivery_date?.slice(0,10)||'—'}</span>
            <span style={{ fontWeight:700 }}>SAR {parseFloat(po.total||0).toFixed(2)}</span>
            <span><span className={'bx '+(sc[po.status]||'n')} style={{ textTransform:'capitalize' }}>{po.status}</span></span>
          </div>
        ))}
        {orders.length===0 && <div style={{ padding:32, textAlign:'center', color:'var(--text-muted-custom)' }}>No purchase orders yet</div>}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'10px 12px', fontWeight:700, fontSize:12, borderBottom:'1px solid var(--border-color)' }}>Suppliers ({suppliers.length})</div>
        <div className="tr th" style={{ gridTemplateColumns:'1fr 120px 140px 100px' }}>
          {['Supplier name','Contact','Email','City'].map(h=><span key={h}>{h}</span>)}
        </div>
        {suppliers.map((s:any)=>(
          <div key={s.id} className="tr" style={{ gridTemplateColumns:'1fr 120px 140px 100px' }}>
            <span style={{ fontWeight:600 }}>{s.name}<br/><span style={{ fontSize:10, color:'var(--text-muted-custom)', fontWeight:400 }}>VAT: {s.vat_number||'—'}</span></span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.contact_person||'—'}<br/>{s.phone||'—'}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.email||'—'}</span>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.city||'—'}</span>
          </div>
        ))}
        {suppliers.length===0 && <div style={{ padding:24, textAlign:'center', color:'var(--text-muted-custom)' }}>No suppliers yet</div>}
      </div>

      {showPO && (
        <Modal title="Create purchase order" onClose={()=>setShowPO(false)}>
          <Field label="Supplier *">
            <select value={poForm.supplier_id} onChange={e=>setP('supplier_id',e.target.value)}
              style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:'var(--surface-2)', fontSize:12 }}>
              <option value="">Select supplier…</option>
              {suppliers.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Row>
            <Field label="Order date">
              <input type="date" defaultValue={new Date().toISOString().split('T')[0]} disabled style={{ background:'var(--surface-1)' }} />
            </Field>
            <Field label="Expected delivery date">
              <input type="date" value={poForm.expected_date} onChange={e=>setP('expected_date',e.target.value)} />
            </Field>
          </Row>
          <Field label="Notes / instructions">
            <textarea value={poForm.notes} onChange={e=>setP('notes',e.target.value)}
              placeholder="e.g. Priority order, deliver to Riyadh Mall warehouse"
              style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', fontSize:12, minHeight:70, resize:'vertical', background:'var(--surface-2)', color:'var(--text-primary)' }} />
          </Field>
          <div style={{ padding:'10px 12px', background:'var(--bg-accent)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text-accent)', marginBottom:14 }}>
            <i className="ti ti-info-circle" /> PO will be created as Draft. Add line items and approve to send to supplier.
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowPO(false)}>Cancel</button>
            <button className="bt bt-p" disabled={!poForm.supplier_id||createPO.isPending} onClick={()=>createPO.mutate()}>
              {createPO.isPending ? <><div className="spinner-border spinner-border-sm me-1" />Creating…</> : <><i className="ti ti-check" /> Create PO</>}
            </button>
          </div>
        </Modal>
      )}

      {showSupplier && (
        <Modal title="Add supplier" onClose={()=>setShowSupplier(false)}>
          <Row>
            <Field label="Company name *">
              <input type="text" value={supForm.name} onChange={e=>setS('name',e.target.value)} placeholder="e.g. Al-Rashid Trading Co." />
            </Field>
            <Field label="Contact person">
              <input type="text" value={supForm.contact_person} onChange={e=>setS('contact_person',e.target.value)} placeholder="Name" />
            </Field>
          </Row>
          <Row>
            <Field label="Phone">
              <input type="text" value={supForm.phone} onChange={e=>setS('phone',e.target.value)} placeholder="+966 5x xxx xxxx" />
            </Field>
            <Field label="Email">
              <input type="email" value={supForm.email} onChange={e=>setS('email',e.target.value)} placeholder="supplier@example.com" />
            </Field>
          </Row>
          <Row>
            <Field label="City">
              <input type="text" value={supForm.city} onChange={e=>setS('city',e.target.value)} placeholder="Riyadh" />
            </Field>
            <Field label="VAT registration number">
              <input type="text" value={supForm.vat_number} onChange={e=>setS('vat_number',e.target.value)} placeholder="3100xxxxxxxxxxxxx" />
            </Field>
          </Row>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowSupplier(false)}>Cancel</button>
            <button className="bt bt-p" disabled={!supForm.name||createSupplier.isPending} onClick={()=>createSupplier.mutate()}>
              {createSupplier.isPending ? <><div className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="ti ti-check" /> Add supplier</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
