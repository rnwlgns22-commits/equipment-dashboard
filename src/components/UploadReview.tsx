import type { Category } from '../types';
import type { EquipmentCandidate, FailedCandidate, HistoryCandidate } from '../lib/uploadPipeline';

const CATEGORIES: Category[] = ['공조', '냉난방', '급배수', '전기', '소방', '승강기', '통신', '기타'];

export default function UploadReview({
  equipmentCandidates,
  historyCandidates,
  failed,
  onUpdateEquipment,
  onUpdateHistory,
  equipmentOptions,
  onCommit,
  onCancel,
}: {
  equipmentCandidates: EquipmentCandidate[];
  historyCandidates: HistoryCandidate[];
  failed: FailedCandidate[];
  onUpdateEquipment: (key: string, patch: Partial<EquipmentCandidate>) => void;
  onUpdateHistory: (key: string, patch: Partial<HistoryCandidate>) => void;
  equipmentOptions: { ref: string; label: string }[];
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">업로드 검토</h2>
          <p className="text-xs text-text-dim mt-1">
            자동으로 분류한 결과입니다. 필요하면 고치고 아래에서 반영하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-dim hover:text-text"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onCommit}
            className="rounded-lg bg-accent text-bg px-4 py-2 text-sm font-medium hover:brightness-110"
          >
            전체 반영 ({equipmentCandidates.length + historyCandidates.length}건)
          </button>
        </div>
      </div>

      {equipmentCandidates.length === 0 && historyCandidates.length === 0 && failed.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-dim">
          지원하는 형식(hwp/hwpx/xls/xlsx/pdf/pptx/docx)의 파일을 찾지 못했습니다.
          다른 폴더를 다시 골라 보세요.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-sm font-medium mb-2">설비로 인식 ({equipmentCandidates.length})</div>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {equipmentCandidates.map((c) => (
              <div key={c.key} className="rounded-lg border border-border p-2 space-y-1.5">
                <div className="text-xs text-text-dim truncate" title={c.relativePath}>
                  {c.fileName}
                </div>
                <input
                  value={c.name}
                  onChange={(e) => onUpdateEquipment(c.key, { name: e.target.value })}
                  className="w-full rounded border border-border bg-bg-soft px-2 py-1 text-sm"
                />
                <div className="flex gap-1.5">
                  <select
                    value={c.category}
                    onChange={(e) => onUpdateEquipment(c.key, { category: e.target.value as Category })}
                    className="flex-1 rounded border border-border bg-bg-soft px-2 py-1 text-xs"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    value={c.site}
                    onChange={(e) => onUpdateEquipment(c.key, { site: e.target.value })}
                    placeholder="사이트"
                    className="flex-1 rounded border border-border bg-bg-soft px-2 py-1 text-xs"
                  />
                </div>
              </div>
            ))}
            {equipmentCandidates.length === 0 && <p className="text-xs text-text-dim py-4 text-center">없음</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-sm font-medium mb-2">이력으로 인식 ({historyCandidates.length})</div>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {historyCandidates.map((h) => (
              <div key={h.key} className="rounded-lg border border-border p-2 space-y-1.5">
                <div className="text-xs text-text-dim truncate" title={h.relativePath}>
                  {h.fileName}
                </div>
                <input
                  value={h.title}
                  onChange={(e) => onUpdateHistory(h.key, { title: e.target.value })}
                  className="w-full rounded border border-border bg-bg-soft px-2 py-1 text-sm"
                />
                <div className="flex gap-1.5">
                  <select
                    value={h.type}
                    onChange={(e) => onUpdateHistory(h.key, { type: e.target.value as '점검' | '수리' })}
                    className="rounded border border-border bg-bg-soft px-2 py-1 text-xs"
                  >
                    <option>점검</option>
                    <option>수리</option>
                  </select>
                  <input
                    type="date"
                    value={h.date}
                    onChange={(e) => onUpdateHistory(h.key, { date: e.target.value })}
                    className="flex-1 rounded border border-border bg-bg-soft px-2 py-1 text-xs"
                  />
                </div>
                <select
                  value={h.equipmentRef}
                  onChange={(e) => onUpdateHistory(h.key, { equipmentRef: e.target.value })}
                  className="w-full rounded border border-border bg-bg-soft px-2 py-1 text-xs"
                >
                  <option value="">설비 미지정</option>
                  {equipmentOptions.map((o) => (
                    <option key={o.ref} value={o.ref}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {historyCandidates.length === 0 && <p className="text-xs text-text-dim py-4 text-center">없음</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-sm font-medium mb-2">제외 · 실패 ({failed.length})</div>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {failed.map((f) => (
              <div key={f.key} className="rounded-lg border border-border p-2">
                <div className="text-xs truncate" title={f.relativePath}>
                  {f.fileName}
                </div>
                <div className="text-xs text-text-dim mt-0.5">{f.reason}</div>
              </div>
            ))}
            {failed.length === 0 && <p className="text-xs text-text-dim py-4 text-center">없음</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
