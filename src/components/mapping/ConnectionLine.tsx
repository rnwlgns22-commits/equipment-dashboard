import { useEffect, useRef } from 'react';
import { Line } from 'react-konva';
import Konva from 'konva';

export default function ConnectionLine({
  points,
  selected,
  onSelect,
}: {
  points: number[];
  selected: boolean;
  onSelect: () => void;
}) {
  const lineRef = useRef<Konva.Line>(null);
  const animRef = useRef<Konva.Animation | null>(null);

  useEffect(() => {
    if (!selected || !lineRef.current) return;
    const layer = lineRef.current.getLayer();
    if (!layer) return;
    const anim = new Konva.Animation((frame) => {
      if (!lineRef.current || !frame) return;
      lineRef.current.dashOffset(-((frame.time / 40) % 24));
    }, layer);
    anim.start();
    animRef.current = anim;
    return () => {
      anim.stop();
      animRef.current = null;
    };
  }, [selected]);

  return (
    <Line
      ref={lineRef}
      points={points}
      stroke={selected ? '#22d3ee' : '#4b5563'}
      strokeWidth={selected ? 3 : 2}
      dash={[10, 6]}
      hitStrokeWidth={14}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}
