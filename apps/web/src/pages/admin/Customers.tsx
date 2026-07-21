
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import Modal, { Field, Row } from '../../components/Modal';

export default function Customers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name:'', phone:'', email:'', date_of_birth:'' });

  const { data:customers=[], isLoading } = useQuery({ queryKey:['customers'], queryFn:()=>api.get('/customers').then(r=>r.data) });

  const addMut = useMutation({
    mutationFn: ()=>api.post('/customers', form),
    onSuccess: () => {
      toast('Customer added successfully!', 'success');
      qc.invalidateQueries({ queryKey:['customers'] });
      setShowAdd(false);
      setForm({ name:'', phone:'', email:'', date_of_birth:'' });
    },
    onError: ()=>toast('Failed to add customer', 'error')
  });

  const set = (k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const tierCls:Record<string,string>={bronze:'n',silver:'n',gold:'b',vip:'b',platinum:'b'};

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:12 }}>
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>Customers</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{customers.length} registered customers</div>
          </div>
          <div className="d-flex gap-2">
            <button className="bt"><i className="ti ti-download" /> Export</button>
            <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus" /> Add customer</button>
          </div>
        </div>

        {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div> : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div className="tr th" style={{ gridTemplateColumns:'1fr 110px 90px 80px 70px' }}>
              {['Customer','Phone','Tier','Points','Joined'].map(h=><span key={h}>{h}</span>)}
            </div>
            {customers.map((c:any)=>(
              <div key={c.id} className="tr" style={{ gridTemplateColumns:'1fr 110px 90px 80px 70px', cursor:'pointer', background:selected?.id===c.id?'var(--bg-accent)':'' }}
                onClick={()=>setSelected(c)}>
                <span>
                  <div style={{ fontWeight:600 }}>{c.name}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{c.email||'No email'}</div>
                </span>
                <span style={{ color:'var(--text-secondary)', fontSize:11 }}>{c.phone||'—'}</span>
                <span><span className={'bx '+(tierCls[c.loyalty_tier]||'n')} style={{ textTransform:'capitalize' }}>{c.loyalty_tier}</span></span>
                <span style={{ fontWeight:700, color:'var(--fill-accent)' }}>{c.loyalty_points}</span>
                <span style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {customers.length===0 && (
              <div style={{ padding:32, textAlign:'center', color:'var(--text-muted-custom)' }}>
                <i className="ti ti-users" style={{ fontSize:36, display:'block', marginBottom:8 }} />
                No customers yet — add your first customer
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile panel */}
      <div className="card" style={{ alignSelf:'start', position:'sticky', top:0 }}>
        {selected ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--bg-accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'var(--fill-accent)', flexShrink:0 }}>
                {selected.name.slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>{selected.name}</div>
                <span className={'bx '+(tierCls[selected.loyalty_tier]||'n')} style={{ textTransform:'capitalize' }}>{selected.loyalty_tier} member</span>
              </div>
            </div>
            {[['Phone',selected.phone||'—'],['Email',selected.email||'—'],['Loyalty points',selected.loyalty_points+' pts'],['Date of birth',selected.date_of_birth||'—'],['Member since',new Date(selected.created_at).toLocaleDateString()]].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-color)', fontSize:12 }}>
                <span style={{ color:'var(--text-secondary)' }}>{l}</span>
                <span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
            <div className="d-flex gap-2 mt-3">
              <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-edit" /> Edit</button>
              <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-history" /> Orders</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted-custom)' }}>
            <i className="ti ti-user" style={{ fontSize:32, display:'block', marginBottom:8 }} />
            Click a customer to view their profile
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add new customer" onClose={()=>setShowAdd(false)}>
          <Field label="Full name *">
            <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Sara Abdullah" />
          </Field>
          <Row>
            <Field label="Mobile number">
              <input type="text" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+966 5x xxx xxxx" />
            </Field>
            <Field label="Email address">
              <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="sara@example.com" />
            </Field>
          </Row>
          <Field label="Date of birth (for birthday discount)">
            <input type="date" value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)} />
          </Field>
          <div style={{ padding:'10px 12px', background:'var(--bg-success-custom)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text-success-custom)', marginBottom:14 }}>
            <i className="ti ti-star" /> Customer will automatically be enrolled in the Bronze loyalty tier
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="bt bt-p" disabled={!form.name||addMut.isPending} onClick={()=>addMut.mutate()}>
              {addMut.isPending ? <><div className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="ti ti-check" /> Add customer</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
