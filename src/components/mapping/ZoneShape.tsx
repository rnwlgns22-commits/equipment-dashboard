import { Line, Text } from 'react-konva';
import type { Zone } from '../../types';

export default function ZoneShape({
  zone,
  imageWidth,
  imageHeight,
  selected,
  onSelect,
}: {
  zone: Zone;
  imageWidth: number;
  imageHeight: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const pts = zone.points.map((p) => ({ x: (p.xPct / 100) * imageWidth, y: (p.yPct / 100) * imageHeight }));
  const flat = pts.flatMap((p) => [p.x, p.y]);
  const centroidX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const centroidY = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  return (
    <>
      <Line
        points={flat}
        closed
        fill={selected ? 'rgba(34,211,238,0.14)' : 'rgba(139,147,167,0.08)'}
        stroke={selected ? '#22d3ee' : '#8b93a7'}
        strokeWidth={selected ? 2 : 1}
        dash={[6, 4]}
        onClick={onSelect}
        onTap={onSelect}
      />
      <Text
        text={zone.name}
        x={centroidX}
        y={centroidY}
        offsetX={zone.name.length * 3.5}
        fill="#e5e7eb"
        fontSize={13}
        fontStyle="bold"
        listening={false}
      />
    </>
  );
}
