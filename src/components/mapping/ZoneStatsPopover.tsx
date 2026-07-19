import type { Zone } from '../../types';
import type { ZoneStats } from '../../lib/geo';

export default function ZoneStatsPopover({
  zone,
  stats,
  onClose,
  onDelete,
}: {
  zone: Zone;
  stats: ZoneStats;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 w-64 rounded-2xl border border-border bg-card shadow-xl p-4 z-10">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">📍 {zone.name}</div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-dim hover:text-text text-sm leading-none"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <dl className="mt-3 text-sm space-y-1.5">
        <div className="flex justify-between">
          <dt className="text-text-dim">구역 내 설비</dt>
          <dd>{stats.설비수}개</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-dim">평균 가동률</dt>
          <dd>{stats.가동률}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-dim">위험 설비</dt>
          <dd>{stats.위험설비수}개</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-dim">에러율</dt>
          <dd className={stats.에러율 >= 50 ? 'text-risk-high' : stats.에러율 > 0 ? 'text-risk-mid' : ''}>
            {stats.에러율}%
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onDelete}
        className="mt-3 w-full rounded-lg border border-border px-2 py-1.5 text-xs text-text-dim hover:text-risk-high hover:border-risk-high/50 transition-colors"
      >
        구역 삭제
      </button>
    </div>
  );
}
