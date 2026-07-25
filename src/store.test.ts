import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from './store';
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
