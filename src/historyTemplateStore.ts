import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import Dexie, { type Table } from 'dexie';
import type { HistoryTemplate } from './lib/historySheetTemplate';

// templateStore.ts(설비 양식)와 같은 이유로 별도 Dexie kv 저장소 사용 — 설비 양식과
// 이력 양식은 스키마가 달라서 목록을 분리해두는 게 헷갈리지 않음.
class HistoryTemplateDb extends Dexie {
  kv!: Table<{ key: string; value: string }, string>;
  constructor() {
    super('fms-history-template-db');
    this.version(1).stores({ kv: 'key' });
  }
}
const historyTemplateDb = new HistoryTemplateDb();

const indexedDbStorage: StateStorage = {
  getItem: async (name) => (await historyTemplateDb.kv.get(name))?.value ?? null,
  setItem: async (name, value) => {
    await historyTemplateDb.kv.put({ key: name, value });
  },
  removeItem: async (name) => {
    await historyTemplateDb.kv.delete(name);
  },
};

interface HistoryTemplateState {
  templates: HistoryTemplate[];
  addTemplate: (t: HistoryTemplate) => void;
  updateTemplate: (id: string, patch: Partial<HistoryTemplate>) => void;
  removeTemplate: (id: string) => void;
  loadTemplates: (templates: HistoryTemplate[]) => void;
}

export const useHistoryTemplateStore = create<HistoryTemplateState>()(
  persist(
    (set) => ({
      templates: [],
      addTemplate: (t) => set((s) => ({ templates: [...s.templates, t] })),
      updateTemplate: (id, patch) =>
        set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      // JSON 백업 가져오기 전용(2026-07-27) — templateStore.ts와 같은 이유.
      loadTemplates: (templates) => set({ templates }),
    }),
    { name: 'fms-history-template-v1', storage: createJSONStorage(() => indexedDbStorage) },
  ),
);
