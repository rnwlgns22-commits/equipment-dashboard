import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { addDaysUTC } from '../lib/dates';
import { dueStateOf } from '../lib/workOrders';
import type { InspectionKind, InspectionSchedule } from '../types';

const emptyForm = { 설비ID: '', 항목명: '', 주기일: '', 최근점검일: '', 점검사항: '' };
type FormState = typeof emptyForm;

// 법정점검(/legal-inspection)과 정기점검(/regular-inspection) 화면이 구조는 완전히
// 같고 "종류"만 다르므로 하나의 보드로 공유 — 각 페이지는 kind만 다르게 넘김.
export default function InspectionScheduleBoard({ kind, itemLabel }: { kind: InspectionKind; itemLabel: string }) {
  const equipments = useAppStore((s) => s.equipments);
  const schedules = useAppStore((s) => s.inspectionSchedules);
  const addInspectionSchedule = useAppStore((s) => s.addInspectionSchedule);
  const updateInspectionSchedule = useAppStore((s) => s.updateInspectionSchedule);
  const deleteInspectionSchedule = useAppStore((s) => s.deleteInspectionSchedule);
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);
  const now = useMemo(() => new Date(), []);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const list = useMemo(
    () =>
      schedules
        .filter((s) => s.종류 === kind)
        .sort((a, b) => (a.다음점검일 ?? '9999-99-99').localeCompare(b.다음점검일 ?? '9999-99-99')),
    [schedules, kind],
  );

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const 주기일 = Number(form.주기일);
    if (!form.설비ID || !form.항목명.trim() || !(주기일 > 0)) return;
    const 다음점검일 = form.최근점검일 ? addDaysUTC(form.최근점검일, 주기일) : undefined;
    addInspectionSchedule({
      id: `insp-${Date.now()}`,
      설비ID: form.설비ID,
      종류: kind,
      항목명: form.항목명.trim(),
      주기일,
      최근점검일: form.최근점검일 || undefined,
      다음점검일,
      점검사항: form.점검사항.trim() || undefined,
    });
    setForm(emptyForm);
    setAdding(false);
  };

  const startEditing = (s: InspectionSchedule) => {
    setEditingId(s.id);
    setEditForm({
      설비ID: s.설비ID,
      항목명: s.항목명,
      주기일: String(s.주기일),
      최근점검일: s.최근점검일 ?? '',
      점검사항: s.점검사항 ?? '',
    });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const 주기일 = Number(editForm.주기일);
    if (!editForm.항목명.trim() || !(주기일 > 0)) return;
    const 다음점검일 = editForm.최근점검일 ? addDaysUTC(editForm.최근점검일, 주기일) : undefined;
    updateInspectionSchedule(editingId, {
      항목명: editForm.항목명.trim(),
      주기일,
      최근점검일: editForm.최근점검일 || undefined,
      다음점검일,
      점검사항: editForm.점검사항.trim() || undefined,
    });
    setEditingId(null);
  };

  // 현장에서 점검을 실제로 마쳤을 때 한 번에 갱신 — 최근점검일을 오늘로, 다음점검일을
  // 주기일만큼 뒤로 재계산. 매핑 화면의 작업오더 상태 순환과 같은 "즉시 갱신" 취지.
  const markDoneToday = (s: InspectionSchedule) => {
    const today = now.toISOString().slice(0, 10);
    updateInspectionSchedule(s.id, { 최근점검일: today, 다음점검일: addDaysUTC(today, s.주기일) });
  };

  const handleDelete = (s: InspectionSchedule) => {
    if (!window.confirm(`"${s.항목명}" 항목을 삭제할까요?`)) return;
    deleteInspectionSchedule(s.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-dim">{list.length}건 등록됨</p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition shrink-0"
        >
          {adding ? '닫기' : '+ 항목 추가'}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={submitAdd}
          className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end"
        >
          <label className="block sm:col-span-2">
            <span className="text-xs text-text-dim">설비 *</span>
            <select
              required
              value={form.설비ID}
              onChange={(e) => setForm((f) => ({ ...f, 설비ID: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
            >
              <option value="">설비 선택…</option>
              {equipments.map((e) => (
                <option key={e.설비ID} value={e.설비ID}>
                  {e.설비명} ({e.설비ID})
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-text-dim">{itemLabel} *</span>
            <input
              required
              value={form.항목명}
              onChange={(e) => setForm((f) => ({ ...f, 항목명: e.target.value }))}
              placeholder={`예: ${itemLabel}`}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">주기(일) *</span>
            <input
              required
              type="number"
              min={1}
              value={form.주기일}
              onChange={(e) => setForm((f) => ({ ...f, 주기일: e.target.value }))}
              placeholder="예: 180"
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">최근 점검일</span>
            <input
              type="date"
              value={form.최근점검일}
              onChange={(e) => setForm((f) => ({ ...f, 최근점검일: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-text-dim">점검사항</span>
            <textarea
              value={form.점검사항}
              onChange={(e) => setForm((f) => ({ ...f, 점검사항: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition sm:col-span-2"
          >
            등록
          </button>
        </form>
      )}

      <div className="space-y-2">
        {list.length === 0 && (
          <p className="text-sm text-text-dim text-center py-8">등록된 항목이 없습니다.</p>
        )}
        {list.map((s) => {
          const due = dueStateOf(s.다음점검일, now);
          const eq = equipmentsById.get(s.설비ID);

          if (editingId === s.id) {
            return (
              <form
                key={s.id}
                onSubmit={saveEdit}
                className="rounded-xl border border-accent/50 bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end"
              >
                <div className="sm:col-span-2 text-xs text-text-dim">
                  {eq ? `${eq.설비명} (${eq.설비ID})` : s.설비ID}
                </div>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-text-dim">{itemLabel}</span>
                  <input
                    required
                    value={editForm.항목명}
                    onChange={(e) => setEditForm((f) => ({ ...f, 항목명: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">주기(일)</span>
                  <input
                    required
                    type="number"
                    min={1}
                    value={editForm.주기일}
                    onChange={(e) => setEditForm((f) => ({ ...f, 주기일: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-dim">최근 점검일</span>
                  <input
                    type="date"
                    value={editForm.최근점검일}
                    onChange={(e) => setEditForm((f) => ({ ...f, 최근점검일: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-text-dim">점검사항</span>
                  <textarea
                    value={editForm.점검사항}
                    onChange={(e) => setEditForm((f) => ({ ...f, 점검사항: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  />
                </label>
                <div className="sm:col-span-2 flex gap-2">
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
            <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {eq ? (
                      <Link to={`/equipment/${eq.설비ID}`} className="text-sm font-medium text-accent hover:underline truncate">
                        {eq.설비명}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-text-dim">(설비 없음)</span>
                    )}
                    <span className="text-xs text-text-dim">· {s.항목명}</span>
                    {due && (
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          due === 'overdue' ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-mid/15 text-risk-mid'
                        }`}
                      >
                        {due === 'overdue' ? '기한 지남' : '임박'}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-text-dim">
                    주기 {s.주기일}일 · 최근 {s.최근점검일 ?? '미실시'} · 다음 {s.다음점검일 ?? '-'}
                  </div>
                  {s.점검사항 && <p className="mt-1 text-sm whitespace-pre-wrap">{s.점검사항}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => markDoneToday(s)} className="text-xs text-accent hover:underline">
                    오늘 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(s)}
                    className="text-xs text-text-dim hover:text-accent"
                    aria-label={`${s.항목명} 수정`}
                    title="수정"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    className="text-xs text-text-dim hover:text-risk-high"
                    aria-label={`${s.항목명} 삭제`}
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
