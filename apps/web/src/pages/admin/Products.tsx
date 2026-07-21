
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';

const EMPTY = { name:'', name_ar:'', sku:'', barcode:'', selling_price:'', cost_price:'', category_id:'', brand_id:'', description:'', is_active:true };

function exportCSV(products: any[]) {
  const rows = [['Name','Name AR','SKU','Barcode','Selling Price','Cost Price','Category','Brand','Status']];
  products.forEach(p => {
    p.variants?.forEach((v: any) => {
      rows.push([p.name, p.name_ar||'', v.sku||'', v.barcode||'', v.selling_price||'', v.cost_price||'', p.category_name||'', p.brand_name||'', p.is_active?'Active':'Inactive']);
    });
    if (!p.variants?.length) rows.push([p.name, p.name_ar||'', p.sku||'', p.barcode||'', p.selling_price||'', p.cost_price||'', p.category_name||'', p.brand_name||'', p.is_active?'Active':'Inactive']);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = `products_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

export default function Products() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [form, setForm] = useState({...EMPTY});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ok:number;fail:number}|null>(null);

  const { data:products=[], isLoading } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data) });
  const { data:categories=[] } = useQuery({ queryKey:['categories'], queryFn:()=>api.get('/catalog/categories').then(r=>r.data) });
  const { data:brands=[] } = useQuery({ queryKey:['brands'], queryFn:()=>api.get('/catalog/brands').then(r=>r.data) });
  const { data:inventory=[] } = useQuery({ queryKey:['inventory'], queryFn:()=>api.get('/inventory').then(r=>r.data).catch(()=>[]) });

  const stockMap: Record<string,number> = {};
  inventory.forEach((i:any) => { stockMap[i.variant_id || i.product_id] = (stockMap[i.variant_id || i.product_id]||0) + (i.quantity||0); });

  const filtered = products.filter((p:any) => {
    if (statusFilter==='active' && !p.is_active) return false;
    if (statusFilter==='inactive' && p.is_active) return false;
    if (catFilter && p.category_id !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.name_ar?.includes(q) ||
        p.variants?.some((v:any) => v.sku?.toLowerCase().includes(q) || v.barcode?.includes(q));
    }
    return true;
  });

  const set = (k:string, v:any) => setForm(p=>({...p,[k]:v}));

  const addMut = useMutation({
    mutationFn: () => api.post('/catalog/products', {
      name: form.name, name_ar: form.name_ar || undefined,
      sku: form.sku || undefined, barcode: form.barcode || undefined,
      selling_price: parseFloat(form.selling_price), cost_price: parseFloat(form.cost_price)||0,
      category_id: form.category_id || undefined, brand_id: form.brand_id || undefined,
      description: form.description || undefined, is_active: form.is_active,
    }),
    onSuccess: () => { toast('Product added!', 'success'); qc.invalidateQueries({queryKey:['products']}); setShowAdd(false); setForm({...EMPTY}); },
    onError: e => toast(getErr(e), 'error'),
  });

  const editMut = useMutation({
    mutationFn: () => api.put(`/catalog/products/${editItem.id}`, {
      name: form.name, name_ar: form.name_ar || undefined,
      selling_price: parseFloat(form.selling_price), cost_price: parseFloat(form.cost_price)||0,
      category_id: form.category_id || undefined, brand_id: form.brand_id || undefined,
      description: form.description || undefined, is_active: form.is_active,
    }),
    onSuccess: () => { toast('Product updated!', 'success'); qc.invalidateQueries({queryKey:['products']}); setEditItem(null); },
    onError: e => toast(getErr(e), 'error'),
  });

  const toggleMut = useMutation({
    mutationFn: (p:any) => api.put(`/catalog/products/${p.id}`, { is_active: !p.is_active }),
    onSuccess: () => { toast('Status updated!', 'success'); qc.invalidateQueries({queryKey:['products']}); },
    onError: e => toast(getErr(e), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id:string) => api.delete(`/catalog/products/${id}`),
    onSuccess: () => { toast('Product deleted', 'info'); qc.invalidateQueries({queryKey:['products']}); setDetailItem(null); },
    onError: e => toast(getErr(e), 'error'),
  });

  const openEdit = (p:any) => {
    const v = p.variants?.[0];
    setForm({ name:p.name, name_ar:p.name_ar||'', sku:v?.sku||'', barcode:v?.barcode||'',
      selling_price:v?.selling_price||p.selling_price||'', cost_price:v?.cost_price||p.cost_price||'',
      category_id:p.category_id||'', brand_id:p.brand_id||'', description:p.description||'', is_active:p.is_active });
    setEditItem(p);
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase());
    const nameIdx = headers.findIndex(h=>h.includes('name') && !h.includes('ar'));
    const nameArIdx = headers.findIndex(h=>h.includes('name_ar')||h.includes('name ar'));
    const skuIdx = headers.findIndex(h=>h==='sku');
    const priceIdx = headers.findIndex(h=>h.includes('selling'));
    const costIdx = headers.findIndex(h=>h.includes('cost'));
    let ok=0, fail=0;
    for (let i=1; i<lines.length; i++) {
      const cols = lines[i].split(',').map(c=>c.replace(/^"|"$/g,'').trim());
      const name = cols[nameIdx]; if (!name) continue;
      try {
        await api.post('/catalog/products', {
          name, name_ar: nameArIdx>=0?cols[nameArIdx]:undefined,
          sku: skuIdx>=0?cols[skuIdx]:undefined,
          selling_price: priceIdx>=0?parseFloat(cols[priceIdx])||0:0,
          cost_price: costIdx>=0?parseFloat(cols[costIdx])||0:0,
          is_active: true,
        });
        ok++;
      } catch { fail++; }
    }
    setImporting(false); setImportResult({ok,fail});
    qc.invalidateQueries({queryKey:['products']});
    toast(`Imported ${ok} products${fail?' ('+fail+' failed)':''}`, ok>0?'success':'error');
    if (fileRef.current) fileRef.current.value = '';
  };

  const margin = (p:any) => {
    const v = p.variants?.[0];
    const sell = parseFloat(v?.selling_price||p.selling_price||0);
    const cost = parseFloat(v?.cost_price||p.cost_price||0);
    if (!sell || !cost) return null;
    return (((sell-cost)/sell)*100).toFixed(0)+'%';
  };

  const totalValue = products.reduce((s:number,p:any)=>{
    const v = p.variants?.[0];
    const stock = stockMap[v?.id||p.id]||0;
    return s + stock * parseFloat(v?.selling_price||p.selling_price||0);
  },0);

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{fontSize:14,fontWeight:700}}>Products</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>{products.length} products · Retail value SAR {totalValue.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt" onClick={()=>exportCSV(products)}><i className="ti ti-download"/> Export CSV</button>
          <button className="bt" onClick={()=>fileRef.current?.click()} disabled={importing}>
            {importing ? <><div className="spinner-border spinner-border-sm" style={{width:13,height:13}}/> Importing…</> : <><i className="ti ti-upload"/> Import CSV</>}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleCSV}/>
          <button className="bt bt-p" onClick={()=>{setForm({...EMPTY});setShowAdd(true);}}><i className="ti ti-plus"/> Add product</button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div style={{padding:'10px 14px',background:importResult.fail?'#fef2f2':'#f0fdf4',border:`1px solid ${importResult.fail?'#fca5a5':'#86efac'}`,borderRadius:'var(--radius)',marginBottom:12,display:'flex',alignItems:'center',gap:10,fontSize:12}}>
          <i className={`ti ${importResult.fail?'ti-alert-triangle':'ti-circle-check'}`} style={{fontSize:16}}/>
          <span><strong>{importResult.ok}</strong> products imported successfully{importResult.fail>0 && <>, <strong>{importResult.fail}</strong> rows failed (missing required fields or duplicate SKU)</>}</span>
          <button style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--text-secondary)'}} onClick={()=>setImportResult(null)}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search name, SKU, barcode…"
          style={{width:220,padding:'6px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12}}/>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          style={{padding:'6px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)'}}>
          <option value="">All categories</option>
          {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {['all','active','inactive'].map(v=>(
          <button key={v} className={'snb'+(statusFilter===v?' on':'')} onClick={()=>setStatusFilter(v)} style={{textTransform:'capitalize'}}>{v==='all'?'All status':v}</button>
        ))}
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-secondary)'}}>{filtered.length} of {products.length} products</span>
      </div>

      {/* Table */}
      {isLoading ? <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div> : (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="tr th" style={{gridTemplateColumns:'1fr 90px 90px 80px 75px 75px 80px 110px'}}>
            {['Product','SKU','Barcode','Category','Sell price','Cost','Margin','Actions'].map(h=><span key={h}>{h}</span>)}
          </div>
          {filtered.map((p:any)=>{
            const v = p.variants?.[0];
            const stock = stockMap[v?.id||p.id];
            const m = margin(p);
            return (
              <div key={p.id} className="tr" style={{gridTemplateColumns:'1fr 90px 90px 80px 75px 75px 80px 110px', opacity:p.is_active?1:.6}}>
                <span style={{cursor:'pointer'}} onClick={()=>setDetailItem(p)}>
                  <div style={{fontWeight:600,fontSize:12}}>{p.name}</div>
                  <div style={{fontSize:10,color:'var(--text-muted-custom)',direction:'rtl',textAlign:'left'}}>{p.name_ar}</div>
                  {stock!=null && <span className={'bx '+(stock<=0?'r':stock<=5?'a':'g')} style={{fontSize:9,marginTop:2}}>
                    {stock<=0?'Out of stock':stock<=5?'Low: '+stock+' left':stock+' in stock'}
                  </span>}
                </span>
                <span style={{fontSize:11,color:'var(--text-secondary)',fontFamily:'monospace'}}>{v?.sku||p.sku||'—'}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)',fontFamily:'monospace'}}>{v?.barcode||p.barcode||'—'}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.category_name||'—'}</span>
                <span style={{fontWeight:700,color:'var(--fill-accent)'}}>SAR {parseFloat(v?.selling_price||p.selling_price||0).toFixed(2)}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>SAR {parseFloat(v?.cost_price||p.cost_price||0).toFixed(2)}</span>
                <span style={{fontWeight:600,color:m&&parseInt(m)>30?'var(--text-success-custom)':m&&parseInt(m)<10?'var(--text-danger-custom)':'var(--text-warning-custom)'}}>{m||'—'}</span>
                <span style={{display:'flex',gap:5}}>
                  <button className="bt" style={{fontSize:10,padding:'4px 8px'}} onClick={()=>openEdit(p)}><i className="ti ti-edit"/></button>
                  <button className="bt" style={{fontSize:10,padding:'4px 8px'}} title={p.is_active?'Deactivate':'Activate'} onClick={()=>toggleMut.mutate(p)}>
                    <i className={`ti ${p.is_active?'ti-eye-off':'ti-eye'}`}/>
                  </button>
                </span>
              </div>
            );
          })}
          {filtered.length===0 && !isLoading && (
            <div style={{padding:40,textAlign:'center',color:'var(--text-muted-custom)'}}>
              <i className="ti ti-shirt" style={{fontSize:40,display:'block',marginBottom:10}}/>
              {search||catFilter?'No products match your search':'No products yet — add your first product or import a CSV'}
            </div>
          )}
        </div>
      )}

      {/* Product detail side panel */}
      {detailItem && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'stretch',justifyContent:'flex-end'}}
          onClick={e=>e.target===e.currentTarget&&setDetailItem(null)}>
          <div style={{width:380,background:'var(--surface-2)',overflow:'auto',padding:24,boxShadow:'-8px 0 32px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:700}}>Product details</div>
              <button onClick={()=>setDetailItem(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text-secondary)'}}>×</button>
            </div>
            <div style={{width:80,height:80,background:'var(--surface-1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
              <i className="ti ti-shirt" style={{fontSize:36,color:'var(--text-secondary)'}}/>
            </div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:2}}>{detailItem.name}</div>
            {detailItem.name_ar && <div style={{fontSize:13,color:'var(--text-secondary)',direction:'rtl',textAlign:'left',marginBottom:10}}>{detailItem.name_ar}</div>}
            <span className={'bx '+(detailItem.is_active?'g':'r')} style={{marginBottom:14,display:'inline-block'}}>{detailItem.is_active?'Active':'Inactive'}</span>
            {[['Category',detailItem.category_name||'—'],['Brand',detailItem.brand_name||'—'],['SKU',detailItem.variants?.[0]?.sku||detailItem.sku||'—'],['Barcode',detailItem.variants?.[0]?.barcode||detailItem.barcode||'—']].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border-color)',fontSize:12}}>
                <span style={{color:'var(--text-secondary)'}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,margin:'16px 0',padding:12,background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
              {[['Sell price','SAR '+(parseFloat(detailItem.variants?.[0]?.selling_price||detailItem.selling_price||0)).toFixed(2),'var(--fill-accent)'],
                ['Cost price','SAR '+(parseFloat(detailItem.variants?.[0]?.cost_price||detailItem.cost_price||0)).toFixed(2),'var(--text-secondary)'],
                ['Margin',margin(detailItem)||'—','var(--text-success-custom)']].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontSize:14,fontWeight:800,color:c as string}}>{v}</div>
                  <div style={{fontSize:9,color:'var(--text-muted-custom)',marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            {detailItem.description && <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:16,padding:'10px 12px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>{detailItem.description}</div>}
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button className="bt" style={{flex:1,justifyContent:'center'}} onClick={()=>{openEdit(detailItem);setDetailItem(null);}}><i className="ti ti-edit"/> Edit</button>
              <button className="bt bt-d" style={{flex:1,justifyContent:'center'}} onClick={()=>{ if(confirm('Delete this product?')) deleteMut.mutate(detailItem.id); }}>
                <i className="ti ti-trash"/> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add new product" onClose={()=>setShowAdd(false)} width={560}>
          <Row2>
            <Field label="Product name (English)" required><Inp value={form.name} onChange={v=>set('name',v)} placeholder="Casual T-Shirt"/></Field>
            <Field label="اسم المنتج (Arabic)"><Inp value={form.name_ar} onChange={v=>set('name_ar',v)} placeholder="تيشيرت كاجوال" dir="rtl"/></Field>
          </Row2>
          <Row2>
            <Field label="SKU"><Inp value={form.sku} onChange={v=>set('sku',v)} placeholder="NUX-001"/></Field>
            <Field label="Barcode"><Inp value={form.barcode} onChange={v=>set('barcode',v)} placeholder="6290xxx"/></Field>
          </Row2>
          <Row2>
            <Field label="Selling price (SAR)" required><Inp type="number" value={form.selling_price} onChange={v=>set('selling_price',v)} placeholder="199.00"/></Field>
            <Field label="Cost price (SAR)"><Inp type="number" value={form.cost_price} onChange={v=>set('cost_price',v)} placeholder="95.00"/></Field>
          </Row2>
          {form.selling_price && form.cost_price && (
            <div style={{padding:'8px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',marginBottom:12,fontSize:12,color:'var(--fill-accent)',fontWeight:600}}>
              Margin: {(((parseFloat(form.selling_price)-parseFloat(form.cost_price))/parseFloat(form.selling_price))*100).toFixed(1)}%
              · Profit per unit: SAR {(parseFloat(form.selling_price)-parseFloat(form.cost_price)).toFixed(2)}
            </div>
          )}
          <Row2>
            <Field label="Category">
              <Sel value={form.category_id} onChange={v=>set('category_id',v)}>
                <option value="">No category</option>
                {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </Field>
            <Field label="Brand">
              <Sel value={form.brand_id} onChange={v=>set('brand_id',v)}>
                <option value="">No brand</option>
                {brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
              </Sel>
            </Field>
          </Row2>
          <Field label="Description">
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Product description…"
              style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,minHeight:60,resize:'vertical',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
          </Field>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <input type="checkbox" id="active" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} style={{width:16,height:16}}/>
            <label htmlFor="active" style={{fontSize:12,fontWeight:500,cursor:'pointer'}}>Active (visible in POS and website)</label>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <SaveBtn label="Add product" loading={addMut.isPending} disabled={!form.name||!form.selling_price} onClick={()=>addMut.mutate()}/>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editItem && (
        <Modal title={`Edit — ${editItem.name}`} onClose={()=>setEditItem(null)} width={560}>
          <Row2>
            <Field label="Product name (English)" required><Inp value={form.name} onChange={v=>set('name',v)} placeholder="Casual T-Shirt"/></Field>
            <Field label="اسم المنتج (Arabic)"><Inp value={form.name_ar} onChange={v=>set('name_ar',v)} placeholder="تيشيرت كاجوال" dir="rtl"/></Field>
          </Row2>
          <Row2>
            <Field label="Selling price (SAR)" required><Inp type="number" value={form.selling_price} onChange={v=>set('selling_price',v)} placeholder="199.00"/></Field>
            <Field label="Cost price (SAR)"><Inp type="number" value={form.cost_price} onChange={v=>set('cost_price',v)} placeholder="95.00"/></Field>
          </Row2>
          {form.selling_price && form.cost_price && (
            <div style={{padding:'8px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',marginBottom:12,fontSize:12,color:'var(--fill-accent)',fontWeight:600}}>
              Margin: {(((parseFloat(form.selling_price)-parseFloat(form.cost_price))/parseFloat(form.selling_price))*100).toFixed(1)}%
            </div>
          )}
          <Row2>
            <Field label="Category">
              <Sel value={form.category_id} onChange={v=>set('category_id',v)}>
                <option value="">No category</option>
                {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </Field>
            <Field label="Brand">
              <Sel value={form.brand_id} onChange={v=>set('brand_id',v)}>
                <option value="">No brand</option>
                {brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
              </Sel>
            </Field>
          </Row2>
          <Field label="Description">
            <textarea value={form.description} onChange={e=>set('description',e.target.value)}
              style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,minHeight:60,resize:'vertical',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
          </Field>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <input type="checkbox" id="edit-active" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} style={{width:16,height:16}}/>
            <label htmlFor="edit-active" style={{fontSize:12,fontWeight:500,cursor:'pointer'}}>Active</label>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setEditItem(null)}>Cancel</button>
            <SaveBtn label="Save changes" loading={editMut.isPending} disabled={!form.name||!form.selling_price} onClick={()=>editMut.mutate()}/>
          </div>
        </Modal>
      )}
    </div>
  );
}
