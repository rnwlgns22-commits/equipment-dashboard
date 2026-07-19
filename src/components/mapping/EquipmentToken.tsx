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
}) {
  const x = (xPct / 100) * imageWidth;
  const y = (yPct / 100) * imageHeight;
  const color = statusColor(equipment.상태);
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
      draggable
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(equipment.설비ID)}
      onTap={() => onSelect(equipment.설비ID)}
    >
      <Circle radius={16} fill="#161a24" stroke={color} strokeWidth={selected ? 4 : 3} />
      <Circle radius={3} fill={color} />
      {showValue && (
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
      {showLabel && (
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
    </Group>
  );
}
