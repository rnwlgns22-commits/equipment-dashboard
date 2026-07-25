import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

// 애플 아이폰 페이지 참고 — 카드/리스트 항목이 스크롤로 화면에 들어올 때 아래에서
// 위로 올라오며 나타남. index로 살짝 스태거를 줌(2026-07-25).
export default function Reveal({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: (index % 6) * 0.05 }}
    >
      {children}
    </motion.div>
  );
}
