import type { ChangeEvent } from 'react';
import type { Floorplan } from '../../types';

export default function ControlPanel({
  floorplans,
  activeFloorplanId,
  onSelectFloorplan,
  onUpload,
  showLabels,
  onToggleLabels,
}: {
  floorplans: Floorplan[];
  activeFloorplanId: string | null;
  onSelectFloorplan: (id: string) => void;
  onUpload: (file: File) => void;
  showLabels: boolean;
  onToggleLabels: (v: boolean) => void;
}) {
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-bg-soft flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium mb-2">도면</div>
        <label className="block w-full text-center rounded-lg bg-accent text-bg text-sm font-medium py-2 cursor-pointer hover:brightness-110 transition">
          도면 이미지 업로드
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>

        {floorplans.length > 0 && (
          <div className="mt-3 space-y-1">
            {floorplans.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFloorplan(f.id)}
                className={`w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  f.id === activeFloorplanId
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-dim hover:bg-white/5 hover:text-text'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium mb-2">보기 모드</div>
        <div className="space-y-1.5">
          <div className="rounded-lg bg-accent/15 text-accent px-3 py-1.5 text-sm">일반 상태 모드</div>
          {['유지보수 모드', '히트맵 모드', '히스토리 타임라인'].map((mode) => (
            <div
              key={mode}
              title="다음 단계에서 구현 예정"
              className="rounded-lg px-3 py-1.5 text-sm text-text-dim/50 cursor-not-allowed border border-dashed border-border"
            >
              {mode} · 준비 중
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="text-sm font-medium mb-2">레이어</div>
        <label className="flex items-center gap-2 text-sm py-1">
          <input type="checkbox" checked={showLabels} onChange={(e) => onToggleLabels(e.target.checked)} />
          설비명 표시
        </label>
        {['구역 경계선 표시', '데이터 수치 표시', '설비 간 연결선 표시'].map((layer) => (
          <label key={layer} className="flex items-center gap-2 text-sm py-1 text-text-dim/50">
            <input type="checkbox" disabled />
            {layer} · 준비 중
          </label>
        ))}
      </div>
    </aside>
  );
}
