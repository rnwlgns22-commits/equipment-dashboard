import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import Tilt3D from './Tilt3D';
import { useT } from '../i18n';

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

// 펼칠 때(타일→모달)는 이 transition이 없어 framer 기본 스프링(바운스 포함,
// ~0.3~0.4초)을 썼고, 접을 때(모달→타일)는 타일 쪽에만 걸린 0.15s easeOut을
// 썼다 — 방향마다 속도·감쇠가 달라 최소화가 유독 뚝 끊기듯 어색해 보였음
// (2026-08-14 지적). 양쪽 motion.div에 같은 transition을 걸어 펼침/접힘을
// 대칭으로 맞춤. bounce:0으로 오버슈트 없는 매끄러운 스프링.
const CARD_TRANSITION = { type: 'spring', bounce: 0, duration: 0.35 } as const;

export default function KpiTile({
  label,
  value,
  accentClass = 'text-text',
  tint,
  detail,
  isOpen = false,
  onOpen,
  onClose,
}: {
  label: string;
  value: string | number;
  accentClass?: string;
  /** 강조할 타일만 색유리로. 나머지는 무채색이라 색 자체가 신호가 됨 */
  tint?: string;
  detail?: ReactNode; // 있으면 클릭해서 확장 카드로 펼칠 수 있음(없으면 예전처럼 정적 타일)
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const t = useT();
  const expandable = Boolean(detail);
  const layoutId = `kpi-card-${label}`;
  const valueNode = typeof value === 'number' ? <AnimatedNumber value={value} /> : value;

  // 배경 클릭·X 버튼 말고 ESC로도 닫을 수 있어야 함(2026-07-22 요청) — 열려있을 때만
  // 리스너를 붙이고 닫히면 바로 뗀다.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 라벨은 한 줄로 고정(truncate) — 영어 번역이 한국어 원문보다 2~4배 길어서(예:
  // "상태별" 19자 vs "By Status (Normal · Repairing · Stopped)" 40자) 줄바꿈을
  // 허용하면 좁은 그리드 칸에서 카드 높이가 언어마다 달라지고, 그 높이가 곧
  // layoutId 공유 레이아웃 전환(닫힌 카드 → 펼쳐진 모달)의 시작 크기라서 펼치는
  // 애니메이션 자체가 언어별로 달라 보였음(2026-08-14 발견). 한 줄 고정으로
  // 닫힌 카드 크기를 언어와 무관하게 통일해 애니메이션을 원래(한국어) 동작으로
  // 맞춤 — 잘린 전체 텍스트는 title로 확인 가능.
  const face = (
    <>
      <div className="text-xs text-text-dim truncate" title={label}>{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${accentClass}`}>{valueNode}</div>
    </>
  );

  return (
    <>
      <motion.div
        layoutId={expandable ? layoutId : undefined}
        transition={CARD_TRANSITION}
        className="persp"
      >
        <Tilt3D
          onClick={expandable ? onOpen : undefined}
          lift={Boolean(expandable)}
          style={tint ? ({ '--tint': tint } as React.CSSProperties) : undefined}
          className={`rounded-2xl border border-border bg-card depth-2 p-5 ${tint ? 'tint' : ''} ${
            expandable ? 'cursor-pointer depth-hover hover:border-white/20' : ''
          }`}
        >
          {face}
        </Tilt3D>
      </motion.div>

      {expandable &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              // Layout.tsx의 페이지 전환 motion.div가 z/scale에 transform을 걸어두는데,
              // 그 transform이 있는 조상 안에서는 position:fixed가 뷰포트가 아니라 그
              // 조상 박스 기준으로 계산돼(CSS 스펙) inset-0 배경이 화면 전체를 못 덮고
              // 페이지 하단부가 블러 없이 글자와 겹쳐 보였음(2026-08-14, 한/영 무관하게
              // 재현). document.body로 포털해 조상의 transform 영향권을 벗어나는 걸로
              // 해결 — GlobalSearch.tsx가 이미 같은 이유로 쓰던 패턴.
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 persp">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="absolute inset-0 bg-bg/80 backdrop-blur-md"
                />
                <motion.div
                  layoutId={layoutId}
                  transition={CARD_TRANSITION}
                  className="relative w-full max-w-lg max-h-[80vh] bg-card rounded-2xl overflow-hidden border border-border z-10 flex flex-col depth-4"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('닫기')}
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
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
