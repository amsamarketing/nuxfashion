import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
const fmt=(n:number)=>'SAR '+n.toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
export default function Accounting(){
  const [tab,setTab]=useState('transactions');
  const {data}=useQuery({queryKey:['accounting'],queryFn:async()=>{const r=await fetch('/api/accounting/summary');if(!r.ok)return{};return r.json();}});
  const {data:txns}=useQuery({queryKey:['transactions'],queryFn:async()=>{const r=await fetch('/api/accounting/transactions?limit=50');if(!r.ok)return{transactions:[]};return r.json();}});
  const items:any[]=txns?.transactions||txns?.data||[];
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Accounting</h1><p className="nx-page-sub">Financials, journal entries & reconciliation</p></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-nx ghost"><i className="ti ti-download"/> Export</button>
        <button className="btn-nx primary"><i className="ti ti-plus"/> Journal Entry</button>
      </div>
    </div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-arrow-up"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(data?.total_revenue||0)}</div><div className="nx-stat-lbl">Total Revenue</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-arrow-down"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(data?.total_expenses||0)}</div><div className="nx-stat-lbl">Total Expenses</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-chart-line"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt((data?.total_revenue||0)-(data?.total_expenses||0))}</div><div className="nx-stat-lbl">Net Profit</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-receipt"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(data?.vat_collected||0)}</div><div className="nx-stat-lbl">VAT Collected</div></div></div>
    </div>
    <div className="nx-tabs">{['transactions','journal','reconciliation'].map(t=><button key={t} className={`nx-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
      <tbody>{items.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No transactions found</td></tr>:items.map((t:any)=>(
        <tr key={t.id}><td style={{color:'var(--muted)',fontSize:12}}>{t.date?new Date(t.date).toLocaleDateString('en-GB'):'—'}</td><td style={{fontWeight:600}}>{t.description||'—'}</td><td><span className="nx-badge inactive">{t.type||'—'}</span></td><td style={{color:'var(--green)',fontWeight:600}}>{t.debit?fmt(parseFloat(t.debit)):'—'}</td><td style={{color:'var(--red)',fontWeight:600}}>{t.credit?fmt(parseFloat(t.credit)):'—'}</td><td style={{fontWeight:600}}>{t.balance?fmt(parseFloat(t.balance)):'—'}</td></tr>
      ))}</tbody>
    </table></div>
  </div>);
}