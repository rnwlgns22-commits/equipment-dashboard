import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import useImage from 'use-image';
import type Konva from 'konva';
import type { Equipment, Floorplan, Placement, Zone } from '../../types';
import EquipmentToken from './EquipmentToken';
import ConnectionLine from './ConnectionLine';
import ZoneShape from './ZoneShape';
import { computeConnections } from '../../lib/topology';
import mascotSurprised from '../../assets/mascot/surprised.png';

const MIN_SCALE = 0.15;
const MAX_SCALE = 8;

export default function FloorplanCanvas({
  floorplan,
  placements,
  equipments,
  equipmentsById,
  showLabels,
  showValues,
  showConnections,
  selectedId,
  onSelect,
  onMove,
  onDropEquipment,
  selectedConnectionKey,
  onSelectConnection,
  zones,
  showZones,
  selectedZoneId,
  onSelectZone,
  drawingZone,
  draftPoints,
  onAddDraftPoint,
}: {
  floorplan: Floorplan | null;
  placements: Placement[];
  equipments: Equipment[];
  equipmentsById: Map<string, Equipment>;
  showLabels: boolean;
  showValues: boolean;
  showConnections: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, xPct: number, yPct: number) => void;
  onDropEquipment: (id: string, xPct: number, yPct: number) => void;
  selectedConnectionKey: string | null;
  onSelectConnection: (key: string | null) => void;
  zones: Zone[];
  showZones: boolean;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  drawingZone: boolean;
  draftPoints: { xPct: number; yPct: number }[];
  onAddDraftPoint: (xPct: number, yPct: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [image] = useImage(floorplan?.imageDataUrl ?? '');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 도면이 바뀌면(또는 처음 로드되면) 화면에 꽉 차게 초기 배치.
  // image 로드(비동기)와 ResizeObserver 최초 측정(비동기)의 순서가 보장되지 않아서
  // size가 아직 0일 때 image가 먼저 도착하면 맞춰볼 기회를 한 번 놓칠 수 있음 —
  // 그래서 size도 의존성에 넣고, 도면이 바뀔 때마다 "한 번만 성공할 때까지" 재시도한다.
  // (매 리사이즈마다 다시 맞추면 사용자가 손으로 줌/팬한 걸 되돌려버리므로 fittedRef로 1회만)
  const fittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!image || !stageRef.current || size.width === 0 || size.height === 0) return;
    if (fittedRef.current === floorplan?.id) return;
    const stage = stageRef.current;
    const fitScale = Math.min(size.width / image.naturalWidth, size.height / image.naturalHeight) * 0.95;
    stage.scale({ x: fitScale, y: fitScale });
    stage.position({
      x: (size.width - image.naturalWidth * fitScale) / 2,
      y: (size.height - image.naturalHeight * fitScale) / 2,
    });
    stage.batchDraw();
    fittedRef.current = floorplan?.id ?? null;
  }, [image, floorplan?.id, size.width, size.height]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.08;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const worldFromClientPoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return null;
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    return {
      x: (px - stage.x()) / stage.scaleX(),
      y: (py - stage.y()) / stage.scaleY(),
    };
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!image) return;
    const 설비ID = e.dataTransfer.getData('text/plain');
    if (!설비ID) return;
    const world = worldFromClientPoint(e.clientX, e.clientY);
    if (!world) return;
    const xPct = (world.x / image.naturalWidth) * 100;
    const yPct = (world.y / image.naturalHeight) * 100;
    onDropEquipment(설비ID, xPct, yPct);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !image) return;
    if (drawingZone) {
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      onAddDraftPoint((pos.x / image.naturalWidth) * 100, (pos.y / image.naturalHeight) * 100);
      return;
    }
    if (e.target === stage) {
      onSelect(null);
      onSelectConnection(null);
      onSelectZone(null);
    }
  };

  const placedIds = useMemo(() => new Set(placements.map((p) => p.설비ID)), [placements]);
  const connections = useMemo(
    () => (showConnections ? computeConnections(equipments, placedIds) : []),
    [showConnections, equipments, placedIds],
  );
  const placementByEquip = useMemo(() => new Map(placements.map((p) => [p.설비ID, p])), [placements]);

  // 도면이 없을 때도 이 div(ref 대상)는 항상 마운트해둔다 — 조건부로 아예 안 그리면
  // ResizeObserver가 처음 관측할 대상이 없어서 setup effect(deps [])가 영원히 no-op된다
  // (도면을 나중에 올려도 그 이후로 다시 실행되지 않음, 2026-07-19 발견).
  return (
    <div
      ref={containerRef}
      className="flex-1 min-w-0 relative overflow-hidden bg-bg-soft"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {!floorplan && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-dim text-sm">
          <img src={mascotSurprised} alt="도면이 없어 놀란 마스코트" className="h-24 w-auto select-none" draggable={false} />
          좌측 패널에서 도면 이미지를 먼저 업로드하세요.
        </div>
      )}
      {floorplan && (
        <>
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            draggable={!drawingZone}
            onWheel={handleWheel}
            onClick={handleStageClick}
          >
            <Layer>
              {image && <KonvaImage image={image} listening={false} />}

              {image &&
                showZones &&
                zones.map((z) => (
                  <ZoneShape
                    key={z.id}
                    zone={z}
                    imageWidth={image.naturalWidth}
                    imageHeight={image.naturalHeight}
                    selected={selectedZoneId === z.id}
                    onSelect={() => onSelectZone(z.id)}
                  />
                ))}

              {image &&
                showConnections &&
                connections.map((c) => {
                  const a = placementByEquip.get(c.a);
                  const b = placementByEquip.get(c.b);
                  if (!a || !b) return null;
                  const points = [
                    (a.xPct / 100) * image.naturalWidth,
                    (a.yPct / 100) * image.naturalHeight,
                    (b.xPct / 100) * image.naturalWidth,
                    (b.yPct / 100) * image.naturalHeight,
                  ];
                  return (
                    <ConnectionLine
                      key={c.key}
                      points={points}
                      selected={selectedConnectionKey === c.key}
                      onSelect={() => onSelectConnection(c.key)}
                    />
                  );
                })}

              {/* 구역 그리기 중인 다각형 미리보기 */}
              {image && drawingZone && draftPoints.length > 0 && (
                <>
                  <Line
                    points={draftPoints.flatMap((p) => [
                      (p.xPct / 100) * image.naturalWidth,
                      (p.yPct / 100) * image.naturalHeight,
                    ])}
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dash={[6, 4]}
                    closed={draftPoints.length >= 3}
                    fill={draftPoints.length >= 3 ? 'rgba(34,211,238,0.1)' : undefined}
                  />
                  {draftPoints.map((p, i) => (
                    <Circle
                      key={i}
                      x={(p.xPct / 100) * image.naturalWidth}
                      y={(p.yPct / 100) * image.naturalHeight}
                      radius={4}
                      fill="#22d3ee"
                    />
                  ))}
                </>
              )}

              {placements.map((p) => {
                const eq = equipmentsById.get(p.설비ID);
                if (!eq || !image) return null;
                return (
                  <EquipmentToken
                    key={p.설비ID}
                    equipment={eq}
                    xPct={p.xPct}
                    yPct={p.yPct}
                    imageWidth={image.naturalWidth}
                    imageHeight={image.naturalHeight}
                    showLabel={showLabels}
                    showValue={showValues}
                    selected={selectedId === p.설비ID}
                    onSelect={onSelect}
                    onMove={onMove}
                  />
                );
              })}
            </Layer>
          </Stage>
          <div className="absolute bottom-3 left-3 text-xs text-text-dim bg-bg-soft/80 rounded-lg px-2 py-1 border border-border">
            {drawingZone
              ? '캔버스를 클릭해서 구역 꼭짓점을 찍으세요 (3개 이상 필요)'
              : '휠: 확대/축소 · 드래그: 이동 · 우측 목록에서 설비를 끌어다 놓으세요'}
          </div>
        </>
      )}
    </div>
  );
}
