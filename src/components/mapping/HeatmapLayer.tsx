import { Circle } from 'react-konva';
import type { FailureStat, Placement } from '../../types';

// 별도 히트맵 라이브러리 없이, 고장빈도가 큰 설비 위에 반투명 방사형 그라디언트 원을
// 겹쳐서 "위험 집중 구역"을 근사한다 (설계.md §11.5 Phase C).
export default function HeatmapLayer({
  placements,
  imageWidth,
  imageHeight,
  statsById,
}: {
  placements: Placement[];
  imageWidth: number;
  imageHeight: number;
  statsById: Map<string, FailureStat>;
}) {
  return (
    <>
      {placements.map((p) => {
        const stat = statsById.get(p.설비ID);
        const count = stat?.최근1년건수 ?? 0;
        if (count <= 0) return null;
        const radius = 50 + Math.min(count, 6) * 22;
        const x = (p.xPct / 100) * imageWidth;
        const y = (p.yPct / 100) * imageHeight;
        return (
          <Circle
            key={p.설비ID}
            x={x}
            y={y}
            radius={radius}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={radius}
            fillRadialGradientColorStops={[
              0, 'rgba(248,113,113,0.6)',
              0.6, 'rgba(248,113,113,0.25)',
              1, 'rgba(248,113,113,0)',
            ]}
            listening={false}
          />
        );
      })}
    </>
  );
}
