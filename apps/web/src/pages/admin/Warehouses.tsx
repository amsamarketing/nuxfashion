import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, SaveBtn } from '../../components/Modal';

export default function Warehouses() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [receiveWH, setReceiveWH] = useState<any>(null);
  const [transferWH, setTransferWH] = useState<any>(null);
  const [selectedWH, setSelectedWH] = useState<any>(null);
  const [addForm, setAddForm] = useState({ name:'', location:'' });
  const [receiveForm, setReceiveForm] = useState({ product_id:'', variant_id:'', qty:'' });
  const [transferForm, setTransferForm] = useState({ to_warehouse_id:'', variant_id:'', qty:'' });

  const { data:warehouses=[], isLoading } = useQuery({
    queryKey:['warehouses'], queryFn:()=>api.get('/inventory/warehouses').then(r=>r.data).catch(()=>[])
  });
  const { data:products=[] } = useQuery({
    queryKey:['products'], queryFn:()=>api.get('/catalog/products').then(r=>r.data)
  });
  const { data:whStock=[] } = useQuery({
    queryKey:['wh-stock', selectedWH?.id],
    queryFn:()=> selectedWH ? api.get('/inventory/warehouses/'+selectedWH.id+'/stock').then(r=>r.data).catch(()=>[]) : Promise.resolve([]),
    enabled: !!selectedWH,
  });
  const { data:receiveStock=[] } = useQuery({
    queryKey:['wh-stock-receive', receiveWH?.id],
    queryFn:()=> receiveWH ? api.get('/inventory/warehouses/'+receiveWH.id+'/stock').then(r=>r.data).catch(()=>[]) : Promise.resolve([]),
    enabled: !!receiveWH,
  });

  const selectedProduct = products.find((p:any)=>p.id===receiveForm.product_id);
  const variants = selectedProduct?.variants||[];

  const addMut = useMutation({
    mutationFn:()=>api.post('/inventory/warehouses', { name:addForm.name, location:addForm.location||undefined }),
    onSuccess:()=>{ toast('Warehouse added!','success'); qc.invalidateQueries({queryKey:['warehouses']}); setShowAdd(false); setAddForm({name:'',location:''}); },
    onError:(e:any)=>toast(getErr(e),'error'),
  });

  const receiveMut = useMutation({
    mutationFn:async()=>{
      let variantId = receiveForm.variant_id;
      if (!variantId) {
        const p = products.find((x:any)=>x.id===receiveForm.product_id);
        variantId = p?.variants?.[0]?.id;
        if (!variantId) throw new Error('Select a product variant');
      }
      return api.post('/inventory/adjust',{
        warehouse_id: receiveWH.id,
        variant_id: variantId,
        quantity: parseInt(receiveForm.qty),
        reason:'Stock received',
      });
    },
    onSuccess:()=>{ toast('Stock received!','success'); qc.invalidateQueries({queryKey:['inventory']}); qc.invalidateQueries({queryKey:['warehouses']}); qc.invalidateQueries({queryKey:['wh-stock',receiveWH?.id]}); setReceiveWH(null); setReceiveForm({product_id:'',variant_id:'',qty:''}); },
    onError:(e:any)=>toast(getErr(e),'error'),
  });

  const transferMut = useMutation({
    mutationFn:()=>{
      if (!transferForm.variant_id) throw new Error('Select a product to transfer');
      if (!transferForm.to_warehouse_id) throw new Error('Select destination warehouse');
      if (transferForm.to_warehouse_id===transferWH.id) throw new Error('Source and destination cannot be the same');
      return api.post('/inventory/transfer',{
        from_warehouse_id: transferWH.id,
        to_warehouse_id: transferForm.to_warehouse_id,
        variant_id: transferForm.variant_id,
        quantity: parseInt(transferForm.qty),
      });
    },
    onSuccess:()=>{ toast('Stock transferred!','success'); qc.invalidateQueries({queryKey:['inventory']}); qc.invalidateQueries({queryKey:['warehouses']}); setTransferWH(null); setTransferForm({to_warehouse_id:'',variant_id:'',qty:''}); },
    onError:(e:any)=>toast(getErr(e),'error'),
  });

  const af=(k:string,v:string)=>setAddForm(p=>({...p,[k]:v}));
  const rf=(k:string,v:string)=>setReceiveForm(p=>({...p,[k]:v}));
  const tf=(k:string,v:string)=>setTransferForm(p=>({...p,[k]:v}));

  const whColors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{fontSize:14,fontWeight:700}}>Warehouses & Branches</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>{warehouses.length} locations</div>
        </div>
        <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> Add warehouse / branch</button>
      </div>

      {isLoading && <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"/></div>}

      {/* Warehouse cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginBottom:20}}>
        {warehouses.map((w:any, idx:number)=>(
          <div key={w.id} className="card" style={{padding:0,overflow:'hidden',cursor:'pointer',border:selectedWH?.id===w.id?'2px solid var(--fill-accent)':'2px solid transparent'}}
            onClick={()=>setSelectedWH(selectedWH?.id===w.id?null:w)}>
            <div style={{height:6,background:whColors[idx%whColors.length]}}/>
            <div style={{padding:'16px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{w.name}</div>
                  {w.location&&<div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}><i className="ti ti-map-pin" style={{fontSize:11}}/> {w.location}</div>}
                </div>
                <div style={{width:36,height:36,borderRadius:8,background:whColors[idx%whColors.length]+'20',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="ti ti-building-warehouse" style={{fontSize:18,color:whColors[idx%whColors.length]}}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                <div style={{padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--radius)',textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'var(--fill-accent)'}}>{parseInt(w.sku_count||0)}</div>
                  <div style={{fontSize:10,color:'var(--text-secondary)'}}>SKUs</div>
                </div>
                <div style={{padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--radius)',textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:800}}>{parseInt(w.total_units||0)}</div>
                  <div style={{fontSize:10,color:'var(--text-secondary)'}}>Total units</div>
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="bt bt-p" style={{flex:1,justifyContent:'center',fontSize:11}}
                  onClick={e=>{e.stopPropagation();setReceiveWH(w);setReceiveForm({product_id:'',variant_id:'',qty:''});}}>
                  <i className="ti ti-package-import"/> Receive stock
                </button>
                <button className="bt" style={{flex:1,justifyContent:'center',fontSize:11}}
                  onClick={e=>{e.stopPropagation();setTransferWH(w);setTransferForm({to_warehouse_id:'',variant_id:'',qty:''});}}>
                  <i className="ti ti-arrows-exchange"/> Transfer out
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add warehouse card */}
        <div className="card" style={{padding:0,overflow:'hidden',cursor:'pointer',border:'2px dashed var(--border-color)',display:'flex',alignItems:'center',justifyContent:'center',minHeight:180}}
          onClick={()=>setShowAdd(true)}>
          <div style={{textAlign:'center',color:'var(--text-muted-custom)',padding:24}}>
            <i className="ti ti-plus" style={{fontSize:32,display:'block',marginBottom:8}}/>
            <div style={{fontSize:13,fontWeight:600}}>Add warehouse</div>
            <div style={{fontSize:11,marginTop:4}}>or branch location</div>
          </div>
        </div>
      </div>

      {/* Selected warehouse stock detail */}
      {selectedWH&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontWeight:700,fontSize:13}}><i className="ti ti-building-warehouse" style={{marginRight:6}}/>{selectedWH.name} — Stock detail</span>
            <button style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-secondary)'}} onClick={()=>setSelectedWH(null)}>×</button>
          </div>
          <div className="tr th" style={{gridTemplateColumns:'1fr 100px 80px 80px 80px'}}>
            {['Product','SKU','Variant','In stock','Status'].map(h=><span key={h}>{h}</span>)}
          </div>
          {whStock.length===0&&(
            <div style={{padding:32,textAlign:'center',color:'var(--text-muted-custom)'}}>
              No stock in this warehouse yet — use "Receive stock" to add inventory
            </div>
          )}
          {whStock.map((s:any)=>{
            const low=s.quantity<=s.reorder_point; const out=s.quantity<=0;
            return (
              <div key={s.id} className="tr" style={{gridTemplateColumns:'1fr 100px 80px 80px 80px'}}>
                <span style={{fontWeight:600}}>{s.product_name}</span>
                <span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-secondary)'}}>{s.sku||'—'}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{s.variant_name}</span>
                <span style={{fontWeight:800,color:out?'var(--text-danger-custom)':low?'var(--text-warning-custom)':'var(--text-primary)'}}>{s.quantity}</span>
                <span><span className={'bx '+(out?'r':low?'a':'g')} style={{fontSize:9}}>{out?'Out':low?'Low':'OK'}</span></span>
              </div>
            );
          })}
        </div>
      )}

      {warehouses.length===0&&!isLoading&&(
        <div style={{padding:64,textAlign:'center',color:'var(--text-muted-custom)'}}>
          <i className="ti ti-building-warehouse" style={{fontSize:48,display:'block',marginBottom:12}}/>
          <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>No warehouses yet</div>
          <div style={{fontSize:12,marginBottom:20}}>Add your main warehouse and branches to start managing stock</div>
          <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus"/> Add first warehouse</button>
        </div>
      )}

      {/* Add warehouse modal */}
      {showAdd&&(
        <Modal title="Add warehouse / branch" onClose={()=>setShowAdd(false)}>
          <Field label="Name" required>
            <Inp value={addForm.name} onChange={v=>af('name',v)} placeholder="e.g. Main Warehouse, Riyadh Branch, Jeddah Store"/>
          </Field>
          <Field label="Location / address">
            <Inp value={addForm.location} onChange={v=>af('location',v)} placeholder="e.g. King Fahd Road, Riyadh"/>
          </Field>
          <div style={{padding:'10px 12px',background:'var(--surface-1)',borderRadius:'var(--radius)',marginBottom:14,fontSize:12,color:'var(--text-secondary)'}}>
            <i className="ti ti-info-circle"/> After adding a warehouse, use "Receive stock" to load products into it.
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <SaveBtn label="Add warehouse" loading={addMut.isPending} disabled={!addForm.name} onClick={()=>addMut.mutate()}/>
          </div>
        </Modal>
      )}

      {/* Receive stock modal */}
      {receiveWH&&(
        <Modal title={'Receive stock → '+receiveWH.name} onClose={()=>setReceiveWH(null)} width={500}>
          <div style={{padding:'8px 12px',background:'var(--bg-accent)',borderRadius:'var(--radius)',marginBottom:14,fontSize:12,color:'var(--fill-accent)'}}>
            <i className="ti ti-building-warehouse"/> Receiving into: <strong>{receiveWH.name}</strong>
          </div>
          <Field label="Product" required>
            <select value={receiveForm.product_id} onChange={e=>{rf('product_id',e.target.value);rf('variant_id','');}}
              style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',background:'var(--surface-2)',color:'var(--text-primary)',fontSize:12}}>
              <option value="">Select product…</option>
              {products.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          {variants.length>0&&(
            <Field label="Variant / Size">
              <select value={receiveForm.variant_id} onChange={e=>rf('variant_id',e.target.value)}
                style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',background:'var(--surface-2)',color:'var(--text-primary)',fontSize:12}}>
                <option value="">All variants / Default</option>
                {variants.map((v:any)=><option key={v.id} value={v.id}>{v.name} {v.sku?'('+v.sku+')':''}</option>)}
              </select>
            </Field>
          )}
          <Field label="Quantity received" required>
            <Inp type="number" value={receiveForm.qty} onChange={v=>rf('qty',v)} placeholder="e.g. 100"/>
          </Field>
          {receiveForm.qty&&receiveForm.product_id&&(
            <div style={{padding:'8px 12px',background:'var(--bg-success-custom)',borderRadius:'var(--radius)',marginBottom:14,fontSize:12,color:'var(--text-success-custom)',fontWeight:600}}>
              <i className="ti ti-circle-check"/> Adding {receiveForm.qty} units of {selectedProduct?.name} to {receiveWH.name}
            </div>
          )}
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setReceiveWH(null)}>Cancel</button>
            <SaveBtn label="Receive stock" loading={receiveMut.isPending} disabled={!receiveForm.product_id||!receiveForm.qty} onClick={()=>receiveMut.mutate()}/>
          </div>
        </Modal>
      )}

      {/* Transfer stock modal */}
      {transferWH&&(
        <Modal title={'Transfer stock from '+transferWH.name} onClose={()=>setTransferWH(null)} width={500}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--surface-1)',borderRadius:'var(--radius)',marginBottom:14}}>
            <div style={{textAlign:'center',flex:1}}>
              <div style={{fontSize:11,color:'var(--text-secondary)'}}>FROM</div>
              <div style={{fontWeight:700,fontSize:13}}>{transferWH.name}</div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:20,color:'var(--fill-accent)'}}/>
            <div style={{textAlign:'center',flex:1}}>
              <div style={{fontSize:11,color:'var(--text-secondary)'}}>TO</div>
              <select value={transferForm.to_warehouse_id} onChange={e=>tf('to_warehouse_id',e.target.value)}
                style={{border:'none',background:'transparent',fontWeight:700,fontSize:13,color:'var(--text-primary)',textAlign:'center',outline:'1px solid var(--border-color)',borderRadius:4,padding:'2px 6px'}}>
                <option value="">Select…</option>
                {warehouses.filter((w:any)=>w.id!==transferWH.id).map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <Field label="Product / variant to transfer" required>
            <select value={transferForm.variant_id} onChange={e=>tf('variant_id',e.target.value)}
              style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',background:'var(--surface-2)',color:'var(--text-primary)',fontSize:12}}>
              <option value="">Select product in this warehouse…</option>
              {receiveStock.map((s:any)=>(
                <option key={s.variant_id} value={s.variant_id}>
                  {s.product_name} — {s.variant_name||'Default'} (Available: {s.quantity})
                </option>
              ))}
              {receiveStock.length===0&&products.flatMap((p:any)=>p.variants?.map((v:any)=>(
                <option key={v.id} value={v.id}>{p.name} — {v.name||'Default'}</option>
              )))}
            </select>
          </Field>
          <Field label="Quantity to transfer" required>
            <Inp type="number" value={transferForm.qty} onChange={v=>tf('qty',v)} placeholder="e.g. 50"/>
          </Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setTransferWH(null)}>Cancel</button>
            <SaveBtn label="Transfer stock" loading={transferMut.isPending} disabled={!transferForm.variant_id||!transferForm.qty||!transferForm.to_warehouse_id} onClick={()=>transferMut.mutate()}/>
          </div>
        </Modal>
      )}
    </div>
  );
}
