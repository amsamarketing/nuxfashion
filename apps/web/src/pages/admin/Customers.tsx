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
  const [editCust, setEditCust] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [form, setForm] = useState({...EMPTY});
  const [editForm, setEditForm] = useState({...EMPTY});
  const [search, setSearch] = useState('');

  const { data:customers=[], isLoading } = useQuery<any[]>({
    queryKey:['customers'],
    queryFn:()=>api.get('/customers').then(r=>Array.isArray(r.data)?r.data:[])
  });

  const { data:custOrders=[] } = useQuery<any[]>({
    queryKey:['customer-orders', selected?.id],
    queryFn:()=>api.get('/sales/orders').then(r=>(Array.isArray(r.data)?r.data:[]).filter((o:any)=>o.customer_id===selected?.id)),
    enabled:!!selected&&showOrders
  });

  const addMut = useMutation({
    mutationFn:()=>api.post('/customers',{ name:form.name, phone:form.phone||undefined, email:form.email||undefined, date_of_birth:form.date_of_birth||undefined }),
    onSuccess:()=>{ toast('Customer added!','success'); qc.invalidateQueries({queryKey:['customers']}); setShowAdd(false); setForm({...EMPTY}); },
    onError:(e:any)=>toast(getErr(e),'error')
  });

  const editMut = useMutation({
    mutationFn:()=>api.patch('/customers/'+editCust.id,{ name:editForm.name, phone:editForm.phone||undefined, email:editForm.email||undefined, date_of_birth:editForm.date_of_birth||undefined }),
    onSuccess:(res)=>{ toast('Customer updated!','success'); qc.invalidateQueries({queryKey:['customers']}); setSelected(res.data); setEditCust(null); },
    onError:(e:any)=>toast(getErr(e),'error')
  });

  const deleteMut = useMutation({
    mutationFn:(id:string)=>api.delete('/customers/'+id),
    onSuccess:()=>{ toast('Customer deleted','success'); qc.invalidateQueries({queryKey:['customers']}); setSelected(null); },
    onError:(e:any)=>toast(getErr(e),'error')
  });

  const tc:Record<string,string>={bronze:'n',silver:'n',gold:'b',vip:'b',platinum:'b'};
  const set=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const eSet=(k:string,v:string)=>setEditForm(p=>({...p,[k]:v}));
  const shown = customers.filter((c:any)=>!search||c.name?.toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search));

  const openEdit=(c:any)=>{ setEditCust(c); setEditForm({name:c.name||'',phone:c.phone||'',email:c.email||'',date_of_birth:c.date_of_birth||''}); };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:12 }}>
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div style={{ fontSize:14,fontWeight:700 }}>Customers</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{customers.length} registered</div>
          </div>
          <div className="d-flex gap-2">
            <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name or phone…" style={{ width:180,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',fontSize:12 }} />
            <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus" /> Add customer</button>
          </div>
        </div>

        {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div> : (
          <div className="card" style={{ padding:0,overflow:'hidden' }}>
            <div className="tr th" style={{ gridTemplateColumns:'1fr 130px 90px 70px 80px' }}>
              {['Customer','Phone','Tier','Points','Joined'].map(h=><span key={h}>{h}</span>)}
            </div>
            {shown.map((c:any)=>(
              <div key={c.id} className="tr" style={{ gridTemplateColumns:'1fr 130px 90px 70px 80px',cursor:'pointer',background:selected?.id===c.id?'var(--bg-accent)':'' }}
                onClick={()=>{ setSelected(c); setShowOrders(false); }}>
                <span><div style={{ fontWeight:600 }}>{c.name}</div><div style={{ fontSize:10,color:'var(--text-secondary)' }}>{c.email||'No email'}</div></span>
                <span style={{ fontSize:11,color:'var(--text-secondary)' }}>{c.phone||'—'}</span>
                <span><span className={'bx '+(tc[c.loyalty_tier]||'n')} style={{ textTransform:'capitalize',fontSize:10 }}>{c.loyalty_tier||'bronze'}</span></span>
                <span style={{ fontWeight:700,color:'var(--fill-accent)' }}>{c.loyalty_points||0}</span>
                <span style={{ fontSize:10,color:'var(--text-secondary)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {shown.length===0&&<div style={{ padding:32,textAlign:'center',color:'var(--text-secondary)' }}>
              {search?'No customers match your search':'No customers yet — add your first'}
            </div>}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="card" style={{ alignSelf:'start' }}>
        {selected ? (<>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
            <div style={{ width:46,height:46,borderRadius:'50%',background:'var(--bg-accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'var(--fill-accent)',flexShrink:0 }}>
              {selected.name.slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14,fontWeight:700 }}>{selected.name}</div>
              <span className={'bx '+(tc[selected.loyalty_tier]||'n')} style={{ textTransform:'capitalize',fontSize:10 }}>{selected.loyalty_tier||'bronze'} member</span>
            </div>
            <button onClick={()=>setSelected(null)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--text-secondary)' }}>×</button>
          </div>

          {!showOrders ? (<>
            {[['Phone',selected.phone||'—'],['Email',selected.email||'—'],['Points',(selected.loyalty_points||0)+' pts'],['DOB',selected.date_of_birth||'—'],['Member since',new Date(selected.created_at).toLocaleDateString()]].map(([l,v])=>(
              <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border)',fontSize:12 }}>
                <span style={{ color:'var(--text-secondary)' }}>{l}</span>
                <span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
            <div className="d-flex gap-2 mt-3">
              <button className="bt" style={{ flex:1,justifyContent:'center' }} onClick={()=>openEdit(selected)}><i className="ti ti-edit" /> Edit</button>
              <button className="bt" style={{ flex:1,justifyContent:'center' }} onClick={()=>setShowOrders(true)}><i className="ti ti-history" /> Orders</button>
            </div>
            <button className="bt" style={{ width:'100%',justifyContent:'center',marginTop:6,color:'#e74c3c',borderColor:'#e74c3c' }}
              onClick={()=>{ if(confirm('Delete this customer?')) deleteMut.mutate(selected.id); }}>
              <i className="ti ti-trash" /> Delete
            </button>
          </>) : (<>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <button className="bt" onClick={()=>setShowOrders(false)}><i className="ti ti-arrow-left" /></button>
              <span style={{ fontSize:12,fontWeight:600 }}>Purchase history</span>
            </div>
            {custOrders.length===0 ? <div style={{ fontSize:12,color:'var(--text-secondary)',padding:'12px 0' }}>No orders found</div>
            : custOrders.map((o:any)=>(
              <div key={o.id} style={{ padding:'8px 0',borderBottom:'0.5px solid var(--border)',fontSize:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between' }}>
                  <span style={{ fontWeight:600,color:'var(--fill-accent)' }}>#{o.order_number}</span>
                  <span style={{ fontWeight:700 }}>SAR {parseFloat(o.total||0).toFixed(2)}</span>
                </div>
                <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{new Date(o.created_at).toLocaleDateString()} · {o.status}</div>
              </div>
            ))}
          </>)}
        </>) : (
          <div style={{ textAlign:'center',padding:'32px 0',color:'var(--text-secondary)' }}>
            <i className="ti ti-user" style={{ fontSize:32,display:'block',marginBottom:8 }} />
            Click a customer to view profile
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd&&(
        <Modal title="Add new customer" onClose={()=>setShowAdd(false)}>
          <Field label="Full name" required><Inp value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Sara Abdullah" /></Field>
          <Row2>
            <Field label="Mobile"><Inp value={form.phone} onChange={v=>set('phone',v)} placeholder="+966 5x xxx xxxx" /></Field>
            <Field label="Email"><Inp type="email" value={form.email} onChange={v=>set('email',v)} placeholder="email@example.com" /></Field>
          </Row2>
          <Field label="Date of birth"><Inp type="date" value={form.date_of_birth} onChange={v=>set('date_of_birth',v)} /></Field>
          <div style={{ padding:'10px 12px',background:'#f0faf0',borderRadius:'var(--radius)',fontSize:12,color:'#27ae60',marginBottom:14 }}>
            <i className="ti ti-star" /> Auto-enrolled in Bronze loyalty tier
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <SaveBtn label="Add customer" loading={addMut.isPending} disabled={!form.name} onClick={()=>addMut.mutate()} />
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editCust&&(
        <Modal title={`Edit — ${editCust.name}`} onClose={()=>setEditCust(null)}>
          <Field label="Full name" required><Inp value={editForm.name} onChange={v=>eSet('name',v)} /></Field>
          <Row2>
            <Field label="Mobile"><Inp value={editForm.phone} onChange={v=>eSet('phone',v)} /></Field>
            <Field label="Email"><Inp type="email" value={editForm.email} onChange={v=>eSet('email',v)} /></Field>
          </Row2>
          <Field label="Date of birth"><Inp type="date" value={editForm.date_of_birth} onChange={v=>eSet('date_of_birth',v)} /></Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setEditCust(null)}>Cancel</button>
            <SaveBtn label="Save changes" loading={editMut.isPending} disabled={!editForm.name} onClick={()=>editMut.mutate()} />
          </div>
        </Modal>
      )}
    </div>
  );
}
