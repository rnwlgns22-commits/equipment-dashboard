import { create } from 'zustand';
import type { Equipment, HistoryRecord } from './types';

interface AppState {
  equipments: Equipment[];
  histories: HistoryRecord[];
  loaded: boolean;
  loadData: (equipments: Equipment[], histories: HistoryRecord[]) => void;
  clearData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  equipments: [],
  histories: [],
  loaded: false,
  loadData: (equipments, histories) => set({ equipments, histories, loaded: true }),
  clearData: () => set({ equipments: [], histories: [], loaded: false }),
}));
