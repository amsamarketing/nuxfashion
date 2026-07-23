import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:number)=>'SAR '+parseFloat(n+'').toFixed(2);
const SC:Record<string,string>={reported:'active',cleared:'active',pending:'pending',failed:'danger',cancelled:'inactive'};
export default function ZATCA(){
  const [tab,setTab]=useState('invoices');
  const {data}=useQuery({queryKey:['zatca-summary'],queryFn:async()=>{const r=await api.get('/finance/reports/vat'); return r.data;}});
  const {data:invs}=useQuery({queryKey:['zatca-invoices'],queryFn:async()=>{const r=await api.get('/sales/orders?limit=50'); return r.data;}});
  const items:any[]=invs?.invoices||invs?.data||[];
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">ZATCA Invoices</h1><p className="nx-page-sub">E-invoicing compliance · Fatoorah integration</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost"><i className="ti ti-download"/> Export XML</button>
        <button className="btn-nx primary"><i className="ti ti-send"/> Submit to ZATCA</button>
      </div>
    </div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-file-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{data?.reported||0}</div><div className="nx-stat-lbl">Reported</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-clock"/></div><div className="nx-stat-body"><div className="nx-stat-val">{data?.pending||0}</div><div className="nx-stat-lbl">Pending</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-x"/></div><div className="nx-stat-body"><div className="nx-stat-val">{data?.failed||0}</div><div className="nx-stat-lbl">Failed</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-receipt"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(data?.total_vat||0)}</div><div className="nx-stat-lbl">Total VAT</div></div></div>
    </div>
    <div className="nx-tabs">{['invoices','credit-notes','settings'].map(t=><button key={t} className={`nx-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t.replace('-',' ').replace(/\b\w/g,(c:string)=>c.toUpperCase())}</button>)}</div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Invoice #</th><th>Customer</th><th>Amount</th><th>VAT</th><th>ZATCA Status</th><th>Date</th></tr></thead>
      <tbody>{items.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No ZATCA invoices found</td></tr>:items.map((i:any)=>(
        <tr key={i.id}><td><span style={{fontWeight:600,color:'var(--accent)'}}>#{i.invoice_number||i.id?.slice(-6)}</span></td><td style={{fontWeight:600}}>{i.customer_name||'—'}</td><td style={{fontWeight:600}}>{fmt(parseFloat(i.total||0))}</td><td style={{color:'var(--muted)'}}>{fmt(parseFloat(i.vat_amount||0))}</td><td><span className={`nx-badge ${SC[i.zatca_status||'pending']}`}>{i.zatca_status||'pending'}</span></td><td style={{color:'var(--muted)',fontSize:12}}>{i.created_at?new Date(i.created_at).toLocaleDateString('en-GB'):'—'}</td></tr>
      ))}</tbody>
    </table></div>
  </div>);
}