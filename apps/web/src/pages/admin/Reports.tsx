
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
const today = new Date().toISOString().split('T')[0];
const monthStart = today.slice(0,7)+'-01';
const CATS = [
  {title:'Sales reports',icon:'ti-chart-bar',items:['Daily / weekly / monthly sales','Sales by branch & cashier','Sales by category & brand','Hourly heatmap','Channel comparison (POS/Web/App)','Discount & coupon impact']},
  {title:'Inventory reports',icon:'ti-package',items:['Stock on hand by location','Stock movement ledger','Inventory valuation (COGS)','Dead stock & aging analysis','Transfer history',{l:'Reorder suggestions',badge:'AI'}]},
  {title:'Financial reports',icon:'ti-report-money',items:['Profit & Loss statement','Balance sheet','Cash flow statement','VAT return for ZATCA','BNPL settlement (Tabby/Tamara)','Bank reconciliation']},
  {title:'Customer reports',icon:'ti-users',items:['Customer lifetime value (CLV)','New vs returning customers','Loyalty & redemption report',{l:'RFM segmentation',badge:'New'},{l:'Cohort & retention',badge:''},'Churn risk prediction']},
  {title:'Product reports',icon:'ti-tag',items:['Best sellers by branch','Gross margin by product','Return rate by SKU','Bundle & cross-sell performance','Price sensitivity','Markdown & clearance report']},
  {title:'HR reports',icon:'ti-id',items:['Attendance summary','Payroll cost breakdown','Commission report by cashier','Top performers by sales','GOSI contribution report','WPS (wage protection) log']},
];
export default function Reports() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const { data: byPeriod } = useQuery({ queryKey:['rpt',from,to], queryFn:() => api.get('/reports/sales/by-period?group_by=day&from='+from+'&to='+to).then(r=>r.data) });
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div><div style={{ fontSize:14, fontWeight:600 }}>Reports</div><div style={{ fontSize:11, color:'var(--text-secondary)' }}>Filterable by branch, date, category, channel</div></div>
        <div style={{ display:'flex', gap:5 }}>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ width:'auto', padding:'5px 8px', fontSize:11 }} />
          <span style={{ alignSelf:'center', color:'var(--text-muted)' }}>→</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ width:'auto', padding:'5px 8px', fontSize:11 }} />
        </div>
      </div>
      {byPeriod && byPeriod.length > 0 && (
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Sales by Day</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:6 }}>
            {byPeriod.map((r:any) => (
              <div key={r.period} style={{ padding:'6px 8px', background:'var(--surface-1)', borderRadius:'var(--radius)', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>{r.period?.slice(5,10)}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--fill-accent)' }}>SAR {parseFloat(r.revenue||0).toLocaleString()}</div>
                <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{r.orders} orders</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {CATS.map(cat => (
          <div key={cat.title} className="card">
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <i className={'ti '+cat.icon} style={{ fontSize:18 }} />
              <span style={{ fontSize:12, fontWeight:600 }}>{cat.title}</span>
            </div>
            {cat.items.map((item, i) => {
              const l = typeof item==='string' ? item : (item as any).l;
              const badge = typeof item==='string' ? '' : (item as any).badge;
              return (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'0.5px solid var(--border)', cursor:'pointer', alignItems:'center' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <span style={{ color:'var(--text-accent)', fontSize:11 }}><i className="ti ti-external-link" style={{ fontSize:11, marginRight:4 }} />{l}</span>
                  {badge && <span className="bx b">{badge}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
