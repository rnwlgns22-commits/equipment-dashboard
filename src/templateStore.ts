import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import Dexie, { type Table } from 'dexie';
import type { SheetTemplate } from './lib/sheetTemplate';

// mappingStore.ts와 같은 이유로 IndexedDB에 저장(localStorage 용량 한도 회피) — 양식
// 자체는 작은 텍스트 데이터라 한도를 넘길 일은 거의 없지만, 저장소를 통일해서 나중에
// 값이 커져도(예: 미리보기 이미지 첨부 등) 그대로 안전.
class TemplateDb extends Dexie {
  kv!: Table<{ key: string; value: string }, string>;
  constructor() {
    super('fms-template-db');
    this.version(1).stores({ kv: 'key' });
  }
}
const templateDb = new TemplateDb();

const indexedDbStorage: StateStorage = {
  getItem: async (name) => (await templateDb.kv.get(name))?.value ?? null,
  setItem: async (name, value) => {
    await templateDb.kv.put({ key: name, value });
  },
  removeItem: async (name) => {
    await templateDb.kv.delete(name);
  },
};

interface TemplateState {
  templates: SheetTemplate[];
  addTemplate: (t: SheetTemplate) => void;
  updateTemplate: (id: string, patch: Partial<SheetTemplate>) => void;
  removeTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: [],
      addTemplate: (t) => set((s) => ({ templates: [...s.templates, t] })),
      updateTemplate: (id, patch) =>
        set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
    }),
    { name: 'fms-template-v1', storage: createJSONStorage(() => indexedDbStorage) },
  ),
);
