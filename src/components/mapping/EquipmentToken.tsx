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
          fill="#e5e7eb"
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
          fill="#e5e7eb"
        />
      )}
      {workOrderColor && (
        <Group
          x={14}
          y={-14}
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
