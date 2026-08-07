import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

// 애플 아이폰 페이지 참고 — 카드/리스트 항목이 스크롤로 화면에 들어올 때 아래에서
// 위로 올라오며 나타남. index로 살짝 스태거를 줌. once: false라 시야에서 벗어났다가
// 다시 들어올 때마다(위로 스크롤해도) 매번 다시 재생됨(2026-07-25).
//
// 2026-08-07 입체화: 위로 올라오기만 하던 걸 "아래쪽에서 눕혀진 채로 뒤에 있다가
// 세워지며 앞으로 나온다"로 바꿈(rotateX + z).
//
// 2026-08-07 각도 하향(가독성 지적): 처음에 8도로 넣었는데 설비목록·점검고장이력처럼
// 가로로 긴 바에서 글자가 읽기 힘들다는 지적을 받음. 원인은 각도 자체보다 비율 —
// rotateX의 사다리꼴 왜곡은 (요소 너비 / perspective)에 비례해서 커지므로, 같은 8도라도
// 좁은 카드에선 얌전하고 화면폭을 꽉 채운 바에선 글자가 확 일그러진다. 게다가
// once:false라 스크롤할 때마다 매번 다시 재생돼서 그 왜곡을 계속 보게 됨.
// 그래서 (1) 기본 각도를 3도로 낮추고 (2) 원근을 멀리 잡아 왜곡 자체를 눌렀다.
// 입체감은 남기되 글자를 건드리지 않는 선.
const DEFAULT_TILT = 3;

export default function Reveal({
  children,
  index = 0,
  /** 등장 각도(도). 가로로 긴 바는 기본값으로 두고, 작고 도드라지게 할 카드만 올릴 것 */
  tilt = DEFAULT_TILT,
}: {
  children: ReactNode;
  index?: number;
  tilt?: number;
}) {
  // perspective는 "자기 자신"이 아니라 자식에게 적용되는 속성이라, 회전하는
  // 요소와 같은 div에 걸면 원근이 안 먹고 그냥 납작하게 눌린 것처럼 보인다.
  // 그래서 원근 컨테이너(바깥)와 회전 요소(안)를 반드시 분리(2026-08-07).
  //
  // 여기 원근은 전역 --persp(1000px)보다 훨씬 멀게 잡음 — 카메라가 멀수록 사다리꼴
  // 왜곡이 약해져서, 넓은 리스트 행에서도 글자가 평평하게 유지된다. 카드 호버
  // 틸트(Tilt3D)는 짧은 순간 손맛이 목적이라 가까운 원근을 그대로 쓰고, 이쪽은
  // 글을 읽는 중에 일어나는 애니메이션이라 기준이 다름.
  return (
    <div style={{ perspective: '2400px' }}>
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: tilt, z: -28 }}
        animate={{ opacity: 0, y: 40, rotateX: tilt, z: -28 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0, z: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: 'easeOut' } }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: (index % 6) * 0.05 }}
        style={{ transformStyle: 'preserve-3d', transformOrigin: 'center bottom' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
