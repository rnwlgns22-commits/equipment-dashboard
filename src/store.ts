import { create } from 'zustand';
import { db } from './db';
import type { Equipment, HistoryRecord } from './types';

interface AppState {
  equipments: Equipment[];
  histories: HistoryRecord[];
  loaded: boolean;
  loadData: (equipments: Equipment[], histories: HistoryRecord[]) => void;
  appendData: (equipments: Equipment[], histories: HistoryRecord[]) => void;
  clearData: () => void;
}

// IndexedDB 쓰기는 실패할 수 있음(용량 초과, 프라이빗 브라우징 제약 등). 실패해도 화면의
// 데이터는 이미 낙관적으로 갱신돼 있으니 앱이 멈추진 않지만, 새로고침하면 그 변경분만
// 조용히 사라질 수 있어서 최소한 콘솔에는 남겨둔다(2026-07-20 코드리뷰에서 발견).
function persist(promise: Promise<unknown>): void {
  promise.catch((err) => console.error('IndexedDB 저장 실패 — 새로고침하면 이 변경이 사라질 수 있습니다', err));
}

export const useAppStore = create<AppState>((set) => ({
  equipments: [],
  histories: [],
  loaded: false,
  loadData: (equipments, histories) => {
    set({ equipments, histories, loaded: true });
    persist(db.equipments.clear().then(() => db.equipments.bulkPut(equipments)));
    persist(db.histories.clear().then(() => db.histories.bulkPut(histories)));
  },
  appendData: (newEquipments, newHistories) => {
    set((s) => ({
      equipments: [...s.equipments, ...newEquipments],
      histories: [...s.histories, ...newHistories],
      loaded: true,
    }));
    persist(db.equipments.bulkPut(newEquipments));
    persist(db.histories.bulkPut(newHistories));
  },
  clearData: () => {
    set({ equipments: [], histories: [], loaded: false });
    persist(db.equipments.clear());
    persist(db.histories.clear());
  },
}));

export async function hydrateFromDb(): Promise<void> {
  const [equipments, histories] = await Promise.all([db.equipments.toArray(), db.histories.toArray()]);
  if (equipments.length > 0) {
    useAppStore.setState({ equipments, histories, loaded: true });
  }
}
