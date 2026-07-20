import { Link } from 'react-router-dom';
import type { Equipment } from '../../types';

export default function ConnectionPopover({
  a,
  b,
  onDisconnect,
  onClose,
}: {
  a: Equipment;
  b: Equipment;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 w-72 rounded-2xl border border-border bg-card shadow-xl p-4 z-10">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">🔗 연결선</div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-dim hover:text-text text-sm leading-none"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 text-sm space-y-1.5">
        <Link to={`/equipment/${a.설비ID}`} className="block text-accent hover:underline">
          {a.설비명} <span className="text-text-dim text-xs">({a.설비ID})</span>
        </Link>
        <div className="text-text-dim text-xs pl-1">↕</div>
        <Link to={`/equipment/${b.설비ID}`} className="block text-accent hover:underline">
          {b.설비명} <span className="text-text-dim text-xs">({b.설비ID})</span>
        </Link>
      </div>

      <p className="mt-3 text-xs text-text-dim">
        이 연결선은 두 설비의 &ldquo;연결설비&rdquo; 정보에서 파생된 것입니다 — 해제하면 두
        설비 모두에서 서로에 대한 연결 정보가 지워집니다.
      </p>

      <button
        type="button"
        onClick={onDisconnect}
        className="mt-3 w-full rounded-lg border border-border px-2 py-1.5 text-xs text-text-dim hover:text-risk-high hover:border-risk-high/50 transition-colors"
      >
        연결 해제
      </button>
    </div>
  );
}
