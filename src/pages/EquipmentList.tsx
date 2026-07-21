import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { computeFailureStats } from '../lib/stats';
import type { Category, EquipmentStatus } from '../types';

const CATEGORIES: Category[] = ['공조', '냉난방', '급배수', '전기', '소방', '승강기', '통신', '기타'];
const STATUSES: EquipmentStatus[] = ['정상', '수리중', '정지', '폐기'];

export default function EquipmentList() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const deleteEquipment = useAppStore((s) => s.deleteEquipment);
  const { stats } = useMemo(() => computeFailureStats(histories), [histories]);
  const riskOf = useMemo(() => new Map(stats.map((s) => [s.설비ID, s.위험등급])), [stats]);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('전체');
  const [site, setSite] = useState<string>('전체');
  const [status, setStatus] = useState<string>('전체');

  const sites = useMemo(
    () => ['전체', ...new Set(equipments.map((e) => e.사이트 || '미분류'))],
    [equipments],
  );

  const filtered = equipments.filter((e) => {
    if (category !== '전체' && e.분류 !== category) return false;
    if (site !== '전체' && (e.사이트 || '미분류') !== site) return false;
    if (status !== '전체' && e.상태 !== status) return false;
    if (query && !e.설비명.includes(query) && !e.설비ID.includes(query)) return false;
    return true;
  });

  // 목록이 늘어나면 하나씩 상세페이지 들어가서 지우는 게 번거로워서(2026-07-21 요청)
  // 카드마다 체크박스 + 상단 일괄삭제 추가. 필터가 바뀌어도 선택은 그대로 유지 —
  // 화면에 안 보여도 "선택 삭제"를 누르면 선택된 전체가 지워짐(필터 view와 무관).
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.설비ID));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((e) => next.delete(e.설비ID));
      } else {
        filtered.forEach((e) => next.add(e.설비ID));
      }
      return next;
    });
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`선택한 설비 ${selected.size}개를 삭제할까요? 관련 이력은 고아 이력으로 남습니다.`)) {
      return;
    }
    selected.forEach((id) => deleteEquipment(id));
    setSelected(new Set());
  };

  return (
    <div className="p-6 md:p-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">설비 목록</h1>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="설비명·ID 검색"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm w-48 outline-none focus:border-accent/60"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option>전체</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={site}
          onChange={(e) => setSite(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {sites.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option>전체</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-text-dim">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
          전체선택
        </label>
        <span className="self-center text-xs text-text-dim">{filtered.length}건</span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm">
          <span>{selected.size}개 선택됨</span>
          <div className="flex gap-3 shrink-0">
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-text-dim hover:text-text">
              선택 해제
            </button>
            <button type="button" onClick={bulkDelete} className="text-xs text-risk-high hover:underline">
              선택 삭제
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((e) => {
          const risk = riskOf.get(e.설비ID);
          return (
            <Link
              key={e.설비ID}
              to={`/equipment/${e.설비ID}`}
              className="rounded-xl border border-border bg-card p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected.has(e.설비ID)}
                    onClick={(ev) => ev.stopPropagation()}
                    onChange={() => toggleSelect(e.설비ID)}
                    aria-label={`${e.설비명} 선택`}
                    className="shrink-0"
                  />
                  <span className="text-xs text-text-dim truncate">{e.설비ID}</span>
                </span>
                {risk && risk !== '하' && (
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      risk === '상' ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-mid/15 text-risk-mid'
                    }`}
                  >
                    위험 {risk}
                  </span>
                )}
              </div>
              <div className="mt-1 font-medium truncate">{e.설비명}</div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-text-dim">
                <span className="rounded-full border border-border px-2 py-0.5">{e.분류}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{e.사이트 || '미분류'}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{e.상태}</span>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-text-dim col-span-full py-8 text-center">조건에 맞는 설비가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
