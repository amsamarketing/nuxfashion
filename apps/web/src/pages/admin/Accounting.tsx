
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import StatRow from '../../components/StatRow';

const today = new Date().toISOString().split('T')[0];
const yearStart = today.slice(0,4) + '-01-01';

export default function Accounting() {
  const { data: pl } = useQuery({ queryKey:['pl'], queryFn:() => api.get('/finance/reports/profit-loss?from='+yearStart+'&to='+today).then(r=>r.data) });
  const { data: vat } = useQuery({ queryKey:['vat'], queryFn:() => api.get('/finance/reports/vat?from='+yearStart+'&to='+today).then(r=>r.data) });
  const { data: accounts } = useQuery({ queryKey:['accounts'], queryFn:() => api.get('/finance/accounts').then(r=>r.data) });
  const fmt = (n:any) => 'SAR '+parseFloat(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div><div style={{ fontSize:14, fontWeight:600 }}>Accounting</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>YTD {new Date().getFullYear()} · NuxFashion KSA · Period open</div></div>
        <div style={{ display:'flex', gap:5 }}>
          <button className="bt"><i className="ti ti-calendar" /> Close period</button>
          <button className="bt"><i className="ti ti-download" /> Export</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:5, marginBottom:10 }}>
        {["P&L statement","Balance sheet","Cash flow","Journal entries","VAT return (ZATCA)"].map((t,i) => <button key={t} className={'snb'+(i===0?' on':'')}>{t}</button>)}
      </div>
      {pl && <StatRow stats={[
        { label:'Revenue (YTD)', value:fmt(pl.revenue) },
        { label:'Cost of goods', value:fmt(pl.cogs) },
        { label:'Gross profit', value:fmt(pl.gross_profit) },
        { label:'Net profit', value:fmt(pl.net_profit) },
        { label:'VAT collected', value:fmt(vat?.output_vat?.vat) },
      ]} />}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {pl && (
          <div className="card">
            <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Profit & Loss — YTD</div>
            {[['Revenue', pl.revenue,''],['Cost of goods sold', pl.cogs,'color:var(--text-danger)'],['Gross profit', pl.gross_profit,'font-weight:700'],['','',''],['Operating expenses', pl.operating_expenses?.total,'color:var(--text-danger)'],['Net profit', pl.net_profit,'font-weight:700;color:'+(pl.net_profit>=0?'var(--text-success)':'var(--text-danger)')]].map(([l,v,s],i) => {
              if (!l) return <div key={i} style={{ height:6 }} />;
              return (
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'0.5px solid var(--border)' }}>
                  <span style={{ color:'var(--text-secondary)' }}>{l}</span>
                  <span style={Object.fromEntries((s as string).split(';').filter(Boolean).map(r=>r.split(':')))}>{fmt(v)}</span>
                </div>
              );
            })}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'var(--text-muted)' }}>
              <span>Net margin</span><span style={{ fontWeight:600 }}>{pl.net_margin}</span>
            </div>
          </div>
        )}
        <div className="card">
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Chart of accounts</div>
          {accounts?.slice(0,10).map((a:any) => (
            <div key={a.id} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'0.5px solid var(--border)', fontSize:11 }}>
              <span style={{ color:'var(--text-secondary)' }}><span style={{ fontFamily:'monospace', fontSize:10, color:'var(--text-muted)', marginRight:6 }}>{a.code}</span>{a.name}</span>
              <span style={{ fontWeight:600 }}>{fmt(a.balance)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
