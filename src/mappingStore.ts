import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Floorplan, Placement, WorkOrderStatus, Zone } from './types';
import type { WorkOrder } from './types';

export const MIN_TOKEN_SCALE = 0.5;
export const MAX_TOKEN_SCALE = 5;

interface MappingState {
  floorplans: Floorplan[];
  activeFloorplanId: string | null;
  placements: Placement[];
  zones: Zone[];
  workOrders: WorkOrder[];
  addFloorplan: (f: Floorplan) => void;
  setActiveFloorplan: (id: string) => void;
  upsertPlacement: (p: Placement) => void;
  removePlacement: (설비ID: string, 도면ID: string) => void;
  resizePlacement: (설비ID: string, 도면ID: string, scale: number) => void;
  addZone: (z: Zone) => void;
  removeZone: (id: string) => void;
  setWorkOrderStatus: (설비ID: string, 상태: WorkOrderStatus) => void;
}

export const useMappingStore = create<MappingState>()(
  persist(
    (set) => ({
      floorplans: [],
      activeFloorplanId: null,
      placements: [],
      zones: [],
      workOrders: [],
      addFloorplan: (f) =>
        set((s) => ({ floorplans: [...s.floorplans, f], activeFloorplanId: f.id })),
      setActiveFloorplan: (id) => set({ activeFloorplanId: id }),
      upsertPlacement: (p) =>
        set((s) => {
          const others = s.placements.filter(
            (x) => !(x.설비ID === p.설비ID && x.도면ID === p.도면ID),
          );
          return { placements: [...others, p] };
        }),
      removePlacement: (설비ID, 도면ID) =>
        set((s) => ({
          placements: s.placements.filter((x) => !(x.설비ID === 설비ID && x.도면ID === 도면ID)),
        })),
      resizePlacement: (설비ID, 도면ID, scale) =>
        set((s) => ({
          placements: s.placements.map((x) =>
            x.설비ID === 설비ID && x.도면ID === 도면ID
              ? { ...x, scale: Math.max(MIN_TOKEN_SCALE, Math.min(MAX_TOKEN_SCALE, scale)) }
              : x,
          ),
        })),
      addZone: (z) => set((s) => ({ zones: [...s.zones, z] })),
      removeZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),
      setWorkOrderStatus: (설비ID, 상태) =>
        set((s) => ({
          workOrders: [...s.workOrders.filter((w) => w.설비ID !== 설비ID), { 설비ID, 상태 }],
        })),
    }),
    { name: 'fms-mapping-v1' },
  ),
);
