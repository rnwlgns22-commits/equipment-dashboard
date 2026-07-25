import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastType } from '../toastStore';

const STYLES: Record<ToastType, string> = {
  success: 'border-risk-low/40 bg-risk-low/10 text-risk-low',
  error: 'border-risk-high/40 bg-risk-high/10 text-risk-high',
  info: 'border-accent/40 bg-accent/10 text-accent',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  // 마스코트 도움말 버튼(bottom-5 right-5, h-14 w-14)과 안 겹치게 그 위쪽에 쌓음
  return (
    <div className="fixed bottom-24 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto max-w-sm rounded-xl border px-4 py-2.5 text-sm shadow-sm cursor-pointer ${STYLES[t.type]}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
