import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const fmt = (n: any) => 'SAR ' + parseFloat(n || 0).toFixed(2);
const TIER_COLOR: Record<string, string> = { regular: 'grey', silver: 'teal', gold: 'amber', vip: 'indigo', bronze: 'grey', platinum: 'indigo' };
const TIER_ICON: Record<string, string> = { regular: '👤', silver: '🥈', gold: '🥇', vip: '💎', bronze: '🥉', platinum: '💎' };

function CustomerModal({ cust, onClose }: { cust: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!cust?.id;
  const [form, setForm] = useState({
    name: cust?.name || '', phone: cust?.phone || '', email: cust?.email || '',
    date_of_birth: cust?.date_of_birth?.slice(0, 10) || '',
    gender: cust?.gender || '', nationality: cust?.nationality || '',
    loyalty_tier: cust?.loyalty_tier || 'regular', notes: cust?.notes || '',
  });
  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => isEdit ? api.patch(`/customers/${cust.id}`, form) : api.post('/customers', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); onClose(); },
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: 'min(540px,100%)', background: 'var(--cd)', borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: 24, display: 'grid', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/3' }}><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Full Name *</label><input className="nx-input" style={{ width: '100%' }} value={form.name} onChange={e => F('name', e.target.value)} placeholder="Customer name" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Phone</label><input className="nx-input" style={{ width: '100%' }} value={form.phone} onChange={e => F('phone', e.target.value)} placeholder="+966 5X XXX XXXX" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Email</label><input className="nx-input" type="email" style={{ width: '100%' }} value={form.email} onChange={e => F('email', e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Date of Birth</label><input className="nx-input" type="date" style={{ width: '100%' }} value={form.date_of_birth} onChange={e => F('date_of_birth', e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Gender</label>
              <select className="nx-select" style={{ width: '100%' }} value={form.gender} onChange={e => F('gender', e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Nationality</label><input className="nx-input" style={{ width: '100%' }} value={form.nationality} onChange={e => F('nationality', e.target.value)} placeholder="Saudi" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Loyalty Tier</label>
              <select className="nx-select" style={{ width: '100%' }} value={form.loyalty_tier} onChange={e => F('loyalty_tier', e.target.value)}>
                {['regular', 'silver', 'gold', 'vip'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Notes</label><textarea className="nx-input" style={{ width: '100%', height: 64, resize: 'none' }} value={form.notes} onChange={e => F('notes', e.target.value)} /></div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? 'Saving...' : 'Save Customer'}</button>
        </div>
      </div>
    </div>
  );
}

function LoyaltyModal({ cust, onClose }: { cust: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [pts, setPts] = useState('');
  const [type, setType] = useState<'add' | 'deduct'>('add');
  const [reason, setReason] = useState('');
  const adjust = useMutation({
    mutationFn: () => api.post(`/customers/${cust.id}/loyalty`, { points: parseInt(pts) * (type === 'deduct' ? -1 : 1), reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['cust-loyalty', cust.id] }); onClose(); },
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: 380, background: 'var(--cd)', borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Adjust Loyalty Points</h3>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 12 }}>
          <div style={{ padding: '10px 14px', background: 'var(--acg)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>Current Points</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ac)' }}>{cust.loyalty_points || 0}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['add', 'deduct'] as const).map(t => <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${type === t ? 'var(--ac)' : 'var(--bd)'}`, background: type === t ? 'var(--acg)' : 'transparent', color: type === t ? 'var(--ac)' : 'var(--mu)', fontWeight: type === t ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{t === 'add' ? '+ Add Points' : '− Deduct Points'}</button>)}
          </div>
          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Points</label><input className="nx-input" type="number" style={{ width: '100%' }} value={pts} onChange={e => setPts(e.target.value)} placeholder="0" min="1" /></div>
          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Reason</label><input className="nx-input" style={{ width: '100%' }} value={reason} onChange={e => setReason(e.target.value)} placeholder="Manual adjustment, birthday bonus..." /></div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={() => adjust.mutate()} disabled={!pts || adjust.isPending}>{adjust.isPending ? 'Saving...' : 'Apply'}</button>
        </div>
      </div>
    </div>
  );
}

function AddressModal({ cust, onClose }: { cust: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ label: 'Home', street: '', district: '', city: '', region: '', postal_code: '', is_default: false });
  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => api.post(`/customers/${cust.id}/addresses`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cust-addresses', cust.id] }); onClose(); },
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: 460, background: 'var(--cd)', borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Address</h3>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Label</label>
              <select className="nx-select" style={{ width: '100%' }} value={form.label} onChange={e => F('label', e.target.value)}>
                {['Home', 'Work', 'Other'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Postal Code</label><input className="nx-input" style={{ width: '100%' }} value={form.postal_code} onChange={e => F('postal_code', e.target.value)} /></div>
          </div>
          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Street</label><input className="nx-input" style={{ width: '100%' }} value={form.street} onChange={e => F('street', e.target.value)} placeholder="Street name and number" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>District</label><input className="nx-input" style={{ width: '100%' }} value={form.district} onChange={e => F('district', e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>City</label><input className="nx-input" style={{ width: '100%' }} value={form.city} onChange={e => F('city', e.target.value)} placeholder="Riyadh" /></div>
          </div>
          <div><label style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>Region</label>
            <select className="nx-select" style={{ width: '100%' }} value={form.region} onChange={e => F('region', e.target.value)}>
              <option value="">Select region</option>
              {['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar', 'Abha', 'Taif', 'Tabuk', 'Qassim', 'Hail', 'Jizan', 'Najran'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_default} onChange={e => F('is_default', e.target.checked)} /> Set as default address
          </label>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={() => save.mutate()} disabled={!form.street || save.isPending}>{save.isPending ? 'Saving...' : 'Add Address'}</button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({ cust, onEdit, onClose }: { cust: any; onEdit: () => void; onClose: () => void }) {
  const [tab, setTab] = useState('info');
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [showAddr, setShowAddr] = useState(false);

  const { data: orders } = useQuery({ queryKey: ['cust-orders', cust.id], queryFn: async () => { const r = await api.get(`/customers/${cust.id}/orders`); return r.data; }, enabled: tab === 'orders' });
  const { data: addresses } = useQuery({ queryKey: ['cust-addresses', cust.id], queryFn: async () => { const r = await api.get(`/customers/${cust.id}/addresses`); return r.data; }, enabled: tab === 'addresses' });
  const { data: loyalty } = useQuery({ queryKey: ['cust-loyalty', cust.id], queryFn: async () => { const r = await api.get(`/customers/${cust.id}/loyalty`); return r.data; }, enabled: tab === 'loyalty' });
  const { data: interactions } = useQuery({ queryKey: ['cust-interactions', cust.id], queryFn: async () => { const r = await api.get(`/customers/${cust.id}/interactions`); return r.data; }, enabled: tab === 'interactions' });

  const ordList: any[] = Array.isArray(orders) ? orders : orders?.orders || orders?.data || [];
  const addrList: any[] = Array.isArray(addresses) ? addresses : addresses?.addresses || addresses?.data || [];
  const loyaltyHistory: any[] = Array.isArray(loyalty) ? loyalty : loyalty?.history || loyalty?.data || [];
  const interactionList: any[] = Array.isArray(interactions) ? interactions : interactions?.interactions || interactions?.data || [];

  const tier = cust.loyalty_tier || 'regular';

  return (
    <>
      {showLoyalty && <LoyaltyModal cust={cust} onClose={() => setShowLoyalty(false)} />}
      {showAddr && <AddressModal cust={cust} onClose={() => setShowAddr(false)} />}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, background: 'var(--cd)', borderLeft: '1px solid var(--bd)', zIndex: 900, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--acg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'var(--ac)' }}>{cust.name?.slice(0, 2).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{cust.name}</div>
                <div style={{ fontSize: 12, color: 'var(--mu)' }}>{cust.phone || cust.email || '—'}</div>
              </div>
            </div>
            <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x" /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`nx-badge ${TIER_COLOR[tier]}`} style={{ fontSize: 12 }}>{TIER_ICON[tier]} {tier}</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg)' }}>⭐ {cust.loyalty_points || 0} pts</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg)' }}>💰 {fmt(cust.wallet_balance)}</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg)', marginLeft: 'auto' }}>Total: {fmt(cust.total_spent)}</span>
          </div>
        </div>
        {/* Action bar */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', gap: 6 }}>
          <button className="btn-nx ghost sm" onClick={onEdit}><i className="ti ti-edit" /> Edit</button>
          <button className="btn-nx ghost sm" onClick={() => setShowLoyalty(true)}><i className="ti ti-star" /> Loyalty</button>
          <button className="btn-nx ghost sm" onClick={() => { setTab('addresses'); setShowAddr(true); }}><i className="ti ti-map-pin" /> Address</button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', overflowX: 'auto' }}>
          {[['info', 'Info'], ['orders', 'Orders'], ['addresses', 'Addresses'], ['loyalty', 'Loyalty'], ['interactions', 'Notes']].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '9px 14px', border: 'none', background: 'none', borderBottom: tab === id ? '2px solid var(--ac)' : '2px solid transparent', color: tab === id ? 'var(--ac)' : 'var(--mu)', fontWeight: tab === id ? 600 : 400, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>{l}</button>
          ))}
        </div>
        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'info' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {[['Phone', cust.phone || '—'], ['Email', cust.email || '—'], ['Gender', cust.gender || '—'], ['Date of Birth', cust.date_of_birth ? new Date(cust.date_of_birth).toLocaleDateString('en-GB') : '—'], ['Nationality', cust.nationality || '—'], ['Tier', tier], ['Total Orders', cust.total_orders || 0], ['Total Spent', fmt(cust.total_spent)], ['Avg Order', cust.total_orders ? fmt((cust.total_spent || 0) / cust.total_orders) : 'SAR 0.00'], ['Member Since', cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-GB') : '—']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
                  <span style={{ fontSize: 12, color: 'var(--mu)' }}>{k}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                </div>
              ))}
              {cust.notes && <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--mu)' }}>{cust.notes}</div>}
            </div>
          )}
          {tab === 'orders' && (
            <div>
              {ordList.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--mu)' }}>No orders yet</div> : ordList.map((o: any) => (
                <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>#{o.order_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'} · {o.status}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(o.total)}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'addresses' && (
            <div>
              <button className="btn-nx ghost sm" style={{ marginBottom: 14, width: '100%', justifyContent: 'center' }} onClick={() => setShowAddr(true)}><i className="ti ti-plus" /> Add Address</button>
              {addrList.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--mu)' }}>No addresses yet</div> : addrList.map((a: any, i: number) => (
                <div key={i} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--bd)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label || 'Address'}</span>
                    {a.is_default && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--acg)', color: 'var(--ac)', fontWeight: 700 }}>Default</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.6 }}>{[a.street, a.district, a.city, a.region, a.postal_code].filter(Boolean).join(', ')}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'loyalty' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: '14px', background: 'var(--acg)', borderRadius: 10, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--mu)' }}>POINTS</div><div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ac)' }}>{cust.loyalty_points || 0}</div></div>
                <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: 10, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--mu)' }}>VALUE</div><div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{fmt((cust.loyalty_points || 0) * 0.1)}</div></div>
              </div>
              <button className="btn-nx ghost sm" style={{ marginBottom: 14, width: '100%', justifyContent: 'center' }} onClick={() => setShowLoyalty(true)}><i className="ti ti-star" /> Adjust Points</button>
              {loyaltyHistory.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--mu)' }}>No loyalty history</div> : loyaltyHistory.map((h: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600 }}>{h.reason || h.type || 'Adjustment'}</div><div style={{ fontSize: 11, color: 'var(--mu)' }}>{h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}</div></div>
                  <div style={{ fontWeight: 700, color: (h.points || 0) >= 0 ? '#10b981' : '#ef4444' }}>{(h.points || 0) >= 0 ? '+' : ''}{h.points}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'interactions' && (
            <div>
              {interactionList.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--mu)' }}>No notes yet</div> : interactionList.map((n: any, i: number) => (
                <div key={i} style={{ padding: 12, borderRadius: 10, border: '1px solid var(--bd)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ac)' }}>{n.type || 'Note'}</span>
                    <span style={{ fontSize: 11, color: 'var(--mu)' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{n.notes || n.content || n.description || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Customers() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [sel, setSel] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editCust, setEditCust] = useState<any>(null);
  const [sortBy, setSortBy] = useState('name');

  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: async () => { const r = await api.get('/customers?limit=500'); return r.data; } });
  const customers: any[] = Array.isArray(data) ? data : data?.customers || data?.data || [];

  const filtered = customers
    .filter(c => (tierFilter === 'all' || (c.loyalty_tier || 'regular') === tierFilter) &&
      (!q || c.name?.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sortBy === 'spent' ? (b.total_spent || 0) - (a.total_spent || 0) : sortBy === 'points' ? (b.loyalty_points || 0) - (a.loyalty_points || 0) : (a.name || '').localeCompare(b.name || ''));

  const totalSpend = customers.reduce((s, c) => s + parseFloat(c.total_spent || 0), 0);
  const vipCount = customers.filter(c => c.loyalty_tier === 'vip').length;
  const goldCount = customers.filter(c => c.loyalty_tier === 'gold').length;

  const exportCSV = () => {
    const rows = [['Name', 'Phone', 'Email', 'Tier', 'Points', 'Total Spent', 'Member Since'], ...filtered.map(c => [c.name, c.phone || '', c.email || '', c.loyalty_tier || 'regular', c.loyalty_points || 0, parseFloat(c.total_spent || 0).toFixed(2), c.created_at ? new Date(c.created_at).toLocaleDateString() : ''])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'customers.csv'; a.click();
  };

  return (
    <div>
      <div className="nx-page-head">
        <div><h1 className="nx-page-title">Customers</h1><p className="nx-page-sub">{customers.length} total · {vipCount} VIP · {goldCount} Gold</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-nx ghost" onClick={exportCSV}><i className="ti ti-download" /> Export</button>
          <button className="btn-nx primary" onClick={() => { setEditCust(null); setShowForm(true); }}><i className="ti ti-plus" /> Add Customer</button>
        </div>
      </div>

      <div className="nx-stats cols-4" style={{ marginBottom: 20 }}>
        <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-users" /></div><div className="nx-stat-body"><div className="nx-stat-val">{customers.length}</div><div className="nx-stat-lbl">Total Customers</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-crown" /></div><div className="nx-stat-body"><div className="nx-stat-val">{vipCount + goldCount}</div><div className="nx-stat-lbl">VIP + Gold</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-currency-riyal" /></div><div className="nx-stat-body"><div className="nx-stat-val">SAR {(totalSpend / 1000).toFixed(1)}k</div><div className="nx-stat-lbl">Total Revenue</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-star" /></div><div className="nx-stat-body"><div className="nx-stat-val">{customers.reduce((s, c) => s + (c.loyalty_points || 0), 0).toLocaleString()}</div><div className="nx-stat-lbl">Total Points</div></div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--cd)', border: '1px solid var(--bd)', borderRadius: 10, flex: 1, minWidth: 180 }}>
          <i className="ti ti-search" style={{ color: 'var(--mu)' }} />
          <input className="nx-input" style={{ border: 'none', background: 'transparent', padding: 0, outline: 'none' }} placeholder="Search name, phone, email..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {['all', 'regular', 'silver', 'gold', 'vip'].map(t => (
          <button key={t} onClick={() => setTierFilter(t)} className={tierFilter === t ? 'btn-nx primary sm' : 'btn-nx ghost sm'} style={{ textTransform: 'capitalize' }}>{t === 'all' ? 'All Tiers' : t}</button>
        ))}
        <select className="nx-select" style={{ marginLeft: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="spent">Sort: Most Spent</option>
          <option value="points">Sort: Most Points</option>
        </select>
      </div>

      <div className="nx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--bd)' }}>
            {['Customer', 'Phone', 'Email', 'Tier', 'Points', 'Wallet', 'Total Spent', 'Orders', 'Actions'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>No customers found</td></tr>
                : filtered.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--bd)', background: sel?.id === c.id ? 'var(--acg)' : 'transparent', cursor: 'pointer' }} onClick={() => setSel(c)}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--acg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ac)', flexShrink: 0 }}>{c.name?.slice(0, 2).toUpperCase()}</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--mu)' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--mu)' }}>{c.email || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><span className={`nx-badge ${TIER_COLOR[c.loyalty_tier || 'regular']}`}>{TIER_ICON[c.loyalty_tier || 'regular']} {c.loyalty_tier || 'regular'}</span></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{(c.loyalty_points || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{fmt(c.wallet_balance)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13 }}>{fmt(c.total_spent)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{c.total_orders || 0}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-nx ghost sm" onClick={e => { e.stopPropagation(); setSel(c); }}><i className="ti ti-eye" /></button>
                        <button className="btn-nx ghost sm" onClick={e => { e.stopPropagation(); setEditCust(c); setShowForm(true); }}><i className="ti ti-edit" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {sel && <CustomerDetail cust={sel} onEdit={() => { setEditCust(sel); setShowForm(true); }} onClose={() => setSel(null)} />}
      {showForm && <CustomerModal cust={editCust} onClose={() => setShowForm(false)} />}
    </div>
  );
}
