import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
const today=new Date().toISOString().split('T')[0];
const ms=today.slice(0,7)+'-01';
const CATS=[
  {title:'Sales reports',icon:'ti-chart-bar',items:[{l:'Daily / weekly / monthly sales',b:''},{l:'Sales by branch & cashier',b:''},{l:'Sales by category & brand',b:''},{l:'Hourly heatmap',b:''},{l:'Channel comparison (POS/Web/App)',b:''},{l:'Discount & coupon impact',b:''}]},
  {title:'Inventory reports',icon:'ti-package',items:[{l:'Stock on hand by location',b:''},{l:'Stock movement ledger',b:''},{l:'Inventory valuation (COGS)',b:''},{l:'Dead stock & aging analysis',b:''},{l:'Transfer history',b:''},{l:'Reorder suggestions',b:'AI'}]},
  {title:'Financial reports',icon:'ti-report-money',items:[{l:'Profit & Loss statement',b:''},{l:'Balance sheet',b:''},{l:'Cash flow statement',b:''},{l:'VAT return for ZATCA',b:''},{l:'BNPL settlement (Tabby/Tamara)',b:''},{l:'Bank reconciliation',b:''}]},
  {title:'Customer reports',icon:'ti-users',items:[{l:'Customer lifetime value (CLV)',b:''},{l:'New vs returning customers',b:''},{l:'Loyalty & redemption report',b:''},{l:'RFM segmentation',b:'New'},{l:'Cohort & retention',b:''},{l:'Churn risk prediction',b:'AI'}]},
  {title:'Product reports',icon:'ti-tag',items:[{l:'Best sellers by branch',b:''},{l:'Gross margin by product',b:''},{l:'Return rate by SKU',b:''},{l:'Bundle & cross-sell performance',b:''},{l:'Price sensitivity',b:''},{l:'Markdown & clearance report',b:''}]},
  {title:'HR reports',icon:'ti-id',items:[{l:'Attendance summary',b:''},{l:'Payroll cost breakdown',b:''},{l:'Commission report by cashier',b:''},{l:'Top performers by sales',b:''},{l:'GOSI contribution report',b:''},{l:'WPS wage protection log',b:''}]},
];
export default function Reports() {
  const [from,setFrom]=useState(ms);
  const [to,setTo]=useState(today);
  const { data:byPeriod } = useQuery({ queryKey:['rpt',from,to], queryFn:()=>api.get('/reports/sales/by-period?group_by=day&from='+from+'&to='+to).then(r=>r.data) });
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div><div style={{ fontSize:14,fontWeight:600 }}>Reports</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>Filterable by branch, date, category, channel</div></div>
        <div style={{ display:'flex',gap:5,alignItems:'center' }}>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ width:'auto',padding:'5px 8px',fontSize:11 }} />
          <span style={{ color:'var(--text-muted)' }}>→</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ width:'auto',padding:'5px 8px',fontSize:11 }} />
        </div>
      </div>
      {byPeriod&&byPeriod.length>0 && (
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ fontSize:12,fontWeight:600,marginBottom:8 }}>Sales by day</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:6 }}>
            {byPeriod.map((r:any)=>(
              <div key={r.period} style={{ padding:'6px 8px',background:'var(--surface-1)',borderRadius:'var(--radius)',textAlign:'center' }}>
                <div style={{ fontSize:10,color:'var(--text-muted)' }}>{r.period?.slice(5,10)}</div>
                <div style={{ fontSize:13,fontWeight:600,color:'var(--fill-accent)' }}>SAR {parseFloat(r.revenue||0).toFixed(0)}</div>
                <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{r.orders} orders</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
        {CATS.map(cat=>(
          <div key={cat.title} className="card">
            <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:10 }}>
              <i className={'ti '+cat.icon} style={{ fontSize:17 }} />
              <span style={{ fontSize:12,fontWeight:600 }}>{cat.title}</span>
            </div>
            {cat.items.map((item,i)=>(
              <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid var(--border)',cursor:'pointer',alignItems:'center' }}>
                <span style={{ color:'var(--text-accent)',fontSize:11 }}><i className="ti ti-external-link" style={{ fontSize:10,marginRight:4 }} />{item.l}</span>
                {item.b && <span className="bx b">{item.b}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
