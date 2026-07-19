const DAY_MS = 24 * 60 * 60 * 1000;

export default function HistoryTimeline({
  minDate,
  maxDate,
  value,
  onChange,
}: {
  minDate: Date;
  maxDate: Date;
  value: Date;
  onChange: (d: Date) => void;
}) {
  const totalDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / DAY_MS));
  const valueDays = Math.round((value.getTime() - minDate.getTime()) / DAY_MS);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-bg-soft/95 border-t border-border px-6 py-3 z-10">
      <div className="flex items-center gap-4">
        <span className="text-xs text-text-dim shrink-0 w-24">{minDate.toISOString().slice(0, 10)}</span>
        <input
          type="range"
          min={0}
          max={totalDays}
          value={valueDays}
          onChange={(e) => onChange(new Date(minDate.getTime() + Number(e.target.value) * DAY_MS))}
          className="flex-1 accent-accent"
        />
        <span className="text-xs text-text-dim shrink-0 w-24 text-right">
          {maxDate.toISOString().slice(0, 10)}
        </span>
      </div>
      <div className="text-center text-sm mt-1 font-medium">
        {value.toISOString().slice(0, 10)} 시점 재생 중
        <span className="text-xs text-text-dim font-normal ml-2">
          (수리 이력 역산 재현 — 확정 기록 아님)
        </span>
      </div>
    </div>
  );
}
