
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, SaveBtn } from '../../components/Modal';

const EMPTY = { name:'', phone:'', email:'', date_of_birth:'' };
export default function Customers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({...EMPTY});
  const [search, setSearch] = useState('');

  const { data:customers=[], isLoading } = useQuery({ queryKey:['customers'], queryFn:()=>api.get('/customers').then(r=>r.data) });

  const addMut = useMutation({
    mutationFn: () => api.post('/customers', {
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      date_of_birth: form.date_of_birth || undefined,
    }),
    onSuccess: () => {
      toast('Customer added!', 'success');
      qc.invalidateQueries({ queryKey:['customers'] });
      setShowAdd(false); setForm({...EMPTY});
    },
    onError: e => toast(getErr(e), 'error')
  });

  const tc:Record<string,string>={bronze:'n',silver:'n',gold:'b',vip:'b',platinum:'b'};
  const set=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const shown = customers.filter((c:any)=>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:12 }}>
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>Customers</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{customers.length} registered</div>
          </div>
          <div className="d-flex gap-2">
            <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name or phone…" style={{ width:180, padding:'6px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', fontSize:12 }} />
            <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus" /> Add customer</button>
          </div>
        </div>
        {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div> : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div className="tr th" style={{ gridTemplateColumns:'1fr 120px 90px 70px 80px' }}>
              {['Customer','Phone','Tier','Points','Joined'].map(h=><span key={h}>{h}</span>)}
            </div>
            {shown.map((c:any)=>(
              <div key={c.id} className="tr" style={{ gridTemplateColumns:'1fr 120px 90px 70px 80px', cursor:'pointer', background:selected?.id===c.id?'var(--bg-accent)':'' }}
                onClick={()=>setSelected(c)}>
                <span><div style={{ fontWeight:600 }}>{c.name}</div><div style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{c.email||'No email'}</div></span>
                <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{c.phone||'—'}</span>
                <span><span className={'bx '+(tc[c.loyalty_tier]||'n')} style={{ textTransform:'capitalize' }}>{c.loyalty_tier}</span></span>
                <span style={{ fontWeight:700, color:'var(--fill-accent)' }}>{c.loyalty_points}</span>
                <span style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {shown.length===0 && <div style={{ padding:32, textAlign:'center', color:'var(--text-muted-custom)' }}>
              {search ? 'No customers match your search' : 'No customers yet — add your first customer'}
            </div>}
          </div>
        )}
      </div>

      <div className="card" style={{ alignSelf:'start' }}>
        {selected ? (<>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ width:46, height:46, borderRadius:'50%', background:'var(--bg-accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'var(--fill-accent)', flexShrink:0 }}>
              {selected.name.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>{selected.name}</div>
              <span className={'bx '+(tc[selected.loyalty_tier]||'n')} style={{ textTransform:'capitalize', fontSize:10 }}>{selected.loyalty_tier} member</span>
            </div>
          </div>
          {[['Phone',selected.phone||'—'],['Email',selected.email||'—'],['Points',selected.loyalty_points+' pts'],['DOB',selected.date_of_birth||'—'],['Member since',new Date(selected.created_at).toLocaleDateString()]].map(([l,v])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-color)', fontSize:12 }}>
              <span style={{ color:'var(--text-secondary)' }}>{l}</span>
              <span style={{ fontWeight:500 }}>{v}</span>
            </div>
          ))}
          <div className="d-flex gap-2 mt-3">
            <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-edit" /> Edit</button>
            <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-history" /> Orders</button>
          </div>
        </>) : (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted-custom)' }}>
            <i className="ti ti-user" style={{ fontSize:32, display:'block', marginBottom:8 }} />
            Click a customer to view profile
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add new customer" onClose={()=>setShowAdd(false)}>
          <Field label="Full name" required>
            <Inp value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Sara Abdullah" />
          </Field>
          <Row2>
            <Field label="Mobile number">
              <Inp value={form.phone} onChange={v=>set('phone',v)} placeholder="+966 5x xxx xxxx" />
            </Field>
            <Field label="Email address">
              <Inp type="email" value={form.email} onChange={v=>set('email',v)} placeholder="email@example.com" />
            </Field>
          </Row2>
          <Field label="Date of birth (for birthday discount)">
            <Inp type="date" value={form.date_of_birth} onChange={v=>set('date_of_birth',v)} />
          </Field>
          <div style={{ padding:'10px 12px', background:'var(--bg-success-custom)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text-success-custom)', marginBottom:14 }}>
            <i className="ti ti-star" /> Customer will be auto-enrolled in Bronze loyalty tier
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <SaveBtn label="Add customer" loading={addMut.isPending} disabled={!form.name} onClick={()=>addMut.mutate()} />
          </div>
        </Modal>
      )}
    </div>
  );
}
