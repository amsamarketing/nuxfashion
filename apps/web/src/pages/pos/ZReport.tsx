import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

const SAR=(value:any)=>`SAR ${Number(value||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const PAYMENT_LABELS:Record<string,string>={cash:'Cash',card:'Card',mada:'Mada',apple_pay:'Apple Pay',stc_pay:'STC Pay',tabby:'Tabby',tamara:'Tamara',bank_transfer:'Bank Transfer',store_credit:'Store Credit',gift_card:'Gift Card',wallet:'Wallet',loyalty_points:'Loyalty Points'};

export default function ZReport(){
  const qc=useQueryClient();
  const {toast}=useToast();
  const [selectedId,setSelectedId]=useState('');
  const [showOpen,setShowOpen]=useState(false);
  const [showClose,setShowClose]=useState(false);
  const [warehouseId,setWarehouseId]=useState('');
  const [openingCash,setOpeningCash]=useState('500');
  const [openingNotes,setOpeningNotes]=useState('');
  const [closingCash,setClosingCash]=useState('');
  const [closingNotes,setClosingNotes]=useState('');

  const {data:warehouses=[]}=useQuery<any[]>({queryKey:['warehouses'],queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[])});
  const {data:sessions=[]}=useQuery<any[]>({queryKey:['pos-sessions'],queryFn:()=>api.get('/sales/sessions').then(r=>Array.isArray(r.data)?r.data:[])});
  const {data:current}=useQuery<any>({queryKey:['pos-current-session'],queryFn:()=>api.get('/sales/sessions/current').then(r=>r.data)});
  const reportId=selectedId||current?.id||sessions[0]?.id||'';
  const {data:report,isLoading}=useQuery<any>({queryKey:['pos-session-report',reportId],queryFn:()=>api.get(`/sales/sessions/${reportId}/report`).then(r=>r.data),enabled:!!reportId});

  const refresh=async()=>{await Promise.all([qc.invalidateQueries({queryKey:['pos-current-session']}),qc.invalidateQueries({queryKey:['pos-sessions']}),qc.invalidateQueries({queryKey:['pos-session-report']})]);};
  const openShift=useMutation({
    mutationFn:()=>api.post('/sales/sessions/open',{warehouse_id:warehouseId||warehouses[0]?.id,opening_cash:Number(openingCash||0),notes:openingNotes||undefined}),
    onSuccess:async r=>{setSelectedId(r.data.id);setShowOpen(false);setOpeningNotes('');await refresh();toast('Shift started successfully','success');},
    onError:(e:any)=>toast(getErr(e),'error'),
  });
  const closeShift=useMutation({
    mutationFn:()=>api.post(`/sales/sessions/${current.id}/close`,{closing_cash:Number(closingCash),notes:closingNotes||undefined}),
    onSuccess:async r=>{setSelectedId(r.data.id);setShowClose(false);setClosingCash('');setClosingNotes('');await refresh();toast('Shift closed and Z-Report finalized','success');},
    onError:(e:any)=>toast(getErr(e),'error'),
  });

  const totals=report?.totals||{};
  const returns=report?.returns||{};
  const shift=report?.session;
  const payments:any[]=report?.payments||[];
  const totalSales=Number(totals.total_sales||0);
  const cashSales=Number(payments.find(p=>p.method==='cash')?.total||0);
  const expected=Number(shift?.expected_cash??(Number(shift?.opening_cash||0)+cashSales-Number(returns.cash_returns||0)));
  const actual=shift?.closing_cash==null?null:Number(shift.closing_cash);
  const variance=actual==null?null:Number(shift.cash_difference??actual-expected);
  const transactions=Number(totals.transactions||0);
  const netSales=totalSales-Number(returns.total_returned||0);
  const duration=shift?`${new Date(shift.opened_at).toLocaleString('en-SA')} — ${shift.closed_at?new Date(shift.closed_at).toLocaleString('en-SA'):'Open now'}`:'';

  const printReport=()=>{
    if(!shift)return;
    const win=window.open('','_blank','width=850,height=750');if(!win)return;
    win.document.write(`<!doctype html><html><head><title>Z-Report ${shift.id}</title><style>body{font-family:Arial;padding:28px;color:#111}h1{font-size:22px;margin:0 0 4px}.muted{color:#666;font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.card{border:1px solid #ddd;border-radius:8px;padding:12px}.card small{display:block;color:#666;margin-bottom:4px}.card b{font-size:17px}table{width:100%;border-collapse:collapse;margin:8px 0 20px}td{padding:7px;border-bottom:1px solid #eee}td:last-child{text-align:right;font-weight:bold}h3{font-size:14px;margin-top:20px}.sign{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:50px}.line{border-top:1px solid #333;padding-top:6px;font-size:12px}</style></head><body>
      <h1>NuxFashion POS — Z-Report</h1><div class="muted">Final shift report · ${shift.status.toUpperCase()}</div>
      <p><b>Cashier:</b> ${shift.cashier_name} &nbsp; <b>Location:</b> ${shift.warehouse_name}<br><b>Shift:</b> ${duration}<br><b>Session:</b> ${shift.id}</p>
      <div class="grid"><div class="card"><small>Gross Sales</small><b>${SAR(totalSales)}</b></div><div class="card"><small>Returns</small><b>${SAR(returns.total_returned)}</b></div><div class="card"><small>Net Sales</small><b>${SAR(netSales)}</b></div><div class="card"><small>Transactions</small><b>${transactions}</b></div><div class="card"><small>VAT 15%</small><b>${SAR(totals.total_tax)}</b></div><div class="card"><small>Discounts</small><b>${SAR(totals.total_discount)}</b></div></div>
      <h3>Payment Breakdown</h3><table>${payments.map(p=>`<tr><td>${PAYMENT_LABELS[p.method]||p.method} (${p.transactions})</td><td>${SAR(p.total)}</td></tr>`).join('')||'<tr><td>No payments</td><td>SAR 0.00</td></tr>'}</table>
      <h3>Cash Reconciliation</h3><table><tr><td>Opening cash</td><td>${SAR(shift.opening_cash)}</td></tr><tr><td>Cash sales</td><td>+ ${SAR(cashSales)}</td></tr><tr><td>Cash refunds</td><td>− ${SAR(returns.cash_returns)}</td></tr><tr><td>Expected cash</td><td>${SAR(expected)}</td></tr><tr><td>Counted cash</td><td>${actual==null?'Not counted':SAR(actual)}</td></tr><tr><td>Difference</td><td>${variance==null?'—':SAR(variance)}</td></tr></table>
      <div class="sign"><div class="line">Cashier signature</div><div class="line">Manager signature</div></div></body></html>`);
    win.document.close();win.print();
  };

  if(!reportId&&!current)return <div className="pos-page"><div className="pos-page-inner"><StartEmpty onStart={()=>setShowOpen(true)}/>{showOpen&&openModal()}</div></div>;
  function openModal(){return <Modal title="Start POS Shift" onClose={()=>setShowOpen(false)}>
    <p style={{fontSize:12,color:'#6b7280',margin:'0 0 14px'}}>Count the drawer before sales. This opening amount becomes the starting cash for reconciliation.</p>
    <label style={labelStyle}>Warehouse / Register *</label><select className="nx-select" style={{width:'100%',marginBottom:12}} value={warehouseId||warehouses[0]?.id||''} onChange={e=>setWarehouseId(e.target.value)}>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
    <label style={labelStyle}>Opening Cash (SAR) *</label><input className="nx-input" type="number" min="0" style={{width:'100%',marginBottom:12}} value={openingCash} onChange={e=>setOpeningCash(e.target.value)}/>
    <label style={labelStyle}>Opening Notes</label><textarea className="nx-input" style={{width:'100%',height:65,padding:10}} value={openingNotes} onChange={e=>setOpeningNotes(e.target.value)} placeholder="Drawer counted by cashier..."/>
    <div style={footerStyle}><button className="btn-nx ghost" onClick={()=>setShowOpen(false)}>Cancel</button><button className="btn-nx primary" disabled={!warehouses.length||openShift.isPending} onClick={()=>openShift.mutate()}>{openShift.isPending?'Starting...':'Start Shift'}</button></div>
  </Modal>}

  return <div className="pos-page"><div className="pos-page-inner">
    <div className="pos-page-header"><div className="pos-page-title"><div className="pos-page-title-icon"><i className="ti ti-report"/></div><div><h2>Z-Report & Shift Control</h2><p>Auditable sales summary and cash reconciliation</p></div></div>
      <div style={{display:'flex',gap:8}}><button className="pos-action ghost" onClick={printReport} disabled={!shift}><i className="ti ti-printer"/> Print / Save PDF</button>{current?<button className="pos-action danger" onClick={()=>{setClosingCash('');setShowClose(true)}}><i className="ti ti-lock"/> Close Shift</button>:<button className="pos-action" onClick={()=>setShowOpen(true)}><i className="ti ti-player-play"/> Start New Shift</button>}</div>
    </div>
    <div className="pos-panel" style={{marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <div><div style={{display:'flex',alignItems:'center',gap:7,fontWeight:800}}><span style={{width:9,height:9,borderRadius:'50%',background:shift?.status==='open'?'#22c55e':'#94a3b8'}}/>{shift?.status==='open'?'SHIFT OPEN':'SHIFT CLOSED'}</div><div style={{fontSize:12,color:'#6b7280',marginTop:4}}>{shift?.cashier_name} · {shift?.warehouse_name} · {duration}</div></div>
      <select className="nx-select" value={reportId} onChange={e=>setSelectedId(e.target.value)}>{sessions.map(s=><option key={s.id} value={s.id}>{s.status==='open'?'OPEN':'CLOSED'} · {s.cashier_name} · {new Date(s.opened_at).toLocaleString('en-SA')}</option>)}</select>
    </div>
    {isLoading?<div className="pos-empty">Loading report...</div>:<>
      <div className="pos-kpi-grid">{[{l:'Gross Sales',v:SAR(totalSales)},{l:'Returns',v:SAR(returns.total_returned)},{l:'Net Sales',v:SAR(netSales)},{l:'Transactions',v:String(transactions)}].map(x=><div className="pos-kpi" key={x.l}><div className="pos-kpi-label">{x.l}</div><div className="pos-kpi-value">{x.v}</div></div>)}</div>
      <div className="pos-kpi-grid">{[{l:'Average Basket',v:SAR(transactions?totalSales/transactions:0)},{l:'VAT 15%',v:SAR(totals.total_tax)},{l:'Discounts',v:SAR(totals.total_discount)},{l:'Return Count',v:String(returns.return_count||0)}].map(x=><div className="pos-kpi" key={x.l}><div className="pos-kpi-label">{x.l}</div><div className="pos-kpi-value">{x.v}</div></div>)}</div>
      <div className="pos-two-col">
        <div className="pos-panel"><h3 style={headingStyle}>Payment Breakdown</h3>{payments.length?payments.map(p=><Row key={p.method} label={`${PAYMENT_LABELS[p.method]||p.method} · ${p.transactions} txn`} value={SAR(p.total)}/>):<div style={{color:'#9ca3af',fontSize:13}}>No payments in this shift</div>}</div>
        <div className="pos-panel"><h3 style={headingStyle}>Cash Reconciliation</h3><Row label="Opening cash" value={SAR(shift?.opening_cash)}/><Row label="Cash sales" value={`+ ${SAR(cashSales)}`}/><Row label="Cash refunds" value={`− ${SAR(returns.cash_returns)}`}/><Row label="Expected cash" value={SAR(expected)} strong/><Row label="Counted cash" value={actual==null?'Pending shift close':SAR(actual)}/><Row label="Difference" value={variance==null?'—':SAR(variance)} color={variance==null?'#64748b':Math.abs(variance)<.01?'#16a34a':'#dc2626'} strong/></div>
      </div>
      <div className="pos-panel" style={{marginTop:12}}><h3 style={headingStyle}>Top Selling Products</h3>{report?.top_items?.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:8}}>{report.top_items.map((item:any)=><div key={item.name} style={{padding:11,border:'1px solid #e5e7eb',borderRadius:9}}><div style={{fontWeight:700,fontSize:13}}>{item.name}</div><div style={{fontSize:11,color:'#6b7280',marginTop:3}}>{item.qty} units · {SAR(item.revenue)}</div></div>)}</div>:<div style={{color:'#9ca3af',fontSize:13}}>No products sold in this shift</div>}</div>
    </>}
    {showOpen&&openModal()}
    {showClose&&<Modal title="Close Shift & Finalize Z-Report" onClose={()=>setShowClose(false)}>
      <div style={{padding:12,background:'#f8fafc',borderRadius:9,marginBottom:14}}><Row label="Expected drawer cash" value={SAR(expected)} strong/><Row label="Cash sales" value={SAR(cashSales)}/><Row label="Cash refunds" value={SAR(returns.cash_returns)}/></div>
      <label style={labelStyle}>Actual Counted Cash (SAR) *</label><input autoFocus className="nx-input" type="number" min="0" style={{width:'100%',marginBottom:8,fontSize:18,fontWeight:800}} value={closingCash} onChange={e=>setClosingCash(e.target.value)}/>
      {closingCash!==''&&<div style={{padding:'9px 11px',borderRadius:8,marginBottom:12,background:Math.abs(Number(closingCash)-expected)<.01?'#dcfce7':'#fee2e2',color:Math.abs(Number(closingCash)-expected)<.01?'#15803d':'#b91c1c',fontWeight:700,fontSize:12}}>Difference: {SAR(Number(closingCash)-expected)} · {Math.abs(Number(closingCash)-expected)<.01?'Balanced':'Explain discrepancy in notes'}</div>}
      <label style={labelStyle}>Closing Notes</label><textarea className="nx-input" style={{width:'100%',height:65,padding:10}} value={closingNotes} onChange={e=>setClosingNotes(e.target.value)} placeholder="Cash count / discrepancy explanation..."/>
      <div style={footerStyle}><button className="btn-nx ghost" onClick={()=>setShowClose(false)}>Cancel</button><button className="btn-nx primary" disabled={closingCash===''||closeShift.isPending} onClick={()=>closeShift.mutate()}>{closeShift.isPending?'Closing...':'Confirm & Close Shift'}</button></div>
    </Modal>}
  </div></div>;
}

function StartEmpty({onStart}:{onStart:()=>void}){return <div className="pos-empty" style={{marginTop:50}}><i className="ti ti-cash-register"/><div style={{fontWeight:800,color:'#374151',fontSize:17,marginBottom:5}}>No POS shift is open</div><div style={{fontSize:12,marginBottom:16}}>Count opening cash and select a register before accepting payments.</div><button className="pos-action" onClick={onStart}><i className="ti ti-player-play"/> Start Shift</button></div>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:any}){return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:2200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}><div style={{width:'min(460px,100%)',background:'#fff',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}><div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',fontWeight:800}}>{title}<button onClick={onClose} style={{border:0,background:'none',fontSize:21,cursor:'pointer'}}>×</button></div><div style={{padding:20}}>{children}</div></div></div>}
function Row({label,value,strong,color}:{label:string;value:string;strong?:boolean;color?:string}){return <div style={{display:'flex',justifyContent:'space-between',gap:10,padding:'8px 0',borderBottom:'1px solid #f1f5f9',fontSize:13}}><span style={{color:'#64748b'}}>{label}</span><span style={{fontWeight:strong?800:600,color}}>{value}</span></div>}
const labelStyle={display:'block',fontSize:11,fontWeight:700,color:'#64748b',marginBottom:5} as const;
const footerStyle={display:'flex',justifyContent:'flex-end',gap:8,marginTop:18} as const;
const headingStyle={margin:'0 0 12px',fontSize:15} as const;
