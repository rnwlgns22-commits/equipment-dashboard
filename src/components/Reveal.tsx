import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

// 애플 아이폰 페이지 참고 — 카드/리스트 항목이 스크롤로 화면에 들어올 때 아래에서
// 위로 올라오며 나타남. index로 살짝 스태거를 줌. once: false라 시야에서 벗어났다가
// 다시 들어올 때마다(위로 스크롤해도) 매번 다시 재생됨(2026-07-25).
export default function Reveal({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: 'easeOut' } }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: (index % 6) * 0.05 }}
    >
      {children}
    </motion.div>
  );
}
