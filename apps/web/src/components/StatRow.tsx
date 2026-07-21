interface Stat { label: string; value: string | number; trend?: string; }
export default function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="stat-row">
      {stats.map((s, i) => (
        <div key={i} className="stat-card">
          <div className="lbl">{s.label}</div>
          <div className="val">{s.value}</div>
          {s.trend && (
            <div className="trd" style={{ color: s.trend.startsWith('+') ? 'var(--text-success-custom)' : 'var(--text-danger-custom)' }}>
              {s.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
