import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';

// 호버 시 카드가 앞으로 떠오르는 래퍼(2026-08-07 도입, 2026-08-14 기울기 제거 — 총괄자 지적).
//
// 원래는 포인터 위치를 따라 rotateX/rotateY로 기울이는 3D 틸트였으나, 화면
// 전체가 기우는 느낌이 싫다는 지적으로 회전은 완전히 뺐다. translateZ로
// 앞으로 튀어나오는 "pop out" 느낌만 남긴다.
//
// 구현상 주의점 두 가지:
//  1. 터치 기기(hover 불가)에서는 탭할 때 카드가 튀어 보이기만 하므로 아예 끔.
//  2. prefers-reduced-motion도 확인(CSS 쪽에도 안전망이 있지만, 여기서 막으면
//     핸들러 자체가 값을 안 건드려 조용히 평면으로 남는다).
const canPop = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Tilt3D({
  children,
  className = '',
  style,
  lift = true,
  onClick,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 호버 시 앞으로 떠오르는 효과. 목록 안에서 촘촘히 쓸 땐 끄기 */
  lift?: boolean;
  onClick?: () => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'onClick'>) {
  const ref = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(() => {
    const el = ref.current;
    if (!el || !canPop() || !lift) return;
    el.style.setProperty('--tz', `var(--lift)`);
  }, [lift]);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tz', '0px');
  }, []);

  return (
    <div
      ref={ref}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onClick={onClick}
      className={`tilt-3d relative ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        transform: 'perspective(var(--persp)) translateZ(var(--tz, 0px))',
        transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease-out, border-color 0.3s ease-out',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
