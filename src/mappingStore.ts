import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Floorplan, Placement } from './types';

interface MappingState {
  floorplans: Floorplan[];
  activeFloorplanId: string | null;
  placements: Placement[];
  addFloorplan: (f: Floorplan) => void;
  setActiveFloorplan: (id: string) => void;
  upsertPlacement: (p: Placement) => void;
  removePlacement: (설비ID: string, 도면ID: string) => void;
}

export const useMappingStore = create<MappingState>()(
  persist(
    (set) => ({
      floorplans: [],
      activeFloorplanId: null,
      placements: [],
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
    }),
    { name: 'fms-mapping-v1' },
  ),
);
