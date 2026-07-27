import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { unifiedSearch, type SearchHit, type SearchKind } from '../lib/search';

const KIND_LABEL: Record<SearchKind, string> = {
  설비: '설비',
  이력: '점검·수리 이력',
  자재: '자재·재고',
};
const KIND_ORDER: SearchKind[] = ['설비', '이력', '자재'];

// 통합검색(2026-07-27) — 설비·이력·자재를 한 번에 가로질러 찾을 수 있게 함
// (_웹서비스설계/할일.md에 보류돼 있던 항목). Layout에 한 번만 마운트해서
// Ctrl/⌘+K가 어느 화면에서든 동작하게 한다. 이력·자재는 상세 페이지가 없어서
// 선택하면 목록 화면으로 이동한 뒤 그 화면의 검색창에 제목/자재명을 채워 넣는다
// (HistoryBrowser.tsx·Inventory.tsx의 presetQuery 초기화 참고).
export default function GlobalSearch() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const parts = useAppStore((s) => s.parts);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(
    () => unifiedSearch(query, equipments, histories, parts),
    [query, equipments, histories, parts],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = (hit: SearchHit) => {
    setOpen(false);
    navigate(hit.to, hit.presetQuery ? { state: { presetQuery: hit.presetQuery } } : undefined);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hits[activeIndex]) select(hits[activeIndex]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-dim hover:border-accent/50 hover:text-text transition-colors"
      >
        <span aria-hidden>🔍</span>
        <span className="flex-1 text-left">설비·이력·자재 검색</span>
        <span className="hidden sm:inline text-[10px] rounded border border-border px-1.5 py-0.5 leading-none">
          ⌘K
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-24"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="설비명·ID·위치·점검이력·자재 검색…"
                aria-label="통합검색"
                className="w-full px-4 py-3 text-sm bg-transparent outline-none border-b border-border"
              />
              <div className="max-h-96 overflow-y-auto">
                {query.trim() === '' && (
                  <p className="px-4 py-6 text-xs text-text-dim text-center">
                    설비·점검이력·자재를 한 번에 검색합니다.
                  </p>
                )}
                {query.trim() !== '' && hits.length === 0 && (
                  <p className="px-4 py-6 text-xs text-text-dim text-center">
                    &ldquo;{query}&rdquo;에 대한 검색 결과가 없습니다.
                  </p>
                )}
                {KIND_ORDER.map((kind) => {
                  const group = hits.filter((h) => h.kind === kind);
                  if (group.length === 0) return null;
                  return (
                    <div key={kind} className="py-1">
                      <div className="px-4 py-1 text-[10px] uppercase tracking-wide text-text-dim">
                        {KIND_LABEL[kind]}
                      </div>
                      {group.map((h) => {
                        const idx = hits.indexOf(h);
                        return (
                          <button
                            key={h.key}
                            type="button"
                            onClick={() => select(h)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full text-left px-4 py-2 text-sm flex flex-col gap-0.5 ${
                              idx === activeIndex ? 'bg-accent/15 text-accent' : 'hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{h.title}</span>
                            <span className="text-xs text-text-dim truncate">{h.subtitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
