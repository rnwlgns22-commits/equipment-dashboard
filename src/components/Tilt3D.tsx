import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';

// 포인터를 따라 카드가 기울어지는 3D 틸트 래퍼(2026-08-07).
//
// 레퍼런스 조사에서 상위 3D 사이트들이 공통으로 쓰던 "표면이 실제 물체처럼
// 빛을 받는다"는 인상을 만드는 최소 장치 — 기울기(rotateX/Y) + 커서 위치를
// 따라 움직이는 스페큘러 하이라이트(--mx/--my) 두 가지 조합.
//
// 구현상 주의점 세 가지:
//  1. 마우스가 움직일 때마다 setState를 하면 대시보드처럼 카드가 십수 개인
//     화면에서 리렌더가 폭발함. 그래서 상태 없이 ref로 DOM style을 직접 씀.
//  2. pointermove는 초당 수백 번 오므로 rAF로 프레임당 한 번만 반영.
//  3. 터치 기기(hover 불가)에서는 탭할 때 카드가 튀어 보이기만 하므로 아예 끔.
//     prefers-reduced-motion도 같이 확인(CSS 쪽에도 안전망이 있지만, 여기서
//     막아야 rAF 자체가 안 돌아 배터리를 안 씀).

// matchMedia 존재 여부까지 확인 — 없으면 틸트를 끄고 조용히 평면으로 동작한다.
// 이 함수는 포인터 이벤트 핸들러에서 불리므로 여기서 던지면 카드를 만지는 순간
// 화면 전체가 죽음. 장식 기능이 앱을 끌고 내려가면 안 됨.
const canTilt = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Tilt3D({
  children,
  className = '',
  style,
  max,
  lift = true,
  onClick,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 최대 기울기(도). 표가 들어간 넓은 카드는 3~4도로 낮추는 걸 권장 */
  max?: number;
  /** 호버 시 앞으로 떠오르는 효과. 목록 안에서 촘촘히 쓸 땐 끄기 */
  lift?: boolean;
  onClick?: () => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'onClick'>) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el || !canTilt()) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // 카드 중심 기준 -0.5 ~ 0.5 정규화 좌표
        const px = (clientX - r.left) / r.width;
        const py = (clientY - r.top) / r.height;
        const limit = max ?? (parseFloat(getComputedStyle(el).getPropertyValue('--tilt-max')) || 7);
        // 위쪽을 가리키면 카드 위쪽이 뒤로 눕도록 부호를 뒤집음(실물 감각)
        el.style.setProperty('--rx', `${-(py - 0.5) * 2 * limit}deg`);
        el.style.setProperty('--ry', `${(px - 0.5) * 2 * limit}deg`);
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
      });
    },
    [max],
  );

  const handleEnter = useCallback(() => {
    const el = ref.current;
    if (!el || !canTilt()) return;
    // 커서를 따라가는 동안엔 전환을 거의 없애야 손에 붙는 느낌이 남. 떠날 때
    // (handleLeave)는 다시 길게 돌려놔서 천천히 제자리로 돌아오게 함.
    el.style.setProperty('--tilt-dur', '0.08s');
    el.style.setProperty('--sheen-o', '1');
    if (lift) el.style.setProperty('--tz', `var(--lift)`);
  }, [lift]);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    // 원위치는 CSS transition이 부드럽게 처리 — 값만 0으로 되돌려 놓는다
    el.style.setProperty('--tilt-dur', '0.5s');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--tz', '0px');
    el.style.setProperty('--sheen-o', '0');
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onClick={onClick}
      className={`tilt-3d sheen relative ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        transform:
          'perspective(var(--persp)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateZ(var(--tz, 0px))',
        transition:
          'transform var(--tilt-dur, 0.5s) cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease-out, border-color 0.3s ease-out',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
