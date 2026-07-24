import { motion } from 'framer-motion';

export type TabOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

// 슬라이딩 인디케이터가 layoutId로 탭 사이를 이동 — 클릭할 때마다 밑줄이 순간이동
// 하던 걸(HistoryBrowser의 기존 border-b-2 탭) framer-motion spring으로 바꿔서
// 어느 탭이 활성인지 시선이 자연스럽게 따라가게 함(watermelon.sh 애니메이션 탭 참고,
// 2026-07-25).
export default function AnimatedTabs<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 같은 화면에 탭 그룹이 둘 이상이면 인디케이터가 서로 안 섞이도록 고유 id를 준다 */
  layoutId: string;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative px-3 py-2 text-sm transition-colors ${
              active ? 'text-accent' : 'text-text-dim hover:text-text'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && <span className="ml-1 opacity-70">({opt.count})</span>}
            {active && (
              <motion.span
                layoutId={`${layoutId}-indicator`}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
