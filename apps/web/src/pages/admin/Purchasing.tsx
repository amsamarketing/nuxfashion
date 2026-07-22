import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';

type Sup = { id:string;name:string;contact_person:string;phone:string;email:string;city:string;vat_number:string;payment_terms:number };
type POLine = { id:string;variant_id:string;product_name:string;sku:string;quantity_ordered:number;quantity_received:number;unit_cost:string;line_total:string };
type PO = { id:string;po_number:string;supplier_name:string;warehouse_name:string;status:string;order_date:string;expected_date:string;total:string;subtotal:string;tax_amount:string;notes:string;created_by_name:string;lines?:POLine[] };
type GRN = { id:string;grn_number:string;po_number:string;supplier_name:string;received_by_name:string;received_at:string };
type Variant = { id:string;sku:string;product_name:string };

const SC:Record<string,string>={draft:'n',approved:'b',sent:'a',received:'g',partially_received:'a',cancelled:'r'};
const SAR=(n:number|string)=>`SAR ${parseFloat((n??'0') as string).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const EMPTY_SUP={name:'',email:'',phone:'',contact_person:'',city:'Riyadh',vat_number:'',payment_terms:'30'};

export default function Purchasing() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pos'|'suppliers'|'grns'|'analytics'>('pos');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSup, setShowSup] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [sup, setSup] = useState({...EMPTY_SUP});

  // PO create form state
  const [form, setForm] = useState({ supplier_id:'', warehouse_id:'', expected_date:'', notes:'' });
  const [lines, setLines] = useState<{variant_id:string;sku:string;product_name:string;quantity_ordered:number;unit_cost:number}[]>([]);
  const [varSearch, setVarSearch] = useState('');
  // Receive form state
  const [recLines, setRecLines] = useState<Record<string,number>>({});
  const [recInvoice, setRecInvoice] = useState('');

  const { data:pos=[] } = useQuery<PO[]>({ queryKey:['pos',statusFilter], queryFn:async():Promise<PO[]>=>{ try{ return await api.get('/purchasing/orders'+(statusFilter?`?status=${statusFilter}`:'')); }catch{ return []; } } });
  const { data:sups=[] } = useQuery<Sup[]>({ queryKey:['suppliers'], queryFn:async():Promise<Sup[]>=>{ try{ return await api.get('/purchasing/suppliers'); }catch{ return []; } } });
  const { data:grns=[] } = useQuery<GRN[]>({ queryKey:['grns'], queryFn:async():Promise<GRN[]>=>{ try{ return await api.get('/purchasing/receipts'); }catch{ return []; } } });
  const { data:warehouses=[] } = useQuery<{id:string;name:string}[]>({ queryKey:['warehouses'], queryFn:async():Promise<{id:string;name:string}[]>=>{ try{ return await api.get('/inventory/warehouses'); }catch{ return []; } } });
  const { data:variants=[] } = useQuery<Variant[]>({ queryKey:['variants-all'], queryFn:async():Promise<Variant[]>=>{ try{ return await api.get('/inventory/variants'); }catch{ return []; } } });
  const { data:_selectedPOraw } = useQuery<PO|null>({ queryKey:['po',selectedId], queryFn:async():Promise<PO|null>=>{ try{ return (await api.get('/purchasing/orders/'+selectedId)) as PO; }catch{ return null; } }, enabled:!!selectedId });
  const selectedPO = _selectedPOraw as PO|undefined;

  const filteredVars = useMemo(()=>
    varSearch.length>1 ? variants.filter(v=>(v.sku+v.product_name).toLowerCase().includes(varSearch.toLowerCase())).slice(0,8) : []
  ,[variants,varSearch]);

  const createPO = useMutation({
    mutationFn:()=>api.post('/purchasing/orders',{
      supplier_id:form.supplier_id, warehouse_id:form.warehouse_id||warehouses[0]?.id,
      expected_date:form.expected_date||undefined, notes:form.notes||undefined,
      lines:lines.map(l=>({variant_id:l.variant_id,quantity_ordered:l.quantity_ordered,unit_cost:l.unit_cost}))
    }),
    onSuccess:(d:any)=>{ toast('PO '+(d.po_number||'')+ ' created!','success'); qc.invalidateQueries({queryKey:['pos']}); setShowCreate(false); setForm({supplier_id:'',warehouse_id:'',expected_date:'',notes:''}); setLines([]); },
    onError:e=>toast(getErr(e),'error')
  });

  const approvePO = useMutation({
    mutationFn:(id:string)=>api.patch('/purchasing/orders/'+id+'/approve',{}),
    onSuccess:()=>{ toast('PO approved','success'); qc.invalidateQueries({queryKey:['pos']}); qc.invalidateQueries({queryKey:['po',selectedId]}); },
    onError:e=>toast(getErr(e),'error')
  });

  const cancelPO = useMutation({
    mutationFn:(id:string)=>api.patch('/purchasing/orders/'+id+'/cancel',{}),
    onSuccess:()=>{ toast('PO cancelled','success'); qc.invalidateQueries({queryKey:['pos']}); qc.invalidateQueries({queryKey:['po',selectedId]}); },
    onError:e=>toast(getErr(e),'error')
  });

  const receiveGoods = useMutation({
    mutationFn:()=>{
      if(!selectedPO) throw new Error('No PO');
      const _po=selectedPO as PO;
      const rlines=(_po.lines||[]).filter((l:POLine)=>recLines[l.id]>0).map((l:POLine)=>({po_line_id:l.id,variant_id:l.variant_id,quantity_received:recLines[l.id],unit_cost:parseFloat(l.unit_cost)}));
      return api.post('/purchasing/receive',{po_id:(_po as PO).id,lines:rlines,supplier_invoice:recInvoice||undefined});
    },
    onSuccess:()=>{ toast('Goods received & inventory updated!','success'); qc.invalidateQueries({queryKey:['pos']}); qc.invalidateQueries({queryKey:['po',selectedId]}); qc.invalidateQueries({queryKey:['grns']}); setShowReceive(false); setRecLines({}); setRecInvoice(''); },
    onError:e=>toast(getErr(e),'error')
  });

  const createSup = useMutation({
    mutationFn:()=>api.post('/purchasing/suppliers',{...sup,payment_terms:parseInt(sup.payment_terms)||30}),
    onSuccess:()=>{ toast('Supplier added','success'); qc.invalidateQueries({queryKey:['suppliers']}); setShowSup(false); setSup({...EMPTY_SUP}); },
    onError:e=>toast(getErr(e),'error')
  });

  const addLine=(v:Variant)=>{
    setLines(l=>[...l,{variant_id:v.id,sku:v.sku,product_name:v.product_name,quantity_ordered:1,unit_cost:0}]);
    setVarSearch('');
  };
  const updLine=(i:number,k:string,val:number)=>setLines(ls=>ls.map((l,idx)=>idx===i?{...l,[k]:val}:l));
  const remLine=(i:number)=>setLines(ls=>ls.filter((_,idx)=>idx!==i));
  const poTotal=lines.reduce((s,l)=>s+l.quantity_ordered*l.unit_cost,0);

  // Analytics
  const spendBySupplier=useMemo(()=>{
    const m:Record<string,number>={};
    for(const p of pos) if(!['cancelled','draft'].includes(p.status)) m[p.supplier_name]=(m[p.supplier_name]||0)+parseFloat(p.total||'0');
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8);
  },[pos]);
  const maxSpend=spendBySupplier[0]?.[1]||1;
  const totalSpend=pos.filter(p=>!['cancelled','draft'].includes(p.status)).reduce((s,p)=>s+parseFloat(p.total||'0'),0);
  const openPOs=pos.filter(p=>['draft','approved','partially_received'].includes(p.status));
  const receivedPOs=pos.filter(p=>p.status==='received');

  const TABS=[{k:'pos',l:'Purchase orders'},{k:'suppliers',l:`Suppliers (${sups.length})`},{k:'grns',l:'Goods receipts'},{k:'analytics',l:'Analytics'}];
  const STATUS_TABS=[{k:'',l:'All'},{k:'draft',l:'Draft'},{k:'approved',l:'Approved'},{k:'partially_received',l:'Partial'},{k:'received',l:'Received'},{k:'cancelled',l:'Cancelled'}];

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <div style={{fontSize:14,fontWeight:700}}>Purchasing</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>{pos.length} POs · {sups.length} suppliers</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="bt" onClick={()=>setShowSup(true)}><i className="ti ti-building-store"/> Add supplier</button>
          <button className="bt bt-p" onClick={()=>setShowCreate(true)}><i className="ti ti-plus"/> New PO</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {l:'Total POs',v:pos.length},
          {l:'Open POs',v:openPOs.length},
          {l:'Total PO value',v:SAR(totalSpend)},
          {l:'Received this period',v:receivedPOs.length+' POs'},
        ].map(c=>(
          <div key={c.l} style={{background:'var(--surface-2)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'10px 14px'}}>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:4}}>{c.l}</div>
            <div style={{fontSize:16,fontWeight:700}}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{display:'flex',gap:2,marginBottom:14,borderBottom:'1px solid var(--border-color)'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{padding:'6px 14px',fontSize:12,fontWeight:tab===t.k?700:400,border:'none',background:'none',cursor:'pointer',borderBottom:tab===t.k?'2px solid var(--fill-accent)':'2px solid transparent',color:tab===t.k?'var(--fill-accent)':'var(--text-secondary)'}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── POs Tab ── */}
      {tab==='pos' && (
        <div style={{display:'grid',gridTemplateColumns:selectedId?'1fr 380px':'1fr',gap:14}}>
          <div>
            {/* Status filter */}
            <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
              {STATUS_TABS.map(s=>(
                <button key={s.k} onClick={()=>{setStatusFilter(s.k);setSelectedId(null);}} style={{padding:'4px 10px',fontSize:11,borderRadius:20,border:'1px solid',borderColor:statusFilter===s.k?'var(--fill-accent)':'var(--border-color)',background:statusFilter===s.k?'var(--fill-accent)':'transparent',color:statusFilter===s.k?'#fff':'var(--text-secondary)',cursor:'pointer'}}>
                  {s.l}
                </button>
              ))}
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="tr th" style={{gridTemplateColumns:'100px 1fr 90px 100px 110px 100px'}}>
                {['PO #','Supplier','Date','Expected','Total','Status'].map(h=><span key={h}>{h}</span>)}
              </div>
              {pos.map(o=>(
                <div key={o.id} className="tr" style={{gridTemplateColumns:'100px 1fr 90px 100px 110px 100px',cursor:'pointer',background:selectedId===o.id?'var(--bg-accent-custom,#eff6ff)':undefined}} onClick={()=>setSelectedId(selectedId===o.id?null:o.id)}>
                  <span style={{fontWeight:700,color:'var(--fill-accent)',fontSize:11}}>{o.po_number}</span>
                  <span style={{fontWeight:500,fontSize:12}}>{o.supplier_name}</span>
                  <span style={{fontSize:11,color:'var(--text-secondary)'}}>{o.order_date?.slice(0,10)}</span>
                  <span style={{fontSize:11,color:'var(--text-secondary)'}}>{o.expected_date?.slice(0,10)||'—'}</span>
                  <span style={{fontWeight:700,fontSize:12}}>{SAR(o.total)}</span>
                  <span><span className={'bx '+(SC[o.status]||'n')} style={{fontSize:10,textTransform:'capitalize'}}>{o.status.replace('_',' ')}</span></span>
                </div>
              ))}
              {pos.length===0&&<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)',fontSize:13}}>No purchase orders yet</div>}
            </div>
          </div>

          {/* PO Detail Panel */}
          {selectedId && selectedPO && (
            <div className="card" style={{padding:0,overflow:'hidden',alignSelf:'start'}}>
              <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border-color)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{selectedPO.po_number}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)'}}>{selectedPO.supplier_name}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span className={'bx '+(SC[selectedPO.status]||'n')} style={{fontSize:10,textTransform:'capitalize'}}>{selectedPO.status.replace('_',' ')}</span>
                  <button className="bt" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setSelectedId(null)}>✕</button>
                </div>
              </div>
              <div style={{padding:'12px 14px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:11,marginBottom:12}}>
                  <div><span style={{color:'var(--text-secondary)'}}>Warehouse</span><br/><strong>{selectedPO.warehouse_name}</strong></div>
                  <div><span style={{color:'var(--text-secondary)'}}>Expected</span><br/><strong>{selectedPO.expected_date?.slice(0,10)||'—'}</strong></div>
                  <div><span style={{color:'var(--text-secondary)'}}>Created by</span><br/><strong>{selectedPO.created_by_name}</strong></div>
                  <div><span style={{color:'var(--text-secondary)'}}>Order date</span><br/><strong>{selectedPO.order_date?.slice(0,10)}</strong></div>
                </div>
                {selectedPO.notes&&<div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:12,padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>{selectedPO.notes}</div>}

                {/* Line items */}
                {(selectedPO.lines||[]).length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,marginBottom:6}}>Items</div>
                    {(selectedPO.lines||[]).map(l=>(
                      <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border-color)',fontSize:11}}>
                        <div>
                          <div style={{fontWeight:600}}>{l.product_name}</div>
                          <div style={{color:'var(--text-secondary)'}}>{l.sku}</div>
                          <div style={{color:'var(--text-secondary)'}}>
                            {l.quantity_received>0&&<span style={{color:l.quantity_received>=l.quantity_ordered?'#16a34a':'#d97706'}}>Received: {l.quantity_received}/{l.quantity_ordered} </span>}
                            {l.quantity_received===0&&<span>Qty: {l.quantity_ordered}</span>}
                          </div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontWeight:700}}>{SAR(l.line_total)}</div>
                          <div style={{color:'var(--text-secondary)'}}>@ {SAR(l.unit_cost)}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:12}}>
                      <span style={{color:'var(--text-secondary)'}}>Subtotal</span><span>{SAR(selectedPO.subtotal)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                      <span style={{color:'var(--text-secondary)'}}>VAT (15%)</span><span>{SAR(selectedPO.tax_amount)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:13,borderTop:'1px solid var(--border-color)',marginTop:6,paddingTop:6}}>
                      <span>Total</span><span>{SAR(selectedPO.total)}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {selectedPO.status==='draft'&&(
                    <button className="bt bt-p" style={{width:'100%'}} onClick={()=>approvePO.mutate(selectedPO.id)}>
                      <i className="ti ti-check"/> Approve PO
                    </button>
                  )}
                  {['approved','partially_received'].includes(selectedPO.status)&&(
                    <button className="bt bt-p" style={{width:'100%'}} onClick={()=>{
                      const init:Record<string,number>={};
                      (selectedPO.lines||[]).forEach(l=>{ init[l.id]=Math.max(0,l.quantity_ordered-l.quantity_received); });
                      setRecLines(init); setShowReceive(true);
                    }}>
                      <i className="ti ti-package-import"/> Receive goods
                    </button>
                  )}
                  {['draft','approved'].includes(selectedPO.status)&&(
                    <button className="bt" style={{width:'100%',color:'var(--danger-color,#dc2626)',borderColor:'var(--danger-color,#dc2626)'}}
                      onClick={()=>{ if(confirm('Cancel this PO?')) cancelPO.mutate(selectedPO.id); }}>
                      <i className="ti ti-x"/> Cancel PO
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Suppliers Tab ── */}
      {tab==='suppliers'&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="tr th" style={{gridTemplateColumns:'1fr 130px 150px 80px 60px 80px'}}>
            {['Supplier','Contact','Email / Phone','City','Terms','VAT'].map(h=><span key={h}>{h}</span>)}
          </div>
          {sups.map(s=>(
            <div key={s.id} className="tr" style={{gridTemplateColumns:'1fr 130px 150px 80px 60px 80px'}}>
              <span style={{fontWeight:600,fontSize:12}}>{s.name}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{s.contact_person||'—'}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{s.email||'—'}<br/>{s.phone||'—'}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{s.city||'—'}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{s.payment_terms||30}d</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{s.vat_number||'—'}</span>
            </div>
          ))}
          {sups.length===0&&<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)',fontSize:13}}>No suppliers — add your first supplier</div>}
        </div>
      )}

      {/* ── GRNs Tab ── */}
      {tab==='grns'&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="tr th" style={{gridTemplateColumns:'120px 100px 1fr 1fr 120px'}}>
            {['GRN #','PO #','Supplier','Received by','Date'].map(h=><span key={h}>{h}</span>)}
          </div>
          {grns.map(g=>(
            <div key={g.id} className="tr" style={{gridTemplateColumns:'120px 100px 1fr 1fr 120px'}}>
              <span style={{fontWeight:700,color:'var(--fill-accent)',fontSize:11}}>{g.grn_number}</span>
              <span style={{fontSize:11}}>{g.po_number}</span>
              <span style={{fontSize:12,fontWeight:500}}>{g.supplier_name}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{g.received_by_name}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{g.received_at?.slice(0,10)}</span>
            </div>
          ))}
          {grns.length===0&&<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)',fontSize:13}}>No goods receipts yet</div>}
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {tab==='analytics'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {[
              {l:'Total spend',v:SAR(totalSpend)},
              {l:'Avg PO value',v:pos.length?SAR(totalSpend/pos.length):SAR(0)},
              {l:'Active suppliers',v:sups.length},
              {l:'Goods receipts',v:grns.length},
            ].map(c=>(
              <div key={c.l} style={{background:'var(--surface-2)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'10px 14px'}}>
                <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:4}}>{c.l}</div>
                <div style={{fontSize:16,fontWeight:700}}>{c.v}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:'14px 16px'}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:12}}>Spend by supplier</div>
            {spendBySupplier.length===0&&<div style={{color:'var(--text-secondary)',fontSize:12}}>No data yet</div>}
            {spendBySupplier.map(([name,val])=>(
              <div key={name} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                  <span style={{fontWeight:500}}>{name}</span>
                  <span style={{color:'var(--text-secondary)'}}>{SAR(val)}</span>
                </div>
                <div style={{height:6,background:'var(--border-color)',borderRadius:3}}>
                  <div style={{height:6,borderRadius:3,background:'var(--fill-accent)',width:`${Math.round(val/maxSpend*100)}%`}}/>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:'14px 16px',marginTop:12}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:12}}>PO status breakdown</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {Object.entries({draft:pos.filter(p=>p.status==='draft').length,approved:pos.filter(p=>p.status==='approved').length,received:pos.filter(p=>p.status==='received').length,partially_received:pos.filter(p=>p.status==='partially_received').length,cancelled:pos.filter(p=>p.status==='cancelled').length}).map(([st,cnt])=>(
                <div key={st} style={{textAlign:'center',padding:'10px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                  <div style={{fontSize:20,fontWeight:700}}>{cnt}</div>
                  <div style={{fontSize:10,color:'var(--text-secondary)',textTransform:'capitalize'}}>{st.replace('_',' ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Create PO Modal ── */}
      {showCreate&&(
        <Modal title="New purchase order" onClose={()=>{setShowCreate(false);setLines([]);setForm({supplier_id:'',warehouse_id:'',expected_date:'',notes:''}); }}>
          <Row2>
            <Field label="Supplier" required>
              <Sel value={form.supplier_id} onChange={(v:string)=>setForm(f=>({...f,supplier_id:v}))}>
                <option value="">Select supplier…</option>
                {sups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </Sel>
            </Field>
            <Field label="Warehouse">
              <Sel value={form.warehouse_id} onChange={(v:string)=>setForm(f=>({...f,warehouse_id:v}))}>
                {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </Sel>
            </Field>
          </Row2>
          <Row2>
            <Field label="Expected delivery"><Inp type="date" value={form.expected_date} onChange={v=>setForm(f=>({...f,expected_date:v}))}/></Field>
            <Field label="Notes"><Inp value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))}/></Field>
          </Row2>

          <Field label="Add items">
            <div style={{position:'relative'}}>
              <Inp value={varSearch} onChange={(v:string)=>setVarSearch(v)} placeholder="Search by SKU or product name…"/>
              {filteredVars.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--surface-2)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',zIndex:100,maxHeight:200,overflowY:'auto'}}>
                  {filteredVars.map(v=>(
                    <div key={v.id} style={{padding:'8px 12px',cursor:'pointer',fontSize:12,borderBottom:'1px solid var(--border-color)'}} onClick={()=>addLine(v)}>
                      <strong>{v.sku}</strong> — {v.product_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {lines.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 70px 90px 24px',gap:6,fontSize:10,fontWeight:700,color:'var(--text-secondary)',marginBottom:4,padding:'0 2px'}}>
                <span>Item</span><span>Qty</span><span>Unit cost</span><span/>
              </div>
              {lines.map((l,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 70px 90px 24px',gap:6,marginBottom:6,alignItems:'center'}}>
                  <div style={{fontSize:11}}><strong>{l.sku}</strong><br/><span style={{color:'var(--text-secondary)'}}>{l.product_name}</span></div>
                  <input type="number" min={1} value={l.quantity_ordered} onChange={e=>updLine(i,'quantity_ordered',parseInt(e.target.value)||1)}
                    style={{padding:'4px 6px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,width:'100%',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
                  <input type="number" min={0} step={0.01} value={l.unit_cost} onChange={e=>updLine(i,'unit_cost',parseFloat(e.target.value)||0)}
                    style={{padding:'4px 6px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,width:'100%',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
                  <button onClick={()=>remLine(i)} style={{border:'none',background:'none',cursor:'pointer',color:'#dc2626',fontSize:16,padding:0}}>✕</button>
                </div>
              ))}
              <div style={{textAlign:'right',fontSize:12,fontWeight:700,borderTop:'1px solid var(--border-color)',paddingTop:6}}>
                Subtotal: {SAR(poTotal)} &nbsp;|&nbsp; +VAT: {SAR(poTotal*0.15)} &nbsp;|&nbsp; <span style={{color:'var(--fill-accent)'}}>Total: {SAR(poTotal*1.15)}</span>
              </div>
            </div>
          )}
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowCreate(false)}>Cancel</button>
            <SaveBtn label="Create PO" loading={createPO.isPending} disabled={!form.supplier_id||lines.length===0} onClick={()=>createPO.mutate()}/>
          </div>
        </Modal>
      )}

      {/* ── Add Supplier Modal ── */}
      {showSup&&(
        <Modal title="Add supplier" onClose={()=>setShowSup(false)}>
          <Row2>
            <Field label="Company name" required><Inp value={sup.name} onChange={v=>setSup(p=>({...p,name:v}))} placeholder="Al-Rashid Trading Co."/></Field>
            <Field label="Contact person"><Inp value={sup.contact_person} onChange={v=>setSup(p=>({...p,contact_person:v}))} placeholder="Ahmed Al-Rashid"/></Field>
          </Row2>
          <Row2>
            <Field label="Phone"><Inp value={sup.phone} onChange={v=>setSup(p=>({...p,phone:v}))} placeholder="+966 5x xxx xxxx"/></Field>
            <Field label="Email"><Inp type="email" value={sup.email} onChange={v=>setSup(p=>({...p,email:v}))} placeholder="info@supplier.com"/></Field>
          </Row2>
          <Row2>
            <Field label="City"><Inp value={sup.city} onChange={v=>setSup(p=>({...p,city:v}))} placeholder="Riyadh"/></Field>
            <Field label="VAT number"><Inp value={sup.vat_number} onChange={v=>setSup(p=>({...p,vat_number:v}))} placeholder="3100xxxxxxxxxxxxx"/></Field>
          </Row2>
          <Field label="Payment terms">
            <Sel value={sup.payment_terms} onChange={(v:string)=>setSup(p=>({...p,payment_terms:v}))}>
              <option value="0">Cash on delivery</option>
              <option value="15">Net 15 days</option>
              <option value="30">Net 30 days</option>
              <option value="45">Net 45 days</option>
              <option value="60">Net 60 days</option>
            </Sel>
          </Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowSup(false)}>Cancel</button>
            <SaveBtn label="Add supplier" loading={createSup.isPending} disabled={!sup.name} onClick={()=>createSup.mutate()}/>
          </div>
        </Modal>
      )}

      {/* ── Receive Goods Modal ── */}
      {showReceive&&selectedPO&&(
        <Modal title={`Receive goods — ${selectedPO.po_number}`} onClose={()=>setShowReceive(false)}>
          <Field label="Supplier invoice #"><Inp value={recInvoice} onChange={v=>setRecInvoice(v)} placeholder="INV-2025-xxxxx"/></Field>
          <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',marginBottom:8}}>Items to receive</div>
          {(selectedPO.lines||[]).map(l=>{
            const remaining=l.quantity_ordered-l.quantity_received;
            return (
              <div key={l.id} style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:8,alignItems:'center',marginBottom:10,padding:'8px 10px',background:'var(--surface-1)',borderRadius:'var(--radius)'}}>
                <div style={{fontSize:12}}>
                  <strong>{l.product_name}</strong> <span style={{color:'var(--text-secondary)'}}>{l.sku}</span>
                  <div style={{fontSize:11,color:'var(--text-secondary)'}}>Ordered: {l.quantity_ordered} · Received: {l.quantity_received} · Remaining: <strong>{remaining}</strong></div>
                </div>
                <input type="number" min={0} max={remaining} value={recLines[l.id]??remaining}
                  onChange={e=>setRecLines(r=>({...r,[l.id]:Math.min(parseInt(e.target.value)||0,remaining)}))}
                  style={{padding:'5px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:13,width:'100%',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
              </div>
            );
          })}
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowReceive(false)}>Cancel</button>
            <SaveBtn label="Confirm receipt & update inventory" loading={receiveGoods.isPending} onClick={()=>receiveGoods.mutate()}/>
          </div>
        </Modal>
      )}
    </div>
  );
}
