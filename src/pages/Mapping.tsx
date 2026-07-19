import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { useMappingStore } from '../mappingStore';
import ControlPanel from '../components/mapping/ControlPanel';
import FloorplanCanvas from '../components/mapping/FloorplanCanvas';
import AssetToolbar from '../components/mapping/AssetToolbar';
import EquipmentPopover from '../components/mapping/EquipmentPopover';

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
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);

  const { floorplans, activeFloorplanId, placements, addFloorplan, setActiveFloorplan, upsertPlacement } =
    useMappingStore();

  const [showLabels, setShowLabels] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeFloorplan = floorplans.find((f) => f.id === activeFloorplanId) ?? null;
  const activePlacements = placements.filter((p) => p.도면ID === activeFloorplanId);
  const placedIds = useMemo(() => new Set(activePlacements.map((p) => p.설비ID)), [activePlacements]);

  const handleUpload = async (file: File) => {
    const dataUrl = await readAsDataUrl(file);
    const id = `fp-${Date.now()}`;
    const name = file.name.replace(/\.[^.]+$/, '');
    addFloorplan({ id, name, imageDataUrl: dataUrl });
  };

  const handleMove = (설비ID: string, xPct: number, yPct: number) => {
    if (!activeFloorplanId) return;
    upsertPlacement({ 설비ID, 도면ID: activeFloorplanId, xPct, yPct });
  };

  const selectedEquipment = selectedId ? equipmentsById.get(selectedId) ?? null : null;

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
          onSelectFloorplan={setActiveFloorplan}
          onUpload={handleUpload}
          showLabels={showLabels}
          onToggleLabels={setShowLabels}
        />
        <div className="flex-1 min-w-0 relative flex">
          <FloorplanCanvas
            floorplan={activeFloorplan}
            placements={activePlacements}
            equipmentsById={equipmentsById}
            showLabels={showLabels}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={handleMove}
            onDropEquipment={handleMove}
          />
          {selectedEquipment && (
            <EquipmentPopover equipment={selectedEquipment} onClose={() => setSelectedId(null)} />
          )}
        </div>
        <AssetToolbar equipments={equipments} placedIds={placedIds} />
      </div>
    </div>
  );
}
