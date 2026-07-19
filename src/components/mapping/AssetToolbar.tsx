import { useMemo, useState } from 'react';
import type { Category, Equipment } from '../../types';

const CATEGORIES: Category[] = ['공조', '냉난방', '급배수', '전기', '소방', '승강기', '통신', '기타'];

export default function AssetToolbar({
  equipments,
  placedIds,
}: {
  equipments: Equipment[];
  placedIds: Set<string>;
}) {
  const [query, setQuery] = useState('');

  const unplaced = useMemo(
    () => equipments.filter((e) => !placedIds.has(e.설비ID)),
    [equipments, placedIds],
  );

  const filtered = unplaced.filter(
    (e) => !query || e.설비명.includes(query) || e.설비ID.includes(query),
  );

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: filtered.filter((e) => e.분류 === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="w-64 shrink-0 border-l border-border bg-bg-soft flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium mb-2">설비 자산</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="설비명·ID 검색"
          className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent/60"
        />
        <p className="text-xs text-text-dim mt-2">
          도면 위로 끌어다 놓으면 배치됩니다. 배치된 설비는 목록에서 사라집니다.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {grouped.length === 0 && (
          <p className="text-xs text-text-dim text-center py-6">
            {unplaced.length === 0 ? '모든 설비가 배치되었습니다.' : '검색 결과가 없습니다.'}
          </p>
        )}
        {grouped.map(({ cat, items }) => (
          <div key={cat}>
            <div className="text-xs text-text-dim mb-1.5">{cat}</div>
            <div className="space-y-1.5">
              {items.map((e) => (
                <div
                  key={e.설비ID}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('text/plain', e.설비ID);
                    ev.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="cursor-grab active:cursor-grabbing rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-accent/50 transition-colors"
                  title="끌어서 도면에 배치"
                >
                  <div className="truncate">{e.설비명}</div>
                  <div className="text-xs text-text-dim">{e.설비ID}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
