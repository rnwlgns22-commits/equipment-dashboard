import { Link } from 'react-router-dom';
import type { Equipment } from '../../types';
import { mockTemperature, mockUptimeHours, statusColor } from '../../lib/mockTelemetry';
import { MIN_TOKEN_SCALE, MAX_TOKEN_SCALE } from '../../mappingStore';

const SCALE_STEP = 0.25;

export default function EquipmentPopover({
  equipment,
  scale,
  onChangeScale,
  onRemovePlacement,
  onClose,
}: {
  equipment: Equipment;
  scale: number;
  onChangeScale: (scale: number) => void;
  onRemovePlacement: () => void;
  onClose: () => void;
}) {
  const uptime = mockUptimeHours(equipment.설비ID);
  const days = Math.floor(uptime / 24);
  const hours = uptime % 24;

  return (
    <div className="absolute top-4 right-4 w-72 rounded-2xl border border-border bg-card shadow-xl p-4 z-10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: statusColor(equipment.상태) }}
            />
            <span className="font-medium">{equipment.설비명}</span>
          </div>
          <div className="text-xs text-text-dim mt-0.5">{equipment.설비ID} · {equipment.분류}</div>
        </div>
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
          <dt className="text-text-dim">상태</dt>
          <dd>{equipment.상태}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-dim">현재 온도 (데모)</dt>
          <dd>{mockTemperature(equipment.설비ID)}°C</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-dim">누적 가동시간 (데모)</dt>
          <dd>{days}일 {hours}시간</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-dim">위치</dt>
          <dd className="text-right">{equipment.위치 || '-'}</dd>
        </div>
      </dl>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs text-text-dim mb-1.5">
          <span>도면 위 아이콘 크기</span>
          <span>{Math.round(scale * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeScale(scale - SCALE_STEP)}
            disabled={scale <= MIN_TOKEN_SCALE}
            className="h-7 w-7 shrink-0 rounded-lg border border-border text-text-dim hover:text-text hover:border-accent/50 disabled:opacity-40 disabled:hover:text-text-dim disabled:hover:border-border"
            aria-label="아이콘 축소"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_TOKEN_SCALE}
            max={MAX_TOKEN_SCALE}
            step={SCALE_STEP}
            value={scale}
            onChange={(e) => onChangeScale(Number(e.target.value))}
            className="flex-1 accent-accent"
            aria-label="아이콘 크기"
          />
          <button
            type="button"
            onClick={() => onChangeScale(scale + SCALE_STEP)}
            disabled={scale >= MAX_TOKEN_SCALE}
            className="h-7 w-7 shrink-0 rounded-lg border border-border text-text-dim hover:text-text hover:border-accent/50 disabled:opacity-40 disabled:hover:text-text-dim disabled:hover:border-border"
            aria-label="아이콘 확대"
          >
            ＋
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex gap-2">
        <button
          type="button"
          disabled
          title="이 데모에는 현장 사진 데이터가 없습니다"
          className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs text-text-dim cursor-not-allowed"
        >
          현장 사진
        </button>
        <button
          type="button"
          disabled
          title="이 데모에는 상세 도면 PDF가 없습니다"
          className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs text-text-dim cursor-not-allowed"
        >
          상세 도면
        </button>
      </div>
      <Link
        to={`/equipment/${equipment.설비ID}`}
        className="mt-2 block text-center text-xs text-accent hover:underline"
      >
        설비 상세 페이지로 이동 →
      </Link>

      <button
        type="button"
        onClick={onRemovePlacement}
        className="mt-3 w-full rounded-lg border border-border px-2 py-1.5 text-xs text-text-dim hover:text-risk-high hover:border-risk-high/50 transition-colors"
      >
        도면에서 배치 삭제
      </button>
    </div>
  );
}
