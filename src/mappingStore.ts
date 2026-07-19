import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Floorplan, Placement, Zone } from './types';

interface MappingState {
  floorplans: Floorplan[];
  activeFloorplanId: string | null;
  placements: Placement[];
  zones: Zone[];
  addFloorplan: (f: Floorplan) => void;
  setActiveFloorplan: (id: string) => void;
  upsertPlacement: (p: Placement) => void;
  removePlacement: (설비ID: string, 도면ID: string) => void;
  addZone: (z: Zone) => void;
  removeZone: (id: string) => void;
}

export const useMappingStore = create<MappingState>()(
  persist(
    (set) => ({
      floorplans: [],
      activeFloorplanId: null,
      placements: [],
      zones: [],
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
      addZone: (z) => set((s) => ({ zones: [...s.zones, z] })),
      removeZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),
    }),
    { name: 'fms-mapping-v1' },
  ),
);
