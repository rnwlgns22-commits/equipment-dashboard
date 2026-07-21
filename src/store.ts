import { create } from 'zustand';
import { db } from './db';
import { useMappingStore } from './mappingStore';
import type { Equipment, HistoryRecord, InspectionSchedule, Part } from './types';

interface AppState {
  equipments: Equipment[];
  histories: HistoryRecord[];
  inspectionSchedules: InspectionSchedule[];
  parts: Part[];
  loaded: boolean;
  loadData: (equipments: Equipment[], histories: HistoryRecord[]) => void;
  appendData: (equipments: Equipment[], histories: HistoryRecord[]) => void;
  clearData: () => void;
  updateEquipment: (설비ID: string, patch: Partial<Equipment>) => void;
  deleteEquipment: (설비ID: string) => void;
  addHistory: (h: HistoryRecord) => void;
  updateHistory: (id: string, patch: Partial<HistoryRecord>) => void;
  deleteHistory: (id: string) => void;
  addInspectionSchedule: (s: InspectionSchedule) => void;
  updateInspectionSchedule: (id: string, patch: Partial<InspectionSchedule>) => void;
  deleteInspectionSchedule: (id: string) => void;
  loadInspectionSchedules: (schedules: InspectionSchedule[]) => void;
  addPart: (p: Part) => void;
  updatePart: (id: string, patch: Partial<Part>) => void;
  deletePart: (id: string) => void;
}

// IndexedDB 쓰기는 실패할 수 있음(용량 초과, 프라이빗 브라우징 제약 등). 실패해도 화면의
// 데이터는 이미 낙관적으로 갱신돼 있으니 앱이 멈추진 않지만, 새로고침하면 그 변경분만
// 조용히 사라질 수 있어서 최소한 콘솔에는 남겨둔다(2026-07-20 코드리뷰에서 발견).
function persist(promise: Promise<unknown>): void {
  promise.catch((err) => console.error('IndexedDB 저장 실패 — 새로고침하면 이 변경이 사라질 수 있습니다', err));
}

export const useAppStore = create<AppState>((set, get) => ({
  equipments: [],
  histories: [],
  inspectionSchedules: [],
  parts: [],
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
  // "데이터 비우고 나가기" 버튼의 목적 자체가 이 컴퓨터에서 흔적을 지우는 건데,
  // 레이아웃 매핑(도면 이미지·배치·구역)은 별도 store라 여기서 안 지워지고 계속
  // 남아있었음 — 다음에 다른 데이터를 올려도 예전 도면이 그대로 보이는 문제
  // (2026-07-20 발견). 매핑도 같이 비움.
  clearData: () => {
    set({ equipments: [], histories: [], inspectionSchedules: [], parts: [], loaded: false });
    persist(db.equipments.clear());
    persist(db.histories.clear());
    persist(db.inspectionSchedules.clear());
    persist(db.parts.clear());
    useMappingStore.getState().loadSnapshot({ floorplans: [], placements: [], zones: [], workOrders: [] });
  },
  updateEquipment: (설비ID, patch) => {
    set((s) => ({
      equipments: s.equipments.map((e) => (e.설비ID === 설비ID ? { ...e, ...patch } : e)),
    }));
    const updated = get().equipments.find((e) => e.설비ID === 설비ID);
    if (updated) persist(db.equipments.put(updated));
  },
  // 설비를 지우면: ①그 설비를 가리키던 다른 설비의 연결설비 배열에서도 제거(끊어진 링크가
  // 안 남게), ②관련 이력은 지우지 않고 고아 이력으로 남김(점검·수리 기록 자체는 가치가
  // 있으므로), ③레이아웃 매핑에 배치돼 있었다면 그 배치도 같이 제거(안 그러면 존재하지
  // 않는 설비를 가리키는 배치가 mappingStore에 계속 쌓임), ④법정점검/정기점검 항목은
  // 이력과 달리 그 설비 자체에 대한 계획이라 고아로 남길 의미가 없어서 그냥 같이 삭제,
  // ⑤자재의 연결설비ID도 끊어진 링크가 안 남게 제거(자재 자체는 재고 정보라 삭제 안 함).
  deleteEquipment: (설비ID) => {
    const removedScheduleIds = get()
      .inspectionSchedules.filter((x) => x.설비ID === 설비ID)
      .map((x) => x.id);
    set((s) => ({
      equipments: s.equipments
        .filter((e) => e.설비ID !== 설비ID)
        .map((e) => (e.연결설비.includes(설비ID) ? { ...e, 연결설비: e.연결설비.filter((c) => c !== 설비ID) } : e)),
      histories: s.histories.map((h) => (h.설비ID === 설비ID ? { ...h, 설비ID: undefined } : h)),
      inspectionSchedules: s.inspectionSchedules.filter((x) => x.설비ID !== 설비ID),
      parts: s.parts.map((p) =>
        p.연결설비ID.includes(설비ID) ? { ...p, 연결설비ID: p.연결설비ID.filter((c) => c !== 설비ID) } : p,
      ),
    }));
    persist(db.equipments.delete(설비ID));
    persist(db.equipments.bulkPut(get().equipments));
    persist(db.histories.bulkPut(get().histories));
    persist(db.inspectionSchedules.bulkDelete(removedScheduleIds));
    persist(db.parts.bulkPut(get().parts));
    useMappingStore.getState().removePlacementsForEquipment(설비ID);
  },
  addHistory: (h) => {
    set((s) => ({ histories: [...s.histories, h] }));
    persist(db.histories.put(h));
  },
  updateHistory: (id, patch) => {
    set((s) => ({ histories: s.histories.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
    const updated = get().histories.find((h) => h.id === id);
    if (updated) persist(db.histories.put(updated));
  },
  deleteHistory: (id) => {
    set((s) => ({ histories: s.histories.filter((h) => h.id !== id) }));
    persist(db.histories.delete(id));
  },
  addInspectionSchedule: (s) => {
    set((st) => ({ inspectionSchedules: [...st.inspectionSchedules, s] }));
    persist(db.inspectionSchedules.put(s));
  },
  updateInspectionSchedule: (id, patch) => {
    set((st) => ({
      inspectionSchedules: st.inspectionSchedules.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
    const updated = get().inspectionSchedules.find((x) => x.id === id);
    if (updated) persist(db.inspectionSchedules.put(updated));
  },
  deleteInspectionSchedule: (id) => {
    set((st) => ({ inspectionSchedules: st.inspectionSchedules.filter((x) => x.id !== id) }));
    persist(db.inspectionSchedules.delete(id));
  },
  // JSON 백업 가져오기 전용 — loadData(설비/이력)와 같은 "전체 교체" 의미.
  loadInspectionSchedules: (schedules) => {
    set({ inspectionSchedules: schedules });
    persist(db.inspectionSchedules.clear().then(() => db.inspectionSchedules.bulkPut(schedules)));
  },
  addPart: (p) => {
    set((s) => ({ parts: [...s.parts, p] }));
    persist(db.parts.put(p));
  },
  updatePart: (id, patch) => {
    set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    const updated = get().parts.find((p) => p.id === id);
    if (updated) persist(db.parts.put(updated));
  },
  deletePart: (id) => {
    set((s) => ({ parts: s.parts.filter((p) => p.id !== id) }));
    persist(db.parts.delete(id));
  },
}));

export async function hydrateFromDb(): Promise<void> {
  const [equipments, histories, inspectionSchedules, parts] = await Promise.all([
    db.equipments.toArray(),
    db.histories.toArray(),
    db.inspectionSchedules.toArray(),
    db.parts.toArray(),
  ]);
  if (equipments.length > 0) {
    useAppStore.setState({ equipments, histories, inspectionSchedules, parts, loaded: true });
  }
}
