import type { ChangeEvent } from 'react';
import type { Floorplan, ViewMode } from '../../types';

const MODE_LABELS: { mode: ViewMode; label: string }[] = [
  { mode: '일반', label: '일반 상태 모드' },
  { mode: '유지보수', label: '유지보수 모드' },
  { mode: '히트맵', label: '히트맵 모드' },
  { mode: '타임라인', label: '히스토리 타임라인' },
];

export default function ControlPanel({
  floorplans,
  activeFloorplanId,
  onSelectFloorplan,
  onRemoveFloorplan,
  onUpload,
  viewMode,
  onChangeViewMode,
  showLabels,
  onToggleLabels,
  showValues,
  onToggleValues,
  showConnections,
  onToggleConnections,
  showZones,
  onToggleZones,
  drawingZone,
  draftPointCount,
  onStartDrawingZone,
  onFinishDrawingZone,
  onCancelDrawingZone,
}: {
  floorplans: Floorplan[];
  activeFloorplanId: string | null;
  onSelectFloorplan: (id: string) => void;
  onRemoveFloorplan: (id: string) => void;
  onUpload: (file: File) => void;
  viewMode: ViewMode;
  onChangeViewMode: (m: ViewMode) => void;
  showLabels: boolean;
  onToggleLabels: (v: boolean) => void;
  showValues: boolean;
  onToggleValues: (v: boolean) => void;
  showConnections: boolean;
  onToggleConnections: (v: boolean) => void;
  showZones: boolean;
  onToggleZones: (v: boolean) => void;
  drawingZone: boolean;
  draftPointCount: number;
  onStartDrawingZone: () => void;
  onFinishDrawingZone: () => void;
  onCancelDrawingZone: () => void;
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
              <div key={f.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectFloorplan(f.id)}
                  className={`flex-1 min-w-0 truncate text-left rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    f.id === activeFloorplanId
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-dim hover:bg-white/5 hover:text-text'
                  }`}
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFloorplan(f.id)}
                  className="shrink-0 text-text-dim hover:text-risk-high px-1.5 py-1.5 text-xs"
                  aria-label={`${f.name} 도면 삭제`}
                  title="도면 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium mb-2">보기 모드</div>
        <div className="space-y-1.5">
          {MODE_LABELS.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeViewMode(mode)}
              className={`w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors ${
                viewMode === mode
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-dim hover:bg-white/5 hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium mb-2">구역(지오펜싱)</div>
        {!drawingZone ? (
          <button
            type="button"
            onClick={onStartDrawingZone}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent/50 hover:text-accent transition-colors"
          >
            + 구역 그리기 시작
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-text-dim">점 {draftPointCount}개 찍음 (3개 이상 필요)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onFinishDrawingZone}
                disabled={draftPointCount < 3}
                className="flex-1 rounded-lg bg-accent text-bg text-sm py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                완료
              </button>
              <button
                type="button"
                onClick={onCancelDrawingZone}
                className="flex-1 rounded-lg border border-border text-sm py-1.5 text-text-dim hover:text-text"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="text-sm font-medium mb-2">레이어</div>
        <label className="flex items-center gap-2 text-sm py-1">
          <input type="checkbox" checked={showLabels} onChange={(e) => onToggleLabels(e.target.checked)} />
          설비명 표시
        </label>
        <label className="flex items-center gap-2 text-sm py-1">
          <input type="checkbox" checked={showZones} onChange={(e) => onToggleZones(e.target.checked)} />
          구역 경계선 표시
        </label>
        <label className="flex items-center gap-2 text-sm py-1">
          <input type="checkbox" checked={showValues} onChange={(e) => onToggleValues(e.target.checked)} />
          데이터 수치 표시
        </label>
        <label className="flex items-center gap-2 text-sm py-1">
          <input
            type="checkbox"
            checked={showConnections}
            onChange={(e) => onToggleConnections(e.target.checked)}
          />
          설비 간 연결선 표시
        </label>
      </div>
    </aside>
  );
}
