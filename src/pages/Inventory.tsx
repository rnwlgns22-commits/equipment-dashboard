import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import type { Part } from '../types';

const emptyForm = {
  자재명: '',
  규격: '',
  단위: 'EA',
  현재수량: '',
  안전재고: '',
  단가: '',
  보관위치: '',
  비고: '',
};
type FormState = typeof emptyForm;

function isLowStock(p: Part): boolean {
  return p.안전재고 !== undefined && p.현재수량 <= p.안전재고;
}

// 참고한 타 CMMS(Jump, N·Core, Dream 등)에 공통으로 있던 자재·재고관리를 이식.
// 입출고 원장(트랜잭션 로그)까지는 과함 — 단일 관리자 워크플로에선 "지금 몇 개
// 남았는지 + 안전재고 이하인지"만 즉시 보이면 충분하다고 판단해 현재수량을
// 직접 조정하는 스냅샷 모델로 단순화(법정점검 "오늘 완료" 버튼과 같은 취지).
export default function Inventory() {
  const parts = useAppStore((s) => s.parts);
  const equipments = useAppStore((s) => s.equipments);
  const addPart = useAppStore((s) => s.addPart);
  const updatePart = useAppStore((s) => s.updatePart);
  const deletePart = useAppStore((s) => s.deletePart);
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [linkTargets, setLinkTargets] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editLinkTargets, setEditLinkTargets] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const list = useMemo(
    () =>
      parts
        .filter((p) => !query || p.자재명.includes(query) || (p.보관위치 ?? '').includes(query))
        .sort((a, b) => {
          const lowA = isLowStock(a) ? 0 : 1;
          const lowB = isLowStock(b) ? 0 : 1;
          return lowA - lowB || a.자재명.localeCompare(b.자재명);
        }),
    [parts, query],
  );

  const lowStockCount = useMemo(() => parts.filter(isLowStock).length, [parts]);

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const 현재수량 = Number(form.현재수량);
    if (!form.자재명.trim() || !form.단위.trim() || Number.isNaN(현재수량) || 현재수량 < 0) return;
    addPart({
      id: `part-${Date.now()}`,
      자재명: form.자재명.trim(),
      규격: form.규격.trim() || undefined,
      단위: form.단위.trim(),
      현재수량,
      안전재고: form.안전재고 ? Number(form.안전재고) : undefined,
      단가: form.단가 ? Number(form.단가) : undefined,
      보관위치: form.보관위치.trim() || undefined,
      연결설비ID: linkTargets,
      비고: form.비고.trim() || undefined,
    });
    setForm(emptyForm);
    setLinkTargets([]);
    setAdding(false);
  };

  const startEditing = (p: Part) => {
    setEditingId(p.id);
    setEditForm({
      자재명: p.자재명,
      규격: p.규격 ?? '',
      단위: p.단위,
      현재수량: String(p.현재수량),
      안전재고: p.안전재고 !== undefined ? String(p.안전재고) : '',
      단가: p.단가 !== undefined ? String(p.단가) : '',
      보관위치: p.보관위치 ?? '',
      비고: p.비고 ?? '',
    });
    setEditLinkTargets(p.연결설비ID);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const 현재수량 = Number(editForm.현재수량);
    if (!editForm.자재명.trim() || !editForm.단위.trim() || Number.isNaN(현재수량) || 현재수량 < 0) return;
    updatePart(editingId, {
      자재명: editForm.자재명.trim(),
      규격: editForm.규격.trim() || undefined,
      단위: editForm.단위.trim(),
      현재수량,
      안전재고: editForm.안전재고 ? Number(editForm.안전재고) : undefined,
      단가: editForm.단가 ? Number(editForm.단가) : undefined,
      보관위치: editForm.보관위치.trim() || undefined,
      연결설비ID: editLinkTargets,
      비고: editForm.비고.trim() || undefined,
    });
    setEditingId(null);
  };

  const toggleEditLinkTarget = (id: string) => {
    setEditLinkTargets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const adjustQty = (p: Part, delta: number) => {
    updatePart(p.id, { 현재수량: Math.max(0, p.현재수량 + delta) });
  };

  const handleDelete = (p: Part) => {
    if (!window.confirm(`"${p.자재명}" 자재를 삭제할까요?`)) return;
    deletePart(p.id);
  };

  const toggleLinkTarget = (id: string) => {
    setLinkTargets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">자재·재고관리</h1>
        <p className="text-sm text-text-dim mt-1">
          예비부품·소모자재의 현재 재고와 안전재고를 관리합니다. {lowStockCount > 0 && (
            <span className="text-risk-high">재고부족 {lowStockCount}건</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="자재명·보관위치 검색"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm w-56 outline-none focus:border-accent/60"
        />
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition shrink-0"
        >
          {adding ? '닫기' : '+ 자재 추가'}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={submitAdd}
          className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        >
          <label className="block">
            <span className="text-xs text-text-dim">자재명 *</span>
            <input
              required
              value={form.자재명}
              onChange={(e) => setForm((f) => ({ ...f, 자재명: e.target.value }))}
              placeholder="예: V벨트 A형"
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">규격</span>
            <input
              value={form.규격}
              onChange={(e) => setForm((f) => ({ ...f, 규격: e.target.value }))}
              placeholder="예: A-38"
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">단위 *</span>
            <input
              required
              value={form.단위}
              onChange={(e) => setForm((f) => ({ ...f, 단위: e.target.value }))}
              placeholder="예: EA"
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">현재수량 *</span>
            <input
              required
              type="number"
              min={0}
              value={form.현재수량}
              onChange={(e) => setForm((f) => ({ ...f, 현재수량: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">안전재고</span>
            <input
              type="number"
              min={0}
              value={form.안전재고}
              onChange={(e) => setForm((f) => ({ ...f, 안전재고: e.target.value }))}
              placeholder="이 값 이하면 재고부족 표시"
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">단가(원)</span>
            <input
              type="number"
              min={0}
              value={form.단가}
              onChange={(e) => setForm((f) => ({ ...f, 단가: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">보관위치</span>
            <input
              value={form.보관위치}
              onChange={(e) => setForm((f) => ({ ...f, 보관위치: e.target.value }))}
              placeholder="예: 자재창고 A-3"
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">비고</span>
            <input
              value={form.비고}
              onChange={(e) => setForm((f) => ({ ...f, 비고: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <div className="block sm:col-span-2 lg:col-span-4">
            <span className="text-xs text-text-dim">사용 설비 (선택)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {equipments.length === 0 && <span className="text-xs text-text-dim">등록된 설비가 없습니다.</span>}
              {equipments.map((e) => (
                <button
                  key={e.설비ID}
                  type="button"
                  onClick={() => toggleLinkTarget(e.설비ID)}
                  className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                    linkTargets.includes(e.설비ID)
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border text-text-dim hover:text-text'
                  }`}
                >
                  {e.설비명}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition sm:col-span-2 lg:col-span-4"
          >
            등록
          </button>
        </form>
      )}

      <div className="space-y-2">
        {list.length === 0 && (
          <p className="text-sm text-text-dim text-center py-8">
            {parts.length === 0 ? '등록된 자재가 없습니다.' : '검색 조건에 맞는 자재가 없습니다.'}
          </p>
        )}
        {list.map((p) => {
          const low = isLowStock(p);
          const linked = p.연결설비ID.map((id) => equipmentsById.get(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));

          if (editingId === p.id) {
            return (
              <form
                key={p.id}
                onSubmit={saveEdit}
                className="rounded-xl border border-accent/50 bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
              >
                <label className="block">
                  <span className="text-xs text-text-dim">자재명</span>
                  <input
                    required
                    value={editForm.자재명}
                    onChange={(e) => setEditForm((f) => ({ ...f, 자재명: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">규격</span>
                  <input
                    value={editForm.규격}
                    onChange={(e) => setEditForm((f) => ({ ...f, 규격: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">단위</span>
                  <input
                    required
                    value={editForm.단위}
                    onChange={(e) => setEditForm((f) => ({ ...f, 단위: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">현재수량</span>
                  <input
                    required
                    type="number"
                    min={0}
                    value={editForm.현재수량}
                    onChange={(e) => setEditForm((f) => ({ ...f, 현재수량: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">안전재고</span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.안전재고}
                    onChange={(e) => setEditForm((f) => ({ ...f, 안전재고: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">단가(원)</span>
                  <input
                    type="number"
                    min={0}
                    value={editForm.단가}
                    onChange={(e) => setEditForm((f) => ({ ...f, 단가: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">보관위치</span>
                  <input
                    value={editForm.보관위치}
                    onChange={(e) => setEditForm((f) => ({ ...f, 보관위치: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">비고</span>
                  <input
                    value={editForm.비고}
                    onChange={(e) => setEditForm((f) => ({ ...f, 비고: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <div className="block sm:col-span-2 lg:col-span-4">
                  <span className="text-xs text-text-dim">사용 설비 (선택)</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {equipments.length === 0 && <span className="text-xs text-text-dim">등록된 설비가 없습니다.</span>}
                    {equipments.map((e) => (
                      <button
                        key={e.설비ID}
                        type="button"
                        onClick={() => toggleEditLinkTarget(e.설비ID)}
                        className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                          editLinkTargets.includes(e.설비ID)
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-border text-text-dim hover:text-text'
                        }`}
                      >
                        {e.설비명}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-border text-sm px-4 py-2 text-text-dim hover:text-text"
                  >
                    취소
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={p.id}
              className={`rounded-xl border px-4 py-3 ${low ? 'border-risk-high/50 bg-risk-high/5' : 'border-border bg-card'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{p.자재명}</span>
                    {p.규격 && <span className="text-xs text-text-dim">· {p.규격}</span>}
                    {low && (
                      <span className="text-xs rounded-full px-2 py-0.5 bg-risk-high/15 text-risk-high">재고부족</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-text-dim">
                    현재수량 {p.현재수량}{p.단위}
                    {p.안전재고 !== undefined && ` · 안전재고 ${p.안전재고}${p.단위}`}
                    {p.단가 !== undefined && ` · 단가 ${p.단가.toLocaleString()}원`}
                    {p.보관위치 && ` · ${p.보관위치}`}
                  </div>
                  {linked.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {linked.map((e) => (
                        <Link
                          key={e.설비ID}
                          to={`/equipment/${e.설비ID}`}
                          className="text-xs text-accent hover:underline"
                        >
                          {e.설비명}
                        </Link>
                      ))}
                    </div>
                  )}
                  {p.비고 && <p className="mt-1 text-sm whitespace-pre-wrap">{p.비고}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => adjustQty(p, -1)}
                    aria-label={`${p.자재명} 재고 1 감소`}
                    title="재고 1 감소"
                    className="h-6 w-6 rounded border border-border text-xs text-text-dim hover:text-text hover:border-accent/50"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustQty(p, 1)}
                    aria-label={`${p.자재명} 재고 1 증가`}
                    title="재고 1 증가"
                    className="h-6 w-6 rounded border border-border text-xs text-text-dim hover:text-text hover:border-accent/50"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(p)}
                    className="text-xs text-text-dim hover:text-accent"
                    aria-label={`${p.자재명} 수정`}
                    title="수정"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="text-xs text-text-dim hover:text-risk-high"
                    aria-label={`${p.자재명} 삭제`}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
