import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';

const EMPTY = { name:'', name_ar:'', sku:'', barcode:'', selling_price:'', cost_price:'', category_id:'', brand_id:'', description:'', is_active:true };

const getPrice = (p:any, v:any, field:string) => parseFloat(v?.[field] ?? p?.[field] ?? 0) || 0;

function exportCSV(products:any[]) {
  const rows = [['Name','Name AR','SKU','Barcode','Selling Price','Cost Price','Category','Brand']];
  products.forEach((p:any) => {
    const v = p.variants?.[0];
    rows.push([p.name, p.name_ar||'', v?.sku||p.sku||'', v?.barcode||p.barcode||'',
      getPrice(p,v,'selling_price').toString(), getPrice(p,v,'cost_price').toString(),
      p.category_name||'', p.brand_name||'']);
  });
  const csv = rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download = 'products_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

export default function Products() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [stockItem, setStockItem] = useState<any>(null);
  const [stockForm, setStockForm] = useState({ qty:'', warehouse_id:'' });
  const [form, setForm] = useState({...EMPTY});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importing, setImporting] = useState(false);

  const { data:products=[], isLoading } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data) });
  const { data:categories=[] } = useQuery({ queryKey:['categories'], queryFn:()=>api.get('/catalog/categories').then(r=>r.data) });
  const { data:brands=[] } = useQuery({ queryKey:['brands'], queryFn:()=>api.get('/catalog/brands').then(r=>r.data) });
  const { data:inventory=[] } = useQuery({ queryKey:['inventory'], queryFn:()=>api.get('/inventory').then(r=>r.data).catch(()=>[]) });
  const { data:warehouses=[] } = useQuery({ queryKey:['warehouses'], queryFn:()=>api.get('/inventory/warehouses').then(r=>r.data).catch(()=>[]) });

  const stockMap: Record<string,number> = {};
  inventory.forEach((i:any) => {
    const key = i.variant_id || i.product_id;
    if (key) stockMap[key] = (stockMap[key]||0) + (i.quantity||0);
  });
  const getStock = (p:any) => {
    const v = p.variants?.[0];
    return stockMap[v?.id] ?? stockMap[p.id] ?? null;
  };

  const filtered = products.filter((p:any) => {
    if (statusFilter==='active' && !p.is_active) return false;
    if (statusFilter==='inactive' && p.is_active) return false;
    if (catFilter && p.category_id !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.name_ar?.includes(q) ||
        p.variants?.some((v:any)=>v.sku?.toLowerCase().includes(q)||v.barcode?.includes(q));
    }
    return true;
  });

  const set = (k:string, v:any) => setForm(p=>({...p,[k]:v}));

  // ADD product — also creates variant with prices via POST /:id/variants
  const addMut = useMutation({
    mutationFn: async () => {
      const prod = await api.post('/catalog/products', {
        name: form.name, name_ar: form.name_ar||undefined,
        category_id: form.category_id||undefined, brand_id: form.brand_id||undefined,
        description: form.description||undefined, is_active: form.is_active,
      });
      // Create default variant with pricing
      if (prod.data?.id) {
        await api.post('/catalog/products/'+prod.data.id+'/variants', {
          name: 'Default', sku: form.sku||undefined, barcode: form.barcode||undefined,
          selling_price: parseFloat(form.selling_price)||0,
          cost_price: parseFloat(form.cost_price)||0,
          is_active: true,
        }).catch(()=>{});
      }
      return prod.data;
    },
    onSuccess: () => { toast('Product added!','success'); qc.invalidateQueries({queryKey:['products']}); setShowAdd(false); setForm({...EMPTY}); },
    onError: (e:any) => toast(getErr(e),'error'),
  });

  // EDIT product — PATCH (not PUT!) + update variant price
  const editMut = useMutation({
    mutationFn: async () => {
      await api.patch('/catalog/products/'+editItem.id, {
        name: form.name, name_ar: form.name_ar||undefined,
        category_id: form.category_id||undefined, brand_id: form.brand_id||undefined,
        description: form.description||undefined, is_active: form.is_active,
      });
      // Update variant price
      const v = editItem.variants?.[0];
      if (v?.id) {
        await api.patch('/catalog/variants/'+v.id, {
          selling_price: parseFloat(form.selling_price)||0,
          cost_price: parseFloat(form.cost_price)||0,
          sku: form.sku||undefined, barcode: form.barcode||undefined,
        }).catch(()=>{});
      }
    },
    onSuccess: () => { toast('Product updated!','success'); qc.invalidateQueries({queryKey:['products']}); setEditItem(null); },
    onError: (e:any) => toast(getErr(e),'error'),
  });

  // DELETE product
  const deleteMut = useMutation({
    mutationFn: (id:string) => api.delete('/catalog/products/'+id),
    onSuccess: () => { toast('Product deleted','info'); qc.invalidateQueries({queryKey:['products']}); },
    onError: (e:any) => toast(getErr(e),'error'),
  });

  // TOGGLE active
  const toggleMut = useMutation({
    mutationFn: (p:any) => api.patch('/catalog/products/'+p.id, { is_active: !p.is_active }),
    onSuccess: () => { toast('Status updated!','success'); qc.invalidateQueries({queryKey:['products']}); },
    onError: (e:any) => toast(getErr(e),'error'),
  });

  // ADD STOCK — POST /inventory/adjust
  const stockMut = useMutation({
    mutationFn: async () => {
      const v = stockItem.variants?.[0];
      const variantId = v?.id;
      const warehouseId = stockForm.warehouse_id || warehouses[0]?.id;
      if (!variantId) { throw new Error('Product has no variants. Please edit the product first to ensure it has a SKU/variant.'); }
      if (!warehouseId) { throw new Error('No warehouse found. Please check inventory setup.'); }
      return api.post('/inventory/adjust', {
        variant_id: variantId,
        warehouse_id: warehouseId,
        quantity: parseInt(stockForm.qty),
        reason: 'Initial stock entry',
      });
    },
    onSuccess: () => { toast('Stock added to inventory!','success'); qc.invalidateQueries({queryKey:['inventory']}); setStockItem(null); setStockForm({qty:'',warehouse_id:''}); },
    onError: (e:any) => toast(getErr(e),'error'),
  });

  const openEdit = (p:any) => {
    const v = p.variants?.[0];
    setForm({ name:p.name, name_ar:p.name_ar||'', sku:v?.sku||p.sku||'', barcode:v?.barcode||p.barcode||'',
      selling_price:String(getPrice(p,v,'selling_price')||''), cost_price:String(getPrice(p,v,'cost_price')||''),
      category_id:p.category_id||'', brand_id:p.brand_id||'', description:p.description||'', is_active:p.is_active });
    setEditItem(p);
  };

  const handleCSV = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase());
    const idx = (t:string[]) => headers.findIndex(h=>t.some(x=>h.includes(x)));
    const ni=idx(['name']), si=idx(['sku']), pi=idx(['selling','price']), ci=idx(['cost']);
    let ok=0, fail=0;
    for (let i=1;i<lines.length;i++) {
      const c = lines[i].split(',').map(x=>x.replace(/^"|"$/g,'').trim());
      const name = ni>=0?c[ni]:''; if (!name) continue;
      try {
        const prod = await api.post('/catalog/products',{name,is_active:true});
        if (prod.data?.id) {
          await api.post('/catalog/products/'+prod.data.id+'/variants',{
            name:'Default', sku:si>=0?c[si]:undefined,
            selling_price:pi>=0?parseFloat(c[pi])||0:0,
            cost_price:ci>=0?parseFloat(c[ci])||0:0, is_active:true,
          }).catch(()=>{});
        }
        ok++;
      } catch { fail++; }
    }
    setImporting(false);
    qc.invalidateQueries({queryKey:['products']});
    toast('Imported '+ok+' products'+(fail?' ('+fail+' failed)':''), ok>0?'success':'error');
    if (fileRef.current) fileRef.current.value='';
  };

  const margin = (sell:number, cost:number) => {
    if (!sell||!cost) return null;
    return (((sell-cost)/sell)*100).toFixed(0)+'%';
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{fontSize:14,fontWeight:700}}>Products</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>{products.length} products</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt" onClick={()=>exportCSV(products)}><i className="ti ti-download"/> Export CSV</button>
          <button className="bt" onClick={()=>fileRef.current?.click()} disabled={importing}>
            {importing?<><div className="spinner-border spinner-border-sm" style={{width:13,height:13}}/> Importing…</>:<><i className="ti ti-upload"/> Import CSV</>}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleCSV}/>
          <button className="bt bt-p" onClick={()=>{setForm({...EMPTY});setShowAdd(true);}}><i className="ti ti-plus"/> Add product</button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, SKU, barcode…"
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

      {isLoading?<div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div>:(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="tr th" style={{gridTemplateColumns:'1fr 90px 90px 90px 80px 70px 70px 140px'}}>
            {['Product','SKU','Category','Sell price','Cost','Margin','Stock','Actions'].map(h=><span key={h}>{h}</span>)}
          </div>
          {filtered.map((p:any)=>{
            const v=p.variants?.[0];
            const sell=getPrice(p,v,'selling_price');
            const cost=getPrice(p,v,'cost_price');
            const stock=getStock(p);
            const m=margin(sell,cost);
            return (
              <div key={p.id} className="tr" style={{gridTemplateColumns:'1fr 90px 90px 90px 80px 70px 70px 140px',opacity:p.is_active?1:.55}}>
                <span>
                  <div style={{fontWeight:600,fontSize:12}}>{p.name}</div>
                  {p.name_ar&&<div style={{fontSize:10,color:'var(--text-muted-custom)',direction:'rtl',textAlign:'left'}}>{p.name_ar}</div>}
                </span>
                <span style={{fontSize:11,color:'var(--text-secondary)',fontFamily:'monospace'}}>{v?.sku||p.sku||'—'}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{p.category_name||'—'}</span>
                <span style={{fontWeight:700,color:sell>0?'var(--fill-accent)':'var(--text-danger-custom)'}}>SAR {sell.toFixed(2)}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>SAR {cost.toFixed(2)}</span>
                <span style={{fontWeight:600,fontSize:11,color:m&&parseInt(m)>30?'var(--text-success-custom)':m&&parseInt(m)<10?'var(--text-danger-custom)':'var(--text-warning-custom)'}}>{m||'—'}</span>
                <span>
                  {stock===null
                    ?<button className="bt" style={{fontSize:9,padding:'3px 6px'}} onClick={()=>{setStockItem(p);setStockForm({qty:'',warehouse_id:warehouses[0]?.id||''});}}><i className="ti ti-plus"/> Stock</button>
                    :<span className={'bx '+(stock<=0?'r':stock<=5?'a':'g')} style={{fontSize:9}}>{stock<=0?'Out':stock+' pcs'}</span>}
                </span>
                <span style={{display:'flex',gap:4}}>
                  <button className="bt" style={{fontSize:10,padding:'4px 7px'}} title="Edit" onClick={()=>openEdit(p)}><i className="ti ti-edit"/></button>
                  <button className="bt" style={{fontSize:10,padding:'4px 7px'}} title={p.is_active?'Deactivate':'Activate'} onClick={()=>toggleMut.mutate(p)}>
                    <i className={'ti '+(p.is_active?'ti-eye-off':'ti-eye')}/>
                  </button>
                  <button className="bt bt-d" style={{fontSize:10,padding:'4px 7px'}} title="Delete"
                    onClick={()=>{if(window.confirm('Delete "'+p.name+'"?')) deleteMut.mutate(p.id);}}>
                    <i className="ti ti-trash"/>
                  </button>
                </span>
              </div>
            );
          })}
          {filtered.length===0&&!isLoading&&(
            <div style={{padding:40,textAlign:'center',color:'var(--text-muted-custom)'}}>
              <i className="ti ti-shirt" style={{fontSize:40,display:'block',marginBottom:10}}/>
              {search||catFilter?'No products match your search':'No products yet — click Add product'}
            </div>
          )}
        </div>
      )}

      {/* Add stock modal */}
      {stockItem&&(
        <Modal title={'Add stock — '+stockItem.name} onClose={()=>setStockItem(null)}>
          {warehouses.length>1&&(
            <Field label="Warehouse">
              <Sel value={stockForm.warehouse_id} onChange={v=>setStockForm(p=>({...p,warehouse_id:v}))}>
                {warehouses.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
              </Sel>
            </Field>
          )}
          <Field label="Opening stock quantity" required>
            <Inp type="number" value={stockForm.qty} onChange={v=>setStockForm(p=>({...p,qty:v}))} placeholder="e.g. 50"/>
          </Field>
          {stockItem.variants?.length===0&&(
            <div style={{padding:'8px 12px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:'var(--radius)',fontSize:12,color:'#b91c1c',marginBottom:12}}>
              This product has no variants/SKU. Please Edit the product and save it first to auto-create the default variant.
            </div>
          )}
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setStockItem(null)}>Cancel</button>
            <SaveBtn label="Add to inventory" loading={stockMut.isPending} disabled={!stockForm.qty} onClick={()=>stockMut.mutate()}/>
          </div>
        </Modal>
      )}

      {/* Add modal */}
      {showAdd&&(
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
          {form.selling_price&&form.cost_price&&parseFloat(form.selling_price)>0&&(
            <div style={{padding:'8px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',marginBottom:12,fontSize:12,color:'var(--fill-accent)',fontWeight:600}}>
              Margin: {(((parseFloat(form.selling_price)-parseFloat(form.cost_price))/parseFloat(form.selling_price))*100).toFixed(1)}%
              &nbsp;· Profit: SAR {(parseFloat(form.selling_price)-parseFloat(form.cost_price)).toFixed(2)}
            </div>
          )}
          <Row2>
            <Field label="Category"><Sel value={form.category_id} onChange={v=>set('category_id',v)}><option value="">No category</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></Field>
            <Field label="Brand"><Sel value={form.brand_id} onChange={v=>set('brand_id',v)}><option value="">No brand</option>{brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</Sel></Field>
          </Row2>
          <Field label="Description">
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Product description…"
              style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,minHeight:60,resize:'vertical',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
          </Field>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <input type="checkbox" id="active" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} style={{width:16,height:16}}/>
            <label htmlFor="active" style={{fontSize:12,fontWeight:500,cursor:'pointer'}}>Active (visible in POS)</label>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <SaveBtn label="Add product" loading={addMut.isPending} disabled={!form.name||!form.selling_price} onClick={()=>addMut.mutate()}/>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editItem&&(
        <Modal title={'Edit — '+editItem.name} onClose={()=>setEditItem(null)} width={560}>
          <Row2>
            <Field label="Product name (English)" required><Inp value={form.name} onChange={v=>set('name',v)}/></Field>
            <Field label="اسم المنتج (Arabic)"><Inp value={form.name_ar} onChange={v=>set('name_ar',v)} dir="rtl"/></Field>
          </Row2>
          <Row2>
            <Field label="SKU"><Inp value={form.sku} onChange={v=>set('sku',v)}/></Field>
            <Field label="Barcode"><Inp value={form.barcode} onChange={v=>set('barcode',v)}/></Field>
          </Row2>
          <Row2>
            <Field label="Selling price (SAR)" required><Inp type="number" value={form.selling_price} onChange={v=>set('selling_price',v)}/></Field>
            <Field label="Cost price (SAR)"><Inp type="number" value={form.cost_price} onChange={v=>set('cost_price',v)}/></Field>
          </Row2>
          {form.selling_price&&form.cost_price&&parseFloat(form.selling_price)>0&&(
            <div style={{padding:'8px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',marginBottom:12,fontSize:12,color:'var(--fill-accent)',fontWeight:600}}>
              Margin: {(((parseFloat(form.selling_price)-parseFloat(form.cost_price))/parseFloat(form.selling_price))*100).toFixed(1)}%
            </div>
          )}
          <Row2>
            <Field label="Category"><Sel value={form.category_id} onChange={v=>set('category_id',v)}><option value="">No category</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></Field>
            <Field label="Brand"><Sel value={form.brand_id} onChange={v=>set('brand_id',v)}><option value="">No brand</option>{brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</Sel></Field>
          </Row2>
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
