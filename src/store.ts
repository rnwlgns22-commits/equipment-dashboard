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

export const useAppStore = create<AppState>((set) => ({
  equipments: [],
  histories: [],
  loaded: false,
  loadData: (equipments, histories) => {
    set({ equipments, histories, loaded: true });
    void db.equipments.clear().then(() => db.equipments.bulkPut(equipments));
    void db.histories.clear().then(() => db.histories.bulkPut(histories));
  },
  appendData: (newEquipments, newHistories) => {
    set((s) => ({
      equipments: [...s.equipments, ...newEquipments],
      histories: [...s.histories, ...newHistories],
      loaded: true,
    }));
    void db.equipments.bulkPut(newEquipments);
    void db.histories.bulkPut(newHistories);
  },
  clearData: () => {
    set({ equipments: [], histories: [], loaded: false });
    void db.equipments.clear();
    void db.histories.clear();
  },
}));

export async function hydrateFromDb(): Promise<void> {
  const [equipments, histories] = await Promise.all([db.equipments.toArray(), db.histories.toArray()]);
  if (equipments.length > 0) {
    useAppStore.setState({ equipments, histories, loaded: true });
  }
}
