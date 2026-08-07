import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Tilt3D from './Tilt3D';

// 바깥 motion.div = 스크롤 진입 리빌(기존 동작 유지), 안쪽 Tilt3D = 포인터 틸트.
// 한 요소에 둘을 겹치면 framer가 쓰는 transform과 틸트 transform이 서로 덮어써서
// 리빌이 끊기므로 층을 나눔(2026-08-07 입체화 작업).
export default function Card({
  title,
  children,
  className = '',
  /** 표·차트가 꽉 찬 넓은 카드는 기울면 읽기 힘들어서 끌 수 있게 둠 */
  tilt = true,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  const surface = `rounded-2xl border border-border bg-card depth-2 depth-hover p-5 hover:border-white/15 ${className}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="persp"
    >
      {tilt ? (
        <Tilt3D max={4} className={surface}>
          {title && <h3 className="text-sm font-medium text-text-dim mb-4">{title}</h3>}
          {children}
        </Tilt3D>
      ) : (
        <div className={`relative transition-shadow ${surface}`}>
          {title && <h3 className="text-sm font-medium text-text-dim mb-4">{title}</h3>}
          {children}
        </div>
      )}
    </motion.div>
  );
}
