interface Props { label: string; value: string | number; icon: string; color?: string; sub?: string; }
export default function StatCard({ label, value, icon, color = 'purple', sub }: Props) {
  const colors: Record<string,string> = {
    purple:'bg-purple-50 text-purple-700', green:'bg-green-50 text-green-700',
    blue:'bg-blue-50 text-blue-700', orange:'bg-orange-50 text-orange-700',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4">
      <div className={"text-2xl p-3 rounded-lg " + (colors[color] || colors.purple)}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
