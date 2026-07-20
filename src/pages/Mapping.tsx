import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { useMappingStore } from '../mappingStore';
import { computeFailureStats } from '../lib/stats';
import { computeZoneStats } from '../lib/geo';
import { nextWorkOrderStatus } from '../lib/workOrders';
import { historyDateRange } from '../lib/timeline';
import type { ViewMode } from '../types';
import ControlPanel from '../components/mapping/ControlPanel';
import FloorplanCanvas from '../components/mapping/FloorplanCanvas';
import AssetToolbar from '../components/mapping/AssetToolbar';
import EquipmentPopover from '../components/mapping/EquipmentPopover';
import ZoneStatsPopover from '../components/mapping/ZoneStatsPopover';
import ConnectionPopover from '../components/mapping/ConnectionPopover';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Mapping() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const updateEquipment = useAppStore((s) => s.updateEquipment);
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);
  const statsById = useMemo(() => {
    const { stats } = computeFailureStats(histories);
    return new Map(stats.map((s) => [s.설비ID, s]));
  }, [histories]);

  const {
    floorplans,
    activeFloorplanId,
    placements,
    zones,
    workOrders,
    addFloorplan,
    removeFloorplan,
    setActiveFloorplan,
    upsertPlacement,
    resizePlacement,
    removePlacement,
    addZone,
    removeZone,
    setWorkOrderStatus,
  } = useMappingStore();
  const workOrdersById = useMemo(
    () => new Map(workOrders.map((w) => [w.설비ID, w.상태])),
    [workOrders],
  );

  const [showLabels, setShowLabels] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('일반');
  const [asOfDate, setAsOfDate] = useState<Date>(() => historyDateRange(histories).max);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnectionKey, setSelectedConnectionKey] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [drawingZone, setDrawingZone] = useState(false);
  const [draftPoints, setDraftPoints] = useState<{ xPct: number; yPct: number }[]>([]);

  const activeFloorplan = floorplans.find((f) => f.id === activeFloorplanId) ?? null;
  const activePlacements = placements.filter((p) => p.도면ID === activeFloorplanId);
  const activeZones = zones.filter((z) => z.도면ID === activeFloorplanId);
  const placedIds = useMemo(() => new Set(activePlacements.map((p) => p.설비ID)), [activePlacements]);

  const handleUpload = async (file: File) => {
    const dataUrl = await readAsDataUrl(file);
    const id = `fp-${Date.now()}`;
    const name = file.name.replace(/\.[^.]+$/, '');
    addFloorplan({ id, name, imageDataUrl: dataUrl });
  };

  // 도면을 바꿀 때 선택·그리기 상태를 안 비우면, A 도면에서 구역을 그리다가(draftPoints가
  // A 기준 %좌표) B로 넘어가서 "완료"를 누르면 그 좌표가 그대로 B 도면의 구역으로 붙어버림
  // (2026-07-20 코드리뷰에서 발견). 선택된 설비/연결선/구역도 도면이 바뀌면 화면에 없는
  // 것을 가리키는 채로 팝오버가 남을 수 있어 같이 초기화.
  const handleSelectFloorplan = (id: string) => {
    setActiveFloorplan(id);
    setSelectedId(null);
    setSelectedConnectionKey(null);
    setSelectedZoneId(null);
    setDrawingZone(false);
    setDraftPoints([]);
  };

  const handleRemoveFloorplan = (id: string) => {
    const target = floorplans.find((f) => f.id === id);
    if (!target) return;
    if (!window.confirm(`"${target.name}" 도면을 삭제할까요? 이 도면 위 설비 배치와 구역도 함께 지워집니다.`)) {
      return;
    }
    removeFloorplan(id);
    // 활성 도면이 지워졌으면 mappingStore가 다른 도면으로 넘겨주지만, 그 화면이 가리키던
    // 선택/그리기 상태는 그대로 남아있어 위 handleSelectFloorplan과 같은 이유로 초기화.
    setSelectedId(null);
    setSelectedConnectionKey(null);
    setSelectedZoneId(null);
    setDrawingZone(false);
    setDraftPoints([]);
  };

  const handleMove = (설비ID: string, xPct: number, yPct: number) => {
    if (!activeFloorplanId) return;
    // upsertPlacement는 같은 (설비ID, 도면ID) 항목을 통째로 갈아치우므로, scale을 안 넣고
    // 부르면 드래그로 옮길 때마다 사용자가 조절해둔 아이콘 크기가 100%로 리셋됐음
    // (2026-07-20 발견 — "아이콘 크기가 고정 안 된다"는 피드백의 원인).
    const existing = activePlacements.find((p) => p.설비ID === 설비ID);
    upsertPlacement({ 설비ID, 도면ID: activeFloorplanId, xPct, yPct, scale: existing?.scale });
  };

  const handleWorkOrderClick = (설비ID: string) => {
    setWorkOrderStatus(설비ID, nextWorkOrderStatus(workOrdersById.get(설비ID)));
  };

  // 보기 모드 버튼은 구역 그리기 도중에도 항상 눌려서(ControlPanel이 drawingZone과
  // 무관하게 항상 활성 상태), 예를 들어 그리다 말고 "히스토리 타임라인"으로 바꾸면
  // 하단 힌트가 타임라인 슬라이더로 바뀌어 "지금 점을 찍고 있다"는 표시가 사라지는데
  // 캔버스는 여전히 클릭마다 구역 점을 추가함(graphify 기반 코드리뷰로 발견,
  // 2026-07-20). 도면 전환 때와 같은 이유로, 모드가 바뀌면 그리던 구역은 취소.
  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setDrawingZone(false);
    setDraftPoints([]);
  };

  const selectEquipment = (id: string | null) => {
    setSelectedId(id);
    setSelectedConnectionKey(null);
    setSelectedZoneId(null);
  };
  const selectConnection = (key: string | null) => {
    setSelectedConnectionKey(key);
    setSelectedId(null);
    setSelectedZoneId(null);
  };
  const selectZone = (id: string | null) => {
    setSelectedZoneId(id);
    setSelectedId(null);
    setSelectedConnectionKey(null);
  };

  const startDrawingZone = () => {
    setDrawingZone(true);
    setDraftPoints([]);
    selectZone(null);
  };
  const cancelDrawingZone = () => {
    setDrawingZone(false);
    setDraftPoints([]);
  };
  const finishDrawingZone = () => {
    if (draftPoints.length < 3 || !activeFloorplanId) return;
    const name = window.prompt('구역 이름을 입력하세요 (예: 제1 가공 위험 구역)');
    if (name === null) return; // 취소하면 그리기 모드 유지, 점은 살아있음
    if (!name.trim()) return;
    addZone({ id: `zone-${Date.now()}`, name: name.trim(), 도면ID: activeFloorplanId, points: draftPoints });
    setDrawingZone(false);
    setDraftPoints([]);
  };

  const selectedEquipment = selectedId ? equipmentsById.get(selectedId) ?? null : null;
  const selectedPlacement = selectedId
    ? activePlacements.find((p) => p.설비ID === selectedId) ?? null
    : null;
  const selectedZone = selectedZoneId ? activeZones.find((z) => z.id === selectedZoneId) ?? null : null;
  const selectedZoneStats = selectedZone
    ? computeZoneStats(selectedZone, activePlacements, equipmentsById, statsById)
    : null;

  // 연결선의 key는 FloorplanCanvas가 computeConnections로 파생시킬 때 정렬된
  // "설비ID_A|설비ID_B" 형태로 만듦(lib/topology.ts) — 그대로 갈라서 두 설비를 찾음.
  const selectedConnectionPair = selectedConnectionKey
    ? (selectedConnectionKey.split('|') as [string, string])
    : null;
  const selectedConnectionEquipments = selectedConnectionPair
    ? ([equipmentsById.get(selectedConnectionPair[0]), equipmentsById.get(selectedConnectionPair[1])] as const)
    : null;
  const handleDisconnect = () => {
    if (!selectedConnectionEquipments) return;
    const [a, b] = selectedConnectionEquipments;
    if (!a || !b) return;
    updateEquipment(a.설비ID, { 연결설비: a.연결설비.filter((id) => id !== b.설비ID) });
    updateEquipment(b.설비ID, { 연결설비: b.연결설비.filter((id) => id !== a.설비ID) });
    selectConnection(null);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-xl font-semibold tracking-tight">설비 레이아웃 매핑</h1>
        <p className="text-xs text-text-dim mt-1">
          도면 위 좌표는 % 상대좌표로 저장됩니다 — 창 크기가 바뀌어도 위치가 유지됩니다.
        </p>
      </div>
      <div className="flex-1 flex min-h-0">
        <ControlPanel
          floorplans={floorplans}
          activeFloorplanId={activeFloorplanId}
          onRemoveFloorplan={handleRemoveFloorplan}
          onSelectFloorplan={handleSelectFloorplan}
          onUpload={handleUpload}
          viewMode={viewMode}
          onChangeViewMode={handleChangeViewMode}
          showLabels={showLabels}
          onToggleLabels={setShowLabels}
          showValues={showValues}
          onToggleValues={setShowValues}
          showConnections={showConnections}
          onToggleConnections={setShowConnections}
          showZones={showZones}
          onToggleZones={setShowZones}
          drawingZone={drawingZone}
          draftPointCount={draftPoints.length}
          onStartDrawingZone={startDrawingZone}
          onFinishDrawingZone={finishDrawingZone}
          onCancelDrawingZone={cancelDrawingZone}
        />
        <div className="flex-1 min-w-0 relative flex">
          <FloorplanCanvas
            floorplan={activeFloorplan}
            placements={activePlacements}
            equipments={equipments}
            equipmentsById={equipmentsById}
            showLabels={showLabels}
            showValues={showValues}
            showConnections={showConnections}
            selectedId={selectedId}
            onSelect={selectEquipment}
            onMove={handleMove}
            onDropEquipment={handleMove}
            selectedConnectionKey={selectedConnectionKey}
            onSelectConnection={selectConnection}
            zones={activeZones}
            showZones={showZones}
            selectedZoneId={selectedZoneId}
            onSelectZone={selectZone}
            drawingZone={drawingZone}
            draftPoints={draftPoints}
            onAddDraftPoint={(xPct, yPct) => setDraftPoints((prev) => [...prev, { xPct, yPct }])}
            viewMode={viewMode}
            statsById={statsById}
            workOrders={workOrdersById}
            onWorkOrderClick={handleWorkOrderClick}
            histories={histories}
            asOfDate={asOfDate}
            onChangeAsOfDate={setAsOfDate}
          />
          {selectedEquipment && (
            <EquipmentPopover
              equipment={selectedEquipment}
              scale={selectedPlacement?.scale ?? 1}
              onChangeScale={(s) => {
                if (activeFloorplanId) resizePlacement(selectedEquipment.설비ID, activeFloorplanId, s);
              }}
              onRemovePlacement={() => {
                if (!activeFloorplanId) return;
                removePlacement(selectedEquipment.설비ID, activeFloorplanId);
                selectEquipment(null);
              }}
              onClose={() => selectEquipment(null)}
            />
          )}
          {selectedZone && selectedZoneStats && (
            <ZoneStatsPopover
              zone={selectedZone}
              stats={selectedZoneStats}
              onClose={() => selectZone(null)}
              onDelete={() => {
                removeZone(selectedZone.id);
                selectZone(null);
              }}
            />
          )}
          {selectedConnectionEquipments && selectedConnectionEquipments[0] && selectedConnectionEquipments[1] && (
            <ConnectionPopover
              a={selectedConnectionEquipments[0]}
              b={selectedConnectionEquipments[1]}
              onDisconnect={handleDisconnect}
              onClose={() => selectConnection(null)}
            />
          )}
        </div>
        <AssetToolbar equipments={equipments} placedIds={placedIds} />
      </div>
    </div>
  );
}
