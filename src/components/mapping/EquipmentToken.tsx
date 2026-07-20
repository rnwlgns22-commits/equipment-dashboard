import { Group, Circle, Text } from 'react-konva';
import type Konva from 'konva';
import type { Equipment } from '../../types';
import { mockTemperature, statusColor } from '../../lib/mockTelemetry';

export default function EquipmentToken({
  equipment,
  xPct,
  yPct,
  imageWidth,
  imageHeight,
  showLabel,
  showValue,
  selected,
  onSelect,
  onMove,
  workOrderColor,
  onWorkOrderClick,
  dim,
  overrideColor,
  scale,
}: {
  equipment: Equipment;
  xPct: number;
  yPct: number;
  imageWidth: number;
  imageHeight: number;
  showLabel: boolean;
  showValue: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, xPct: number, yPct: number) => void;
  workOrderColor?: string; // 유지보수 모드에서만 전달 — 있으면 배지 렌더
  onWorkOrderClick?: () => void;
  dim?: boolean; // 히트맵 모드에서 토큰을 작게/흐리게
  overrideColor?: string; // 타임라인 모드에서 그 시점 상태색으로 링 색 대체
  scale?: number; // 사용자가 팝오버에서 조절한 아이콘 크기 배율, 없으면 1
}) {
  const x = (xPct / 100) * imageWidth;
  const y = (yPct / 100) * imageHeight;
  const color = overrideColor ?? statusColor(equipment.상태);
  const temp = mockTemperature(equipment.설비ID);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newXPct = (node.x() / imageWidth) * 100;
    const newYPct = (node.y() / imageHeight) * 100;
    onMove(equipment.설비ID, newXPct, newYPct);
  };

  return (
    <Group
      x={x}
      y={y}
      scaleX={scale ?? 1}
      scaleY={scale ?? 1}
      opacity={dim ? 0.55 : 1}
      draggable
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(equipment.설비ID)}
      onTap={() => onSelect(equipment.설비ID)}
    >
      <Circle radius={dim ? 10 : 16} fill="#161a24" stroke={color} strokeWidth={selected ? 4 : 3} />
      <Circle radius={dim ? 2 : 3} fill={color} />
      {showValue && !dim && (
        <Text
          text={`${temp}°`}
          y={20}
          offsetX={14}
          width={28}
          align="center"
          fontSize={11}
          fill="#111827"
          stroke="#ffffff"
          strokeWidth={2.5}
          fillAfterStrokeEnabled
          fontStyle="bold"
        />
      )}
      {showLabel && !dim && (
        <Text
          text={equipment.설비명}
          y={-34}
          offsetX={60}
          width={120}
          align="center"
          fontSize={12}
          fill="#111827"
          stroke="#ffffff"
          strokeWidth={2.5}
          fillAfterStrokeEnabled
          fontStyle="bold"
        />
      )}
      {workOrderColor && (
        <Group
          x={14}
          y={-14}
          // 부모 Group이 draggable이라, click/tap의 cancelBubble만으로는 드래그 시작을
          // 못 막는다 — Konva는 드래그를 mousedown/touchstart 시점에 시작하기 때문에
          // (클릭 이벤트 체계와 별개), 배지를 누르면 상태 순환 대신 설비가 끌려다니는
          // 문제가 있었음(2026-07-20 코드리뷰에서 발견). mousedown/touchstart 단계에서
          // 미리 끊어야 함.
          onMouseDown={(e) => {
            e.cancelBubble = true;
          }}
          onTouchStart={(e) => {
            e.cancelBubble = true;
          }}
          onClick={(e) => {
            e.cancelBubble = true;
            onWorkOrderClick?.();
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onWorkOrderClick?.();
          }}
        >
          <Circle radius={10} fill={workOrderColor} stroke="#161a24" strokeWidth={1.5} />
          <Text text="🔧" fontSize={12} offsetX={6} offsetY={6} listening={false} />
        </Group>
      )}
    </Group>
  );
}
