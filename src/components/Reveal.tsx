import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

// 애플 아이폰 페이지 참고 — 카드/리스트 항목이 스크롤로 화면에 들어올 때 아래에서
// 위로 올라오며 나타남. index로 살짝 스태거를 줌. once: false라 시야에서 벗어났다가
// 다시 들어올 때마다(위로 스크롤해도) 매번 다시 재생됨(2026-07-25).
//
// 2026-08-07 입체화: 위로 올라오기만 하던 걸 "아래쪽에서 눕혀진 채로 뒤에 있다가
// 세워지며 앞으로 나온다"로 바꿈(rotateX + z). 3D 사이트들이 스크롤을 서사 장치로
// 쓰는 방식 중 가장 비용이 싼 것 — 카드 내용은 그대로 두고 등장만 공간에서 일어남.
// 각도는 8도. 이보다 크면 표 안의 글자가 등장하는 동안 읽히지 않는다.
export default function Reveal({ children, index = 0 }: { children: ReactNode; index?: number }) {
  // perspective는 "자기 자신"이 아니라 자식에게 적용되는 속성이라, 회전하는
  // 요소와 같은 div에 걸면 원근이 안 먹고 그냥 납작하게 눌린 것처럼 보인다.
  // 그래서 원근 컨테이너(바깥)와 회전 요소(안)를 반드시 분리(2026-08-07).
  return (
    <div className="persp">
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 8, z: -70 }}
        animate={{ opacity: 0, y: 40, rotateX: 8, z: -70 }}
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
