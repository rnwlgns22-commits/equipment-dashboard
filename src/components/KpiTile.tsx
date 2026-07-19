import { useEffect, useRef } from 'react';
import { animate, useMotionValue, useTransform } from 'framer-motion';

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

export default function KpiTile({
  label,
  value,
  accentClass = 'text-text',
}: {
  label: string;
  value: string | number;
  accentClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs text-text-dim">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${accentClass}`}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </div>
    </div>
  );
}
