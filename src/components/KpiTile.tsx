import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.6, ease: 'easeOut' });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => rounded.on('change', (v) => {
    if (ref.current) ref.current.textContent = v;
  }), [rounded]);

  return <span ref={ref}>0</span>;
}

// watermelon-ui의 expandable-profile-card 패턴(layoutId 공유 레이아웃 전환)을 이
// 프로젝트의 기존 framer-motion 의존성 + 테마 토큰으로 그대로 재현 — 새 패키지
// 설치 없이 재사용(2026-07-22 요청).
export default function KpiTile({
  label,
  value,
  accentClass = 'text-text',
  detail,
  isOpen = false,
  onOpen,
  onClose,
}: {
  label: string;
  value: string | number;
  accentClass?: string;
  detail?: ReactNode; // 있으면 클릭해서 확장 카드로 펼칠 수 있음(없으면 예전처럼 정적 타일)
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const expandable = Boolean(detail);
  const layoutId = `kpi-card-${label}`;
  const valueNode = typeof value === 'number' ? <AnimatedNumber value={value} /> : value;

  return (
    <>
      <motion.div
        layoutId={expandable ? layoutId : undefined}
        onClick={expandable ? onOpen : undefined}
        whileHover={expandable ? { y: -3 } : undefined}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors ${
          expandable ? 'cursor-pointer hover:border-white/20' : ''
        }`}
      >
        <div className="text-xs text-text-dim">{label}</div>
        <div className={`mt-2 text-3xl font-semibold tabular-nums ${accentClass}`}>{valueNode}</div>
      </motion.div>

      {expandable && (
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-bg/80 backdrop-blur-md"
              />
              <motion.div
                layoutId={layoutId}
                className="relative w-full max-w-lg max-h-[80vh] bg-card rounded-2xl overflow-hidden border border-border z-10 flex flex-col shadow-xl"
              >
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center bg-bg/50 hover:bg-white/10 rounded-full border border-border text-text transition-colors backdrop-blur-sm"
                >
                  ✕
                </button>
                <div className="p-6 overflow-y-auto">
                  <div className="text-xs text-text-dim">{label}</div>
                  <div className={`mt-1 text-4xl font-semibold tabular-nums ${accentClass}`}>{valueNode}</div>
                  <div className="mt-5 pt-5 border-t border-border text-sm">{detail}</div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
