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
  // 반지름을 고정 픽셀로 두면 도면 이미지 크기에 따라 결과가 극단적으로 달라짐 —
  // 작은 도면(수백px)에서는 화면 전체가 빨갛게 덮이고, 큰 도면(수천px, 폰카메라
  // 촬영본 등)에서는 점 하나로 안 보임(graphify 기반 코드리뷰로 발견, 2026-07-20).
  // 도면의 짧은 변 기준 비율로 잡아서 어떤 크기의 도면에도 비슷한 비중으로 보이게 함.
  const baseRadius = Math.min(imageWidth, imageHeight) * 0.06;

  return (
    <>
      {placements.map((p) => {
        const stat = statsById.get(p.설비ID);
        const count = stat?.최근1년건수 ?? 0;
        if (count <= 0) return null;
        const radius = baseRadius + Math.min(count, 6) * baseRadius * 0.4;
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
