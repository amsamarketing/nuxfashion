
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import Modal, { Field, Row } from '../../components/Modal';

export default function Products() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', name_ar:'', sku:'', barcode:'', selling_price:'', cost_price:'', category_id:'', brand_id:'' });

  const { data:products=[], isLoading } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data) });
  const { data:categories=[] } = useQuery({ queryKey:['categories'], queryFn:()=>api.get('/catalog/categories').then(r=>r.data) });
  const { data:brands=[] } = useQuery({ queryKey:['brands'], queryFn:()=>api.get('/catalog/brands').then(r=>r.data) });

  const addMut = useMutation({
    mutationFn: () => api.post('/catalog/products', {
      ...form,
      selling_price: parseFloat(form.selling_price),
      cost_price: parseFloat(form.cost_price||'0'),
    }),
    onSuccess: () => {
      toast('Product created successfully!', 'success');
      qc.invalidateQueries({ queryKey:['products'] });
      setShowAdd(false);
      setForm({ name:'', name_ar:'', sku:'', barcode:'', selling_price:'', cost_price:'', category_id:'', brand_id:'' });
    },
    onError: () => toast('Failed to create product — check all fields', 'error')
  });

  const set = (k: string, v: string) => setForm(p=>({...p,[k]:v}));

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>Product catalog</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{products.length} products</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt"><i className="ti ti-upload" /> Import CSV</button>
          <button className="bt"><i className="ti ti-download" /> Export</button>
          <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus" /> Add product</button>
        </div>
      </div>

      {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div> : (
        <div className="row g-3">
          {products.map((p:any)=>(
            <div key={p.id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100">
                <div style={{ width:'100%', height:80, background:'var(--surface-1)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                  <i className="ti ti-shirt" style={{ fontSize:36, color:'var(--text-muted-custom)' }} />
                </div>
                <div style={{ fontWeight:700, marginBottom:2 }}>{p.name}</div>
                {p.name_ar && <div style={{ fontSize:11, color:'var(--text-secondary)', direction:'rtl', marginBottom:4 }}>{p.name_ar}</div>}
                <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:8 }}>
                  {p.category_name||'No category'} · {p.brand_name||'No brand'} · {p.variants?.length||0} variants
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span style={{ fontSize:18, fontWeight:800, color:'var(--fill-accent)' }}>
                    SAR {parseFloat(p.variants?.[0]?.selling_price||0).toFixed(2)}
                  </span>
                  <span className={'bx '+(p.is_active?'g':'r')}>{p.is_active?'Active':'Inactive'}</span>
                </div>
                <div className="d-flex gap-2 mt-auto">
                  <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-edit" /> Edit</button>
                  <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-package" /> Stock</button>
                  <button className="bt" style={{ flex:1, justifyContent:'center' }}><i className="ti ti-chart-bar" /> Sales</button>
                </div>
              </div>
            </div>
          ))}
          {products.length===0 && (
            <div className="col-12 text-center py-5" style={{ color:'var(--text-muted-custom)' }}>
              <i className="ti ti-tag" style={{ fontSize:48, display:'block', marginBottom:12 }} />
              <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>No products yet</div>
              <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus" /> Add your first product</button>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <Modal title="Add new product" onClose={()=>setShowAdd(false)}>
          <Row>
            <Field label="Product name (English) *">
              <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Nike Air Max 270" />
            </Field>
            <Field label="Product name (Arabic)">
              <input type="text" value={form.name_ar} onChange={e=>set('name_ar',e.target.value)} placeholder="اسم المنتج بالعربية" style={{ direction:'rtl' }} />
            </Field>
          </Row>
          <Row>
            <Field label="SKU / Product code *">
              <input type="text" value={form.sku} onChange={e=>set('sku',e.target.value)} placeholder="e.g. NK-AM270-001" />
            </Field>
            <Field label="Barcode (optional)">
              <input type="text" value={form.barcode} onChange={e=>set('barcode',e.target.value)} placeholder="Scan or enter barcode" />
            </Field>
          </Row>
          <Row>
            <Field label="Selling price (SAR) *">
              <input type="number" value={form.selling_price} onChange={e=>set('selling_price',e.target.value)} placeholder="0.00" step="0.01" />
            </Field>
            <Field label="Cost price (SAR)">
              <input type="number" value={form.cost_price} onChange={e=>set('cost_price',e.target.value)} placeholder="0.00" step="0.01" />
            </Field>
          </Row>
          <Row>
            <Field label="Category">
              <select value={form.category_id} onChange={e=>set('category_id',e.target.value)}
                style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:'var(--surface-2)', fontSize:12 }}>
                <option value="">Select category</option>
                {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Brand">
              <select value={form.brand_id} onChange={e=>set('brand_id',e.target.value)}
                style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:'var(--surface-2)', fontSize:12 }}>
                <option value="">Select brand</option>
                {brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </Row>
          <div style={{ padding:'12px', background:'var(--bg-accent)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text-accent)', marginBottom:14 }}>
            <i className="ti ti-info-circle" /> After creating the product, go to <strong>Inventory</strong> to add stock quantities per location.
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="bt bt-p" disabled={!form.name||!form.selling_price||addMut.isPending} onClick={()=>addMut.mutate()}>
              {addMut.isPending ? <><div className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="ti ti-check" /> Create product</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
