import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useToast } from '../../components/Toast';

const money=(v:any)=>'SAR '+Number(v||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const day=(d:Date)=>d.toISOString().slice(0,10);
const xmlEscape=(v:any)=>String(v??'').replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]||c));
const vatOf=(o:any)=>{const stored=Number(o.tax_amount||o.vat_amount||0);if(stored)return stored;const gross=Math.max(Number(o.total||0),Number(o.paid_amount||o.amount_paid||0));return gross*15/115};
const grossOf=(o:any)=>Math.max(Number(o.total||0),Number(o.paid_amount||o.amount_paid||0));
const download=(name:string,content:string,type:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)};

export default function ZATCA(){
  const {toast}=useToast();const now=new Date();const monthStart=day(new Date(now.getFullYear(),now.getMonth(),1));
  const [tab,setTab]=useState<'invoices'|'credit-notes'|'settings'>('invoices');const [q,setQ]=useState('');const [from,setFrom]=useState(monthStart);const [to,setTo]=useState(day(now));const [selected,setSelected]=useState<any>(null);
  const vatNumber=import.meta.env.VITE_STORE_VAT_NUMBER||'';
  const {data:vat,isLoading:vatLoading}=useQuery({queryKey:['zatca-vat',from,to],queryFn:()=>api.get(`/finance/reports/vat?from=${from}&to=${to}`).then(r=>r.data)});
  const {data:orders=[],isLoading:ordersLoading,refetch,isFetching}=useQuery<any[]>({queryKey:['zatca-invoices'],queryFn:()=>api.get('/sales/orders').then(r=>Array.isArray(r.data)?r.data:[])});
  const {data:returns=[],isLoading:returnsLoading}=useQuery<any[]>({queryKey:['zatca-credit-notes'],queryFn:()=>api.get('/sales/returns').then(r=>Array.isArray(r.data)?r.data:[])});
  const invoices=useMemo(()=>orders.filter(o=>o.status==='paid'||o.status==='partial_return'||o.status==='refunded').filter(o=>{const date=String(o.created_at||'').slice(0,10);const query=q.toLowerCase();return date>=from&&date<=to&&(!query||String(o.order_number||'').toLowerCase().includes(query)||String(o.customer_name||'').toLowerCase().includes(query))}),[orders,from,to,q]);
  const credits=useMemo(()=>returns.filter(r=>{const date=String(r.created_at||'').slice(0,10);const query=q.toLowerCase();return date>=from&&date<=to&&(!query||String(r.return_number||'').toLowerCase().includes(query)||String(r.order_number||'').toLowerCase().includes(query))}),[returns,from,to,q]);
  const ready=invoices.filter(o=>vatOf(o)>0&&vatNumber).length;const review=invoices.length-ready;const totalVat=invoices.reduce((s,o)=>s+vatOf(o),0);

  const exportXml=(o:any)=>{
    const gross=grossOf(o),vatAmount=vatOf(o),net=gross-vatAmount;
    const xml=`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${xmlEscape(o.order_number)}</ID>
  <IssueDate>${xmlEscape(String(o.created_at||'').slice(0,10))}</IssueDate>
  <InvoiceTypeCode>388</InvoiceTypeCode>
  <AccountingSupplierParty><Party><PartyTaxScheme><CompanyID>${xmlEscape(vatNumber)}</CompanyID><TaxScheme><ID>VAT</ID></TaxScheme></PartyTaxScheme><PartyLegalEntity><RegistrationName>NuxFashion</RegistrationName></PartyLegalEntity></Party></AccountingSupplierParty>
  <AccountingCustomerParty><Party><PartyLegalEntity><RegistrationName>${xmlEscape(o.customer_name||'Walk-in Customer')}</RegistrationName></PartyLegalEntity></Party></AccountingCustomerParty>
  <TaxTotal><TaxAmount currencyID="SAR">${vatAmount.toFixed(2)}</TaxAmount></TaxTotal>
  <LegalMonetaryTotal><TaxExclusiveAmount currencyID="SAR">${net.toFixed(2)}</TaxExclusiveAmount><TaxInclusiveAmount currencyID="SAR">${gross.toFixed(2)}</TaxInclusiveAmount><PayableAmount currencyID="SAR">${gross.toFixed(2)}</PayableAmount></LegalMonetaryTotal>
</Invoice>`;
    download(`${o.order_number}.xml`,xml,'application/xml');toast('Invoice XML exported','success');
  };
  const exportRegister=()=>{
    const rows=[['Invoice','Date','Customer','VAT Number','Net','VAT 15%','Gross','Readiness'],...invoices.map(o=>[o.order_number,o.created_at,o.customer_name,vatNumber,(grossOf(o)-vatOf(o)).toFixed(2),vatOf(o).toFixed(2),grossOf(o).toFixed(2),vatNumber?'Ready':'VAT number missing'])];
    download(`zatca-register-${from}-${to}.csv`,rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'),'text/csv');toast('Compliance register exported','success');
  };
  const requestSubmission=()=>{setTab('settings');toast('Phase 2 credentials and device onboarding are required before submission','info')};

  return <div className="zatca-page">
    <div className="nx-page-head"><div><h1 className="nx-page-title">ZATCA E-Invoicing</h1><p className="nx-page-sub">Tax invoices, credit notes and Fatoorah compliance readiness.</p></div><div className="orders-head-actions"><button className="btn-nx ghost" onClick={()=>refetch()}><i className={`ti ti-refresh${isFetching?' login-spin':''}`}/> Refresh</button><button className="btn-nx ghost" onClick={exportRegister}><i className="ti ti-download"/> Export Register</button><button className="btn-nx primary" onClick={requestSubmission}><i className="ti ti-send"/> ZATCA Submission</button></div></div>
    <div className="zatca-banner"><div><i className="ti ti-shield-check"/><span><b>Compliance workspace</b><small>Phase 1 QR invoices are active. Phase 2 API reporting requires production credentials and device onboarding.</small></span></div><span className={`zatca-readiness ${vatNumber?'ready':'warning'}`}><i className={`ti ${vatNumber?'ti-circle-check-filled':'ti-alert-triangle'}`}/>{vatNumber?'VAT identity configured':'VAT number required'}</span></div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-file-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{ready}</div><div className="nx-stat-lbl">Ready Invoices</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-alert-circle"/></div><div className="nx-stat-body"><div className="nx-stat-val">{review}</div><div className="nx-stat-lbl">Needs Review</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-file-minus"/></div><div className="nx-stat-body"><div className="nx-stat-val">{credits.length}</div><div className="nx-stat-lbl">Credit Notes</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon purple"><i className="ti ti-receipt-tax"/></div><div className="nx-stat-body"><div className="nx-stat-val">{money(totalVat||vat?.output_vat?.vat)}</div><div className="nx-stat-lbl">Output VAT</div></div></div>
    </div>
    <div className="zatca-controls"><div className="nx-tabs">{([['invoices','Tax Invoices'],['credit-notes','Credit Notes'],['settings','Integration Settings']] as const).map(([id,title])=><button key={id} className={`nx-tab${tab===id?' on':''}`} onClick={()=>setTab(id)}>{title}{id==='invoices'&&<span>{invoices.length}</span>}{id==='credit-notes'&&<span>{credits.length}</span>}</button>)}</div>{tab!=='settings'&&<div className="zatca-filters"><div><i className="ti ti-search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={tab==='invoices'?'Invoice or customer…':'Credit note or invoice…'}/></div><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}</div>

    {tab==='invoices'&&<div className="nx-table-wrap zatca-table"><table className="nx-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Net</th><th>VAT 15%</th><th>Total incl. VAT</th><th>Payment</th><th>Readiness</th><th>Date</th><th></th></tr></thead><tbody>
      {ordersLoading||vatLoading?<tr><td colSpan={9}><State icon="ti-loader-2 login-spin" text="Loading tax invoices…"/></td></tr>:!invoices.length?<tr><td colSpan={9}><State icon="ti-file-off" text="No paid tax invoices in this period"/></td></tr>:invoices.map(o=>{const gross=grossOf(o),tax=vatOf(o),isReady=!!vatNumber&&tax>0;return <tr key={o.id} onClick={()=>setSelected(o)}><td><b className="order-number">#{o.order_number}</b></td><td><b>{o.customer_name||'Walk-in'}</b><small>{o.customer_phone||'—'}</small></td><td>{money(gross-tax)}</td><td><b>{money(tax)}</b></td><td><b>{money(gross)}</b></td><td><span className="payment-pill">{o.payment_method?String(o.payment_method).replace(/_/g,' '):'—'}</span></td><td><span className={`nx-badge ${isReady?'active':'pending'}`}><i className={`ti ${isReady?'ti-check':'ti-alert-circle'}`}/> {isReady?'Ready':'Review'}</span></td><td>{new Date(o.created_at).toLocaleDateString('en-SA')}</td><td><button className="btn-nx ghost sm" onClick={e=>{e.stopPropagation();exportXml(o)}}><i className="ti ti-file-code"/> XML</button></td></tr>})}
    </tbody></table></div>}
    {tab==='credit-notes'&&<div className="nx-table-wrap zatca-table"><table className="nx-table"><thead><tr><th>Credit Note</th><th>Original Invoice</th><th>Reason</th><th>Refund Method</th><th>Refund Amount</th><th>Cashier</th><th>Date</th></tr></thead><tbody>
      {returnsLoading?<tr><td colSpan={7}><State icon="ti-loader-2 login-spin" text="Loading credit notes…"/></td></tr>:!credits.length?<tr><td colSpan={7}><State icon="ti-file-minus" text="No credit notes in this period"/></td></tr>:credits.map(r=><tr key={r.id}><td><b className="order-number">#{r.return_number}</b></td><td>#{r.order_number}</td><td>{r.reason||'Customer return'}</td><td><span className="payment-pill">{String(r.refund_method||'').replace(/_/g,' ')}</span></td><td><b className="return-value">{money(r.refund_amount)}</b></td><td>{r.cashier_name||'—'}</td><td>{new Date(r.created_at).toLocaleDateString('en-SA')}</td></tr>)}
    </tbody></table></div>}
    {tab==='settings'&&<div className="zatca-settings">
      <section><header><i className="ti ti-building-bank"/><div><h3>Taxpayer Identity</h3><p>Used in invoice QR and electronic documents</p></div></header><div className="setting-row"><span>Seller legal name</span><b>NuxFashion</b></div><div className="setting-row"><span>Saudi VAT number</span><b className={vatNumber?'ok':'missing'}>{vatNumber||'Not configured'}</b></div><div className="setting-help">Set <code>VITE_STORE_VAT_NUMBER</code> on the Railway web service and redeploy.</div></section>
      <section><header><i className="ti ti-qrcode"/><div><h3>Phase 1 · Generation</h3><p>Customer-facing tax invoice requirements</p></div></header><Check ok text="Arabic/English tax invoice"/><Check ok text="VAT 15% calculation"/><Check ok text="ZATCA TLV QR code"/><Check ok text="Invoice number barcode"/><Check ok={!!vatNumber} text="15-digit taxpayer VAT identity"/></section>
      <section><header><i className="ti ti-api"/><div><h3>Phase 2 · Integration</h3><p>Fatoorah clearance and reporting API</p></div></header><Check text="Compliance CSID onboarding"/><Check text="Production CSID credentials"/><Check text="Cryptographic invoice signing"/><Check text="Clearance/reporting endpoint"/><div className="phase-warning"><i className="ti ti-info-circle"/> Configure these securely on the API service. Browser variables must never contain private keys or ZATCA secrets.</div></section>
    </div>}
    {selected&&<div className="zatca-modal" onClick={()=>setSelected(null)}><div onClick={e=>e.stopPropagation()}><header><div><small>TAX INVOICE</small><h2>#{selected.order_number}</h2></div><button onClick={()=>setSelected(null)}>×</button></header><div className="zatca-invoice-summary"><div><span>Customer</span><b>{selected.customer_name||'Walk-in Customer'}</b></div><div><span>Issue date</span><b>{new Date(selected.created_at).toLocaleString('en-SA')}</b></div><div><span>Net amount</span><b>{money(grossOf(selected)-vatOf(selected))}</b></div><div><span>VAT 15%</span><b>{money(vatOf(selected))}</b></div><div className="total"><span>Total incl. VAT</span><strong>{money(grossOf(selected))}</strong></div></div><footer><button className="btn-nx ghost" onClick={()=>exportXml(selected)}><i className="ti ti-file-code"/> Export XML</button><button className="btn-nx primary" onClick={()=>{setSelected(null);requestSubmission()}}><i className="ti ti-shield-lock"/> Integration Readiness</button></footer></div></div>}
  </div>;
}
function State({icon,text}:{icon:string;text:string}){return <div className="orders-empty"><i className={`ti ${icon}`}/><span>{text}</span></div>}
function Check({ok=false,text}:{ok?:boolean;text:string}){return <div className={`setting-check ${ok?'ok':''}`}><i className={`ti ${ok?'ti-circle-check-filled':'ti-circle-dashed'}`}/><span>{text}</span><b>{ok?'Active':'Not connected'}</b></div>}
