import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import type { HistoryRecord, HistoryType } from '../types';

const emptyAddForm = { 날짜: '', 유형: '점검' as HistoryType, 설비ID: '', 제목: '', 내용: '' };

export default function HistoryBrowser() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const addHistory = useAppStore((s) => s.addHistory);
  const updateHistory = useAppStore((s) => s.updateHistory);
  const deleteHistory = useAppStore((s) => s.deleteHistory);
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);

  const [tab, setTab] = useState<'전체' | '고아'>('전체');
  const [typeFilter, setTypeFilter] = useState<'전체' | HistoryType>('전체');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);

  // 지금까지 이력을 고친다는 게 "설비 재지정" 하나뿐이었음 — 날짜·유형·제목에 오타가
  // 있어도 지우고 다시 등록하는 것 말고는 방법이 없었음.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 날짜: '', 유형: '점검' as HistoryType, 제목: '' });

  const startEditing = (h: HistoryRecord) => {
    setEditingId(h.id);
    setEditForm({ 날짜: h.날짜, 유형: h.유형, 제목: h.제목 });
  };
  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.날짜 || !editForm.제목.trim()) return;
    updateHistory(editingId, { 날짜: editForm.날짜, 유형: editForm.유형, 제목: editForm.제목.trim() });
    setEditingId(null);
  };

  const orphanCount = useMemo(() => histories.filter((h) => !h.설비ID).length, [histories]);

  const filtered = useMemo(() => {
    return histories
      .filter((h) => (tab === '고아' ? !h.설비ID : true))
      .filter((h) => (typeFilter === '전체' ? true : h.유형 === typeFilter))
      .filter((h) => (from ? h.날짜 >= from : true))
      .filter((h) => (to ? h.날짜 <= to : true))
      .filter((h) => {
        if (!query) return true;
        const eqName = h.설비ID ? equipmentsById.get(h.설비ID)?.설비명 ?? '' : '';
        return h.제목.includes(query) || eqName.includes(query) || (h.설비ID ?? '').includes(query);
      })
      .sort((a, b) => b.날짜.localeCompare(a.날짜));
  }, [histories, tab, typeFilter, from, to, query, equipmentsById]);

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.날짜 || !addForm.제목.trim()) return;
    const record: HistoryRecord = {
      id: `hist-manual-${Date.now()}`,
      날짜: addForm.날짜,
      설비ID: addForm.설비ID || undefined,
      유형: addForm.유형,
      제목: addForm.제목.trim(),
      내용: addForm.내용.trim() || undefined,
      출처파일: '수기 입력',
    };
    addHistory(record);
    setAddForm(emptyAddForm);
    setAdding(false);
  };

  const handleDelete = (h: HistoryRecord) => {
    if (!window.confirm(`"${h.제목}" 이력을 삭제할까요?`)) return;
    deleteHistory(h.id);
  };

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">점검·수리 이력</h1>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition shrink-0"
        >
          {adding ? '닫기' : '+ 이력 추가'}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={submitAdd}
          className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
        >
          <label className="block">
            <span className="text-xs text-text-dim">날짜 *</span>
            <input
              required
              type="date"
              value={addForm.날짜}
              onChange={(e) => setAddForm((f) => ({ ...f, 날짜: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">유형</span>
            <select
              value={addForm.유형}
              onChange={(e) => setAddForm((f) => ({ ...f, 유형: e.target.value as HistoryType }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
            >
              <option>점검</option>
              <option>수리</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-text-dim">설비</span>
            <select
              value={addForm.설비ID}
              onChange={(e) => setAddForm((f) => ({ ...f, 설비ID: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
            >
              <option value="">설비 미지정</option>
              {equipments.map((e) => (
                <option key={e.설비ID} value={e.설비ID}>
                  {e.설비명} ({e.설비ID})
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-text-dim">제목 *</span>
            <input
              required
              value={addForm.제목}
              onChange={(e) => setAddForm((f) => ({ ...f, 제목: e.target.value }))}
              placeholder="예: 공조기 1호기 필터 교체"
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="text-xs text-text-dim">내용</span>
            <input
              value={addForm.내용}
              onChange={(e) => setAddForm((f) => ({ ...f, 내용: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition"
          >
            등록
          </button>
        </form>
      )}

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('전체')}
          className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === '전체' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text'
          }`}
        >
          전체 이력 ({histories.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('고아')}
          className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === '고아' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text'
          }`}
        >
          설비 매칭 안 됨 ({orphanCount})
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·설비명·ID 검색"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm w-52 outline-none focus:border-accent/60"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '전체' | HistoryType)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option>전체</option>
          <option>점검</option>
          <option>수리</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <span className="self-center text-text-dim text-sm">~</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <span className="ml-auto self-center text-xs text-text-dim">{filtered.length}건</span>
      </div>

      <div className="space-y-2">
        {filtered.map((h) =>
          editingId === h.id ? (
            <form
              key={h.id}
              onSubmit={saveEdit}
              className="flex items-center gap-2 rounded-xl border border-accent/50 bg-card px-4 py-3"
            >
              <input
                type="date"
                required
                value={editForm.날짜}
                onChange={(e) => setEditForm((f) => ({ ...f, 날짜: e.target.value }))}
                className="w-32 shrink-0 rounded border border-border bg-bg-soft px-2 py-1 text-xs"
              />
              <select
                value={editForm.유형}
                onChange={(e) => setEditForm((f) => ({ ...f, 유형: e.target.value as HistoryType }))}
                className="shrink-0 rounded border border-border bg-bg-soft px-2 py-1 text-xs"
              >
                <option>점검</option>
                <option>수리</option>
              </select>
              <input
                required
                value={editForm.제목}
                onChange={(e) => setEditForm((f) => ({ ...f, 제목: e.target.value }))}
                className="flex-1 min-w-0 rounded border border-border bg-bg-soft px-2 py-1 text-sm"
              />
              <button type="submit" className="text-xs text-accent hover:underline shrink-0">
                저장
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-xs text-text-dim hover:text-text shrink-0"
              >
                취소
              </button>
            </form>
          ) : (
            <div
              key={h.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-xs text-text-dim w-24 shrink-0">{h.날짜}</span>
              <span
                className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${
                  h.유형 === '수리' ? 'bg-risk-high/15 text-risk-high' : 'bg-accent/15 text-accent'
                }`}
              >
                {h.유형}
              </span>
              <span className="text-sm flex-1 truncate">{h.제목}</span>
              {h.설비ID ? (
                <Link to={`/equipment/${h.설비ID}`} className="text-xs text-accent hover:underline shrink-0">
                  {equipmentsById.get(h.설비ID)?.설비명 ?? h.설비ID}
                </Link>
              ) : (
                <select
                  value=""
                  onChange={(e) => e.target.value && updateHistory(h.id, { 설비ID: e.target.value })}
                  className="text-xs rounded-lg border border-border bg-bg-soft px-2 py-1 shrink-0 max-w-[10rem]"
                  title="설비를 지정하면 고아 이력에서 빠집니다"
                >
                  <option value="">설비 지정…</option>
                  {equipments.map((e) => (
                    <option key={e.설비ID} value={e.설비ID}>
                      {e.설비명} ({e.설비ID})
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => startEditing(h)}
                className="text-xs text-text-dim hover:text-accent shrink-0"
                aria-label="이력 수정"
                title="수정"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => handleDelete(h)}
                className="text-xs text-text-dim hover:text-risk-high shrink-0"
                aria-label="이력 삭제"
                title="삭제"
              >
                ✕
              </button>
            </div>
          ),
        )}
        {filtered.length === 0 && (
          <p className="text-sm text-text-dim text-center py-8">조건에 맞는 이력이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
