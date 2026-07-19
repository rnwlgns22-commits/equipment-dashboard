import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`rounded-2xl border border-border bg-card p-5 hover:border-white/15 transition-colors ${className}`}
    >
      {title && <h3 className="text-sm font-medium text-text-dim mb-4">{title}</h3>}
      {children}
    </motion.div>
  );
}
