import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import type { HistoryType } from '../types';

export default function HistoryBrowser() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);

  const [tab, setTab] = useState<'전체' | '고아'>('전체');
  const [typeFilter, setTypeFilter] = useState<'전체' | HistoryType>('전체');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');

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

  return (
    <div className="p-6 md:p-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">점검·수리 이력</h1>

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
        {filtered.map((h) => (
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
              <span className="text-xs text-text-dim shrink-0">설비 미지정</span>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-text-dim text-center py-8">조건에 맞는 이력이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
