import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import Dexie, { type Table } from 'dexie';
import type { Floorplan, Placement, WorkOrderStatus, Zone } from './types';
import type { WorkOrder } from './types';

export const MIN_TOKEN_SCALE = 0.5;
export const MAX_TOKEN_SCALE = 5;

// 도면 이미지(base64)를 포함한 매핑 상태는 localStorage 용량 한도(보통 5~10MB)를 금방
// 넘어서, 그 이후로는 구역을 그리거나 설비를 옮겨도 조용히 저장 실패하는 문제가 있었음
// (QuotaExceededError가 콘솔에만 찍히고 사용자에게는 아무 안내 없이 데이터가 그냥
// 안 남음 — "구역 그렸는데 저장이 안 된다"는 사용자 리포트로 2026-07-20 발견).
// IndexedDB는 한도가 훨씬 커서(보통 디스크 여유공간 기준) 이 문제가 없음 — zustand
// persist의 storage를 Dexie 기반으로 교체.
class MappingDb extends Dexie {
  kv!: Table<{ key: string; value: string }, string>;
  constructor() {
    super('fms-mapping-db');
    this.version(1).stores({ kv: 'key' });
  }
}
const mappingDb = new MappingDb();

const LEGACY_LOCALSTORAGE_KEY = 'fms-mapping-v1';

// 기존 localStorage에 남아있던 데이터를 IndexedDB로 1회 이전. 용량 초과로 이미
// 저장 실패한 상태였다면 legacy 값 자체가 최신이 아닐 수 있지만, 그래도 마지막으로
// 성공했던 저장 시점까지는 복구되므로 완전 유실보다 낫다.
const indexedDbStorage: StateStorage = {
  getItem: async (name) => {
    const row = await mappingDb.kv.get(name);
    if (row) return row.value;
    const legacy = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (legacy) {
      await mappingDb.kv.put({ key: name, value: legacy });
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return legacy;
    }
    return null;
  },
  setItem: async (name, value) => {
    await mappingDb.kv.put({ key: name, value });
  },
  removeItem: async (name) => {
    await mappingDb.kv.delete(name);
  },
};

export interface MappingSnapshot {
  floorplans: Floorplan[];
  placements: Placement[];
  zones: Zone[];
  workOrders: WorkOrder[];
}

interface MappingState extends MappingSnapshot {
  activeFloorplanId: string | null;
  addFloorplan: (f: Floorplan) => void;
  setActiveFloorplan: (id: string) => void;
  upsertPlacement: (p: Placement) => void;
  removePlacement: (설비ID: string, 도면ID: string) => void;
  removePlacementsForEquipment: (설비ID: string) => void;
  resizePlacement: (설비ID: string, 도면ID: string, scale: number) => void;
  addZone: (z: Zone) => void;
  removeZone: (id: string) => void;
  setWorkOrderStatus: (설비ID: string, 상태: WorkOrderStatus) => void;
  loadSnapshot: (data: MappingSnapshot) => void;
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
      // 설비 삭제 시(store.ts deleteEquipment) 호출 — 그 설비가 배치된 모든 도면에서
      // 배치를 같이 제거. 안 그러면 존재하지 않는 설비ID를 가리키는 배치가 계속 쌓임.
      removePlacementsForEquipment: (설비ID) =>
        set((s) => ({
          placements: s.placements.filter((x) => x.설비ID !== 설비ID),
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
      loadSnapshot: (data) =>
        set({
          floorplans: data.floorplans,
          placements: data.placements,
          zones: data.zones,
          workOrders: data.workOrders,
          activeFloorplanId: data.floorplans[0]?.id ?? null,
        }),
    }),
    { name: 'fms-mapping-v1', storage: createJSONStorage(() => indexedDbStorage) },
  ),
);
