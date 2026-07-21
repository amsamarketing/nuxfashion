
interface Stat { label: string; value: string | number; trend?: string; }
export default function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background:'var(--surface-1)', borderRadius:'var(--radius)', padding:'9px 11px', flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, color:'var(--text-secondary)', marginBottom:3 }}>{s.label}</div>
          <div style={{ fontSize:17, fontWeight:600, color:'var(--text-primary)' }}>{s.value}</div>
          {s.trend && <div style={{ fontSize:10, color: s.trend.startsWith('+') ? 'var(--text-success)' : 'var(--text-danger)', marginTop:2 }}>{s.trend} vs yesterday</div>}
        </div>
      ))}
    </div>
  );
}
