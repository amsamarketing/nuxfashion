import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const fmt = (n: any) => Number(n || 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS_COLOR: Record<string, string> = { draft: 'grey', pending: 'amber', approved: 'indigo', received: 'green', cancelled: 'red', partial: 'teal' };

/* ── Supplier Modal ── */
function SupplierModal({ sup, onClose }: { sup: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!sup?.id;
  const [form, setForm] = useState({ name: sup?.name || '', contact_person: sup?.contact_person || '', email: sup?.email || '', phone: sup?.phone || '', address: sup?.address || '', city: sup?.city || '', country: sup?.country || 'Saudi Arabia', tax_number: sup?.tax_number || '', payment_terms: sup?.payment_terms || '30', notes: sup?.notes || '' });
  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => isEdit ? api.patch(`/purchasing/suppliers/${sup.id}`, form) : api.post('/purchasing/suppliers', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: 'min(560px,100%)', background: 'var(--cd)', borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: 24, display: 'grid', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Company Name *</label><input className="nx-input" style={{ width: '100%' }} value={form.name} onChange={e => F('name', e.target.value)} placeholder="Al-Noor Textiles" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Contact Name</label><input className="nx-input" style={{ width: '100%' }} value={form.contact_person} onChange={e => F('contact_person', e.target.value)} placeholder="Ahmed Ali" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Email</label><input className="nx-input" type="email" style={{ width: '100%' }} value={form.email} onChange={e => F('email', e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Phone</label><input className="nx-input" style={{ width: '100%' }} value={form.phone} onChange={e => F('phone', e.target.value)} placeholder="+966 5X XXX XXXX" /></div>
          </div>
          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Address</label><input className="nx-input" style={{ width: '100%' }} value={form.address} onChange={e => F('address', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>City</label><input className="nx-input" style={{ width: '100%' }} value={form.city} onChange={e => F('city', e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Country</label><input className="nx-input" style={{ width: '100%' }} value={form.country} onChange={e => F('country', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>VAT / Tax Number</label><input className="nx-input" style={{ width: '100%' }} value={form.tax_number} onChange={e => F('tax_number', e.target.value)} placeholder="3XXXXXXXXXX" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Payment Terms (days)</label>
              <select className="nx-select" style={{ width: '100%' }} value={form.payment_terms} onChange={e => F('payment_terms', e.target.value)}>
                {['0', '7', '14', '30', '45', '60', '90'].map(d => <option key={d} value={d}>{d === '0' ? 'Cash on delivery' : `Net ${d} days`}</option>)}
              </select>
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Notes</label><textarea className="nx-input" style={{ width: '100%', height: 60, resize: 'none' }} value={form.notes} onChange={e => F('notes', e.target.value)} /></div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? 'Saving...' : 'Save Supplier'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Create PO Modal ── */
function POModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: suppData } = useQuery({ queryKey: ['suppliers'], queryFn: async () => { const r = await api.get('/purchasing/suppliers'); return r.data; } });
  const { data: prodData } = useQuery({ queryKey: ['products-brief'], queryFn: async () => { const r = await api.get('/catalog/products?limit=200'); return r.data; } });
  const suppliers: any[] = Array.isArray(suppData) ? suppData : suppData?.suppliers || suppData?.data || [];
  const products: any[] = Array.isArray(prodData) ? prodData : prodData?.products || prodData?.data || [];

  const [suppId, setSuppId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<any[]>([{ product_id: '', variant_id: '', size: '', color: '', quantity_ordered: 1, unit_cost: '', tax_rate: 15 }]);

  const addLine = () => setLines(l => [...l, { product_id: '', variant_id: '', size: '', color: '', quantity_ordered: 1, unit_cost: '', tax_rate: 15 }]);
  const delLine = (i: number) => setLines(l => l.filter((_, j) => j !== i));
  const setLine = (i: number, k: string, v: any) => setLines(l => l.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const total = lines.reduce((s, l) => s + (parseFloat(l.unit_cost) || 0) * (parseInt(l.quantity_ordered) || 0), 0);

  const save = useMutation({
    mutationFn: () => api.post('/purchasing/orders', { supplier_id: suppId, expected_date: expectedDate, notes, lines: lines.filter(l => l.product_id && l.quantity_ordered && l.unit_cost) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['po'] }); onClose(); },
  });

  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'];
  const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Grey', 'Navy', 'Beige', 'Maroon'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: 'min(820px,100%)', background: 'var(--cd)', borderRadius: 16, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Purchase Order</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/3' }}><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Supplier *</label>
              <select className="nx-select" style={{ width: '100%' }} value={suppId} onChange={e => setSuppId(e.target.value)}>
                <option value="">Select supplier...</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Expected Date</label><input className="nx-input" type="date" style={{ width: '100%' }} value={expectedDate} onChange={e => setExpectedDate(e.target.value)} /></div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 600 }}>ORDER ITEMS</label>
              <button className="btn-nx ghost sm" onClick={addLine}><i className="ti ti-plus" /> Add Item</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {lines.map((line, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 100px 36px', gap: 6, alignItems: 'center' }}>
                  <select className="nx-select" value={line.product_id} onChange={e => setLine(i, 'product_id', e.target.value)}>
                    <option value="">Product...</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select className="nx-select" value={line.size} onChange={e => setLine(i, 'size', e.target.value)}>
                    <option value="">Size</option>
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="nx-select" value={line.color} onChange={e => setLine(i, 'color', e.target.value)}>
                    <option value="">Color</option>
                    {COLORS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input className="nx-input" type="number" min="1" value={line.quantity_ordered} onChange={e => setLine(i, 'quantity_ordered', e.target.value)} placeholder="Qty" />
                  <input className="nx-input" type="number" step="0.01" value={line.unit_cost} onChange={e => setLine(i, 'unit_cost', e.target.value)} placeholder="Unit cost" />
                  <button className="btn-nx ghost sm" style={{ color: '#ef4444', padding: '0 8px' }} onClick={() => delLine(i)}><i className="ti ti-trash" /></button>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 700, fontSize: 16 }}>Total: SAR {fmt(total)}</div>
          </div>

          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Notes</label><textarea className="nx-input" style={{ width: '100%', height: 60, resize: 'none' }} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={() => save.mutate()} disabled={!suppId || save.isPending}>{save.isPending ? 'Creating...' : 'Create PO'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── PO Detail Panel ── */
function PODetail({ po, onClose, onApprove, onReceive, onCancel }: { po: any; onClose: () => void; onApprove: () => void; onReceive: () => void; onCancel: () => void }) {
  const { data } = useQuery({
    queryKey: ['po-detail', po.id],
    queryFn: async () => { const r = await api.get(`/purchasing/orders/${po.id}`); return r.data; },
  });
  const detail = data || po;
  const items: any[] = detail.items || detail.order_items || [];
  return (
    <div style={{ background: 'var(--cd)', borderRadius: 14, border: '1px solid var(--bd)', overflow: 'hidden', position: 'sticky', top: 80 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{detail.po_number || detail.order_number || `PO-${detail.id?.slice(0, 8)}`}</div>
          <div style={{ fontSize: 12, color: 'var(--mu)' }}>{detail.supplier?.name || detail.supplier_name || '—'}</div>
        </div>
        <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x" /></button>
      </div>
      <div style={{ padding: 20, maxHeight: 520, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[['Status', <span key="s" className={`nx-badge ${STATUS_COLOR[detail.status] || 'grey'}`}>{detail.status}</span>], ['Total', `SAR ${fmt(detail.total_amount || detail.total)}`], ['Expected', detail.expected_date ? new Date(detail.expected_date).toLocaleDateString() : '—'], ['Created', detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '—']].map(([k, v]: any) => (
            <div key={k} style={{ paddingBottom: 8, borderBottom: '1px solid var(--bd)' }}>
              <div style={{ fontSize: 10, color: 'var(--mu)', marginBottom: 2 }}>{k}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 8, fontWeight: 600 }}>ORDER ITEMS ({items.length})</div>
        {items.length === 0 ? <div style={{ color: 'var(--mu)', fontSize: 13 }}>No items</div> : items.map((it: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{it.product_name || it.product?.name || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>{it.size ? `${it.size}` : ''}{it.color ? ` · ${it.color}` : ''}{it.sku ? ` · ${it.sku}` : ''}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>Qty: {it.quantity} × SAR {fmt(it.unit_cost)}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>SAR {fmt((it.quantity || 0) * (it.unit_cost || 0))}</div>
          </div>
        ))}
        {detail.notes && <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--mu)' }}>{detail.notes}</div>}
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {detail.status === 'pending' && <button className="btn-nx primary sm" onClick={onApprove}><i className="ti ti-check" /> Approve</button>}
        {detail.status === 'approved' && <button className="btn-nx sm" style={{ background: '#10b981', color: '#fff', border: 'none' }} onClick={onReceive}><i className="ti ti-package-import" /> Mark Received</button>}
        {!['cancelled', 'received'].includes(detail.status) && <button className="btn-nx ghost sm" style={{ color: '#ef4444' }} onClick={onCancel}><i className="ti ti-x" /> Cancel</button>}
        <button className="btn-nx ghost sm" onClick={() => window.print()}><i className="ti ti-printer" /> Print</button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function Purchasing() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'orders' | 'suppliers'>('orders');
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState<any>(null);
  const [showPO, setShowPO] = useState(false);
  const [showSupp, setShowSupp] = useState(false);
  const [editSupp, setEditSupp] = useState<any>(null);
  const [search, setSearch] = useState('');

  const { data: poData, isLoading: poLoading } = useQuery({ queryKey: ['po'], queryFn: async () => { const r = await api.get('/purchasing/orders?limit=200'); return r.data; } });
  const { data: suppData, isLoading: suppLoading } = useQuery({ queryKey: ['suppliers'], queryFn: async () => { const r = await api.get('/purchasing/suppliers'); return r.data; } });

  const allOrders: any[] = Array.isArray(poData) ? poData : poData?.orders || poData?.data || [];
  const suppliers: any[] = Array.isArray(suppData) ? suppData : suppData?.suppliers || suppData?.data || [];

  const orders = allOrders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter;
    const matchSearch = !search || (o.po_number || o.order_number || '').toLowerCase().includes(search.toLowerCase()) || (o.supplier?.name || o.supplier_name || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalSpend = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (parseFloat(o.total_amount || o.total) || 0), 0);
  const pendingCount = allOrders.filter(o => o.status === 'pending').length;
  const approvedCount = allOrders.filter(o => o.status === 'approved').length;

  const approve = useMutation({ mutationFn: (id: string) => api.patch(`/purchasing/orders/${id}/approve`, {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['po'] }); qc.invalidateQueries({ queryKey: ['po-detail', sel?.id] }); } });
  const receive = useMutation({ mutationFn: (id: string) => api.patch(`/purchasing/orders/${id}/receive`, {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['po'] }); qc.invalidateQueries({ queryKey: ['po-detail', sel?.id] }); } });
  const cancel = useMutation({ mutationFn: (id: string) => api.patch(`/purchasing/orders/${id}/cancel`, {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['po'] }); qc.invalidateQueries({ queryKey: ['po-detail', sel?.id] }); } });

  const FILTERS = [['all', 'All'], ['draft', 'Draft'], ['pending', 'Pending'], ['approved', 'Approved'], ['received', 'Received'], ['cancelled', 'Cancelled']];

  return (
    <div>
      <div className="nx-page-head">
        <div><h1 className="nx-page-title">Purchasing</h1><p className="nx-page-sub">{allOrders.length} orders · {suppliers.length} suppliers</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-nx ghost" onClick={() => { setEditSupp(null); setShowSupp(true); }}><i className="ti ti-user-plus" /> Add Supplier</button>
          <button className="btn-nx primary" onClick={() => setShowPO(true)}><i className="ti ti-plus" /> New PO</button>
        </div>
      </div>

      <div className="nx-stats cols-4" style={{ marginBottom: 20 }}>
        <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-file-invoice" /></div><div className="nx-stat-body"><div className="nx-stat-val">{allOrders.length}</div><div className="nx-stat-lbl">Total Orders</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-clock" /></div><div className="nx-stat-body"><div className="nx-stat-val">{pendingCount}</div><div className="nx-stat-lbl">Pending Approval</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-truck" /></div><div className="nx-stat-body"><div className="nx-stat-val">{approvedCount}</div><div className="nx-stat-lbl">In Transit</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-currency-riyal" /></div><div className="nx-stat-body"><div className="nx-stat-val">SAR {fmt(totalSpend)}</div><div className="nx-stat-lbl">Total Spend</div></div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--bd)', paddingBottom: 0 }}>
        {[['orders', 'Purchase Orders'], ['suppliers', 'Suppliers']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{ padding: '8px 16px', border: 'none', background: 'none', borderBottom: tab === id ? '2px solid var(--ac)' : '2px solid transparent', color: tab === id ? 'var(--ac)' : 'var(--mu)', fontWeight: tab === id ? 600 : 400, cursor: 'pointer', fontSize: 13 }}>{l}</button>
        ))}
      </div>

      {tab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {FILTERS.map(([id, l]) => (
                <button key={id} onClick={() => setFilter(id)} className={filter === id ? 'btn-nx primary sm' : 'btn-nx ghost sm'}>{l}{id !== 'all' ? ` (${allOrders.filter(o => o.status === id).length})` : ''}</button>
              ))}
              <input className="nx-input" style={{ marginLeft: 'auto', width: 200 }} placeholder="Search PO / supplier..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="nx-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  {['PO Number', 'Supplier', 'Items', 'Total', 'Expected', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {poLoading ? <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--mu)' }}>Loading...</td></tr>
                  : orders.length === 0 ? <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--mu)' }}>No orders found</td></tr>
                  : orders.map((o: any) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--bd)', background: sel?.id === o.id ? 'var(--acg)' : 'transparent', cursor: 'pointer' }} onClick={() => setSel(o)}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>{o.po_number || o.order_number || `PO-${o.id?.slice(0, 8)}`}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{o.supplier?.name || o.supplier_name || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{o.items_count || o.item_count || '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>SAR {fmt(o.total_amount || o.total)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--mu)' }}>{o.expected_date ? new Date(o.expected_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '12px 14px' }}><span className={`nx-badge ${STATUS_COLOR[o.status] || 'grey'}`}>{o.status}</span></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {o.status === 'pending' && <button className="btn-nx ghost sm" title="Approve" onClick={e => { e.stopPropagation(); approve.mutate(o.id); }}><i className="ti ti-check" /></button>}
                          {o.status === 'approved' && <button className="btn-nx ghost sm" title="Mark Received" onClick={e => { e.stopPropagation(); receive.mutate(o.id); }}><i className="ti ti-package-import" /></button>}
                          {!['cancelled', 'received'].includes(o.status) && <button className="btn-nx ghost sm" title="Cancel" style={{ color: '#ef4444' }} onClick={e => { e.stopPropagation(); cancel.mutate(o.id); }}><i className="ti ti-x" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {sel && <PODetail po={sel} onClose={() => setSel(null)} onApprove={() => approve.mutate(sel.id)} onReceive={() => receive.mutate(sel.id)} onCancel={() => cancel.mutate(sel.id)} />}
        </div>
      )}

      {tab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {suppLoading ? <div style={{ color: 'var(--mu)' }}>Loading...</div>
          : suppliers.length === 0 ? <div style={{ color: 'var(--mu)' }}>No suppliers yet.</div>
          : suppliers.map((s: any) => (
            <div key={s.id} className="nx-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--acg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-building-store" style={{ fontSize: 20, color: 'var(--ac)' }} /></div>
                <span className="nx-badge green">Active</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>{s.contact_person || '—'}</div>
              <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                {s.phone && <div style={{ fontSize: 12 }}><i className="ti ti-phone" style={{ marginRight: 6, color: 'var(--mu)' }} />{s.phone}</div>}
                {s.email && <div style={{ fontSize: 12 }}><i className="ti ti-mail" style={{ marginRight: 6, color: 'var(--mu)' }} />{s.email}</div>}
                {s.city && <div style={{ fontSize: 12 }}><i className="ti ti-map-pin" style={{ marginRight: 6, color: 'var(--mu)' }} />{s.city}{s.country ? ', ' + s.country : ''}</div>}
                {s.payment_terms && <div style={{ fontSize: 12 }}><i className="ti ti-calendar" style={{ marginRight: 6, color: 'var(--mu)' }} />Net {s.payment_terms} days</div>}
              </div>
              <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 10, display: 'flex', gap: 6 }}>
                <button className="btn-nx ghost sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setEditSupp(s); setShowSupp(true); }}><i className="ti ti-edit" /> Edit</button>
                <button className="btn-nx ghost sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setSuppId_filter(s.id); setTab('orders'); }}><i className="ti ti-file-invoice" /> Orders</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPO && <POModal onClose={() => setShowPO(false)} />}
      {showSupp && <SupplierModal sup={editSupp} onClose={() => setShowSupp(false)} />}
    </div>
  );
}

function setSuppId_filter(_id: string) {}
