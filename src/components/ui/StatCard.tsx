export function StatCard({
  label,
  value,
  color,
  mono,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-xl font-semibold ${mono ? 'font-mono' : ''} ${color ?? 'text-gray-100'}`}
      >
        {value}
      </div>
    </div>
  );
}
