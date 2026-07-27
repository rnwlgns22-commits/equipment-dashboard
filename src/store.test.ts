import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from './store';
import { useMappingStore } from './mappingStore';
import { useTemplateStore } from './templateStore';
import { useHistoryTemplateStore } from './historyTemplateStore';
import type { Equipment, HistoryRecord } from './types';

function equipment(overrides: Partial<Equipment> & { 설비ID: string; 설비명: string }): Equipment {
  return {
    분류: '공조',
    사이트: '미분류',
    상태: '정상',
    연결설비: [],
    상세사양: {},
    출처파일: '테스트',
    ...overrides,
  };
}

function history(overrides: Partial<HistoryRecord> & { id: string }): HistoryRecord {
  return { 날짜: '2026-01-01', 유형: '점검', 제목: '테스트 이력', 출처파일: '테스트', ...overrides };
}

afterEach(() => {
  useAppStore.setState({ equipments: [], histories: [], inspectionSchedules: [], parts: [], loaded: false });
});

describe('useAppStore — restoreSnapshot (삭제 실행취소용)', () => {
  it('전달한 슬라이스만 되돌리고 나머지는 그대로 둔다', () => {
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'E-001', 설비명: '공조기' })],
      histories: [history({ id: 'h1' })],
    });
    const snapshot = { equipments: useAppStore.getState().equipments };

    // 설비를 지웠다가
    useAppStore.setState({ equipments: [] });
    expect(useAppStore.getState().equipments).toHaveLength(0);

    // 실행취소 — equipments만 복원, histories는 스냅샷에 없으니 안 건드림
    useAppStore.getState().restoreSnapshot(snapshot);
    expect(useAppStore.getState().equipments).toHaveLength(1);
    expect(useAppStore.getState().equipments[0].설비ID).toBe('E-001');
    expect(useAppStore.getState().histories).toHaveLength(1);
  });

  it('여러 슬라이스를 한 번에 복원할 수 있다(설비 삭제의 연쇄 효과 되돌리기)', () => {
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'E-001', 설비명: '공조기' })],
      histories: [history({ id: 'h1', 설비ID: 'E-001' })],
    });
    const snapshot = {
      equipments: useAppStore.getState().equipments,
      histories: useAppStore.getState().histories,
    };

    // deleteEquipment가 하는 것과 같은 연쇄 변경(설비 삭제 + 이력 고아화)을 흉내
    useAppStore.setState({
      equipments: [],
      histories: [{ ...useAppStore.getState().histories[0], 설비ID: undefined }],
    });

    useAppStore.getState().restoreSnapshot(snapshot);
    expect(useAppStore.getState().equipments).toHaveLength(1);
    expect(useAppStore.getState().histories[0].설비ID).toBe('E-001');
  });

  it('빈 객체를 넘기면 아무 슬라이스도 안 건드린다', () => {
    useAppStore.setState({ equipments: [equipment({ 설비ID: 'E-001', 설비명: '공조기' })] });
    useAppStore.getState().restoreSnapshot({});
    expect(useAppStore.getState().equipments).toHaveLength(1);
  });
});

// "데이터 비우고 나가기"가 mappingStore는 비우면서(2026-07-20 수정) 그보다 나중에
// 추가된 templateStore/historyTemplateStore는 안 비우던 버그(2026-07-27 발견) —
// 같은 종류의 버그가 새 별도 store가 생길 때마다 반복될 수 있어서 회귀 고정.
describe('useAppStore — clearData', () => {
  afterEach(() => {
    useMappingStore.setState({ floorplans: [], placements: [], zones: [], workOrders: [] });
    useTemplateStore.setState({ templates: [] });
    useHistoryTemplateStore.setState({ templates: [] });
  });

  it('메인 데이터뿐 아니라 매핑·양식(설비/이력) 별도 store도 함께 비운다', () => {
    useAppStore.setState({ equipments: [equipment({ 설비ID: 'E-001', 설비명: '공조기' })] });
    useMappingStore.setState({
      floorplans: [{ id: 'f1', name: '1층', imageDataUrl: 'data:image/png;base64,' }],
      placements: [],
      zones: [],
      workOrders: [],
    });
    useTemplateStore.setState({
      templates: [{ id: 't1', name: '테스트', createdAt: '2026-07-27', cells: {}, customFields: [] }],
    });
    useHistoryTemplateStore.setState({
      templates: [{ id: 'ht1', name: '테스트', createdAt: '2026-07-27', cells: {} }],
    });

    useAppStore.getState().clearData();

    expect(useAppStore.getState().equipments).toHaveLength(0);
    expect(useMappingStore.getState().floorplans).toHaveLength(0);
    expect(useTemplateStore.getState().templates).toHaveLength(0);
    expect(useHistoryTemplateStore.getState().templates).toHaveLength(0);
  });
});
