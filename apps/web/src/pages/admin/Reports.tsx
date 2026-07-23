import { useState } from 'react';
const REPORTS=[
  {icon:'ti-cash',title:'Sales Report',sub:'Daily, weekly, monthly revenue breakdown',color:'indigo'},
  {icon:'ti-users',title:'Customer Report',sub:'New vs returning, top spenders',color:'green'},
  {icon:'ti-package',title:'Inventory Report',sub:'Stock levels, movement, low-stock alerts',color:'amber'},
  {icon:'ti-truck',title:'Purchasing Report',sub:'Supplier orders, delivery times, costs',color:'blue'},
  {icon:'ti-id',title:'HR Report',sub:'Attendance, payroll, commissions summary',color:'purple'},
  {icon:'ti-receipt',title:'VAT Report',sub:'ZATCA-ready tax summary by period',color:'teal'},
  {icon:'ti-star',title:'Loyalty Report',sub:'Points issued, redeemed, member activity',color:'amber'},
  {icon:'ti-chart-bar',title:'P&L Statement',sub:'Profit & loss by month or quarter',color:'indigo'},
];
export default function Reports(){
  const [period,setPeriod]=useState('this-month');
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Reports</h1><p className="nx-page-sub">Business analytics & exportable reports</p></div>
      <select className="nx-select" value={period} onChange={e=>setPeriod(e.target.value)}>
        <option value="today">Today</option><option value="this-week">This Week</option>
        <option value="this-month">This Month</option><option value="last-month">Last Month</option>
        <option value="this-year">This Year</option>
      </select>
    </div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">SAR —</div><div className="nx-stat-lbl">Revenue</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-shopping-bag"/></div><div className="nx-stat-body"><div className="nx-stat-val">—</div><div className="nx-stat-lbl">Orders</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-users"/></div><div className="nx-stat-body"><div className="nx-stat-val">—</div><div className="nx-stat-lbl">New Customers</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon blue"><i className="ti ti-receipt"/></div><div className="nx-stat-body"><div className="nx-stat-val">SAR —</div><div className="nx-stat-lbl">VAT Collected</div></div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
      {REPORTS.map(r=>(<div key={r.title} className="nx-card" style={{cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
          <div className={`nx-stat-icon ${r.color}`}><i className={`ti ${r.icon}`}/></div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{r.title}</div>
            <div style={{fontSize:12.5,color:'var(--muted)',marginBottom:14}}>{r.sub}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-nx ghost sm"><i className="ti ti-eye"/> View</button>
              <button className="btn-nx ghost sm"><i className="ti ti-download"/> Export</button>
            </div>
          </div>
        </div>
      </div>))}
    </div>
  </div>);
}