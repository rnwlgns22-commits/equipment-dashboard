export default function KpiTile({
  label,
  value,
  accentClass = 'text-text',
}: {
  label: string;
  value: string | number;
  accentClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs text-text-dim">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${accentClass}`}>{value}</div>
    </div>
  );
}
