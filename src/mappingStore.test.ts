import { afterEach, describe, expect, it } from 'vitest';
import { useMappingStore } from './mappingStore';

afterEach(() => {
  useMappingStore.setState({ workOrders: [] });
});

describe('mappingStore — workOrder', () => {
  it('setWorkOrderStatus는 새 설비면 상태만 있는 항목을 만든다', () => {
    useMappingStore.getState().setWorkOrderStatus('E-001', '진행중');
    const wo = useMappingStore.getState().workOrders.find((w) => w.설비ID === 'E-001');
    expect(wo).toEqual({ 설비ID: 'E-001', 상태: '진행중' });
  });

  // 예전엔 상태만 바꿔도 객체를 통째로 새로 만들어서 담당자·메모가 조용히
  // 날아갔음(2026-07-22 발견) — 배지 클릭(상태 순환)이 상세 입력을 지우면 안 됨.
  it('setWorkOrderStatus는 상태를 바꿔도 기존 담당자·메모를 지우지 않는다', () => {
    useMappingStore.setState({
      workOrders: [{ 설비ID: 'E-001', 상태: '진행중', 담당자: '홍길동', 메모: '베어링 점검중' }],
    });
    useMappingStore.getState().setWorkOrderStatus('E-001', '완료');
    const wo = useMappingStore.getState().workOrders.find((w) => w.설비ID === 'E-001');
    expect(wo).toEqual({ 설비ID: 'E-001', 상태: '완료', 담당자: '홍길동', 메모: '베어링 점검중' });
  });

  it('updateWorkOrderDetail은 항목이 없으면 상태를 대기로 하여 새로 만든다', () => {
    useMappingStore.getState().updateWorkOrderDetail('E-002', { 담당자: '김철수' });
    const wo = useMappingStore.getState().workOrders.find((w) => w.설비ID === 'E-002');
    expect(wo).toEqual({ 설비ID: 'E-002', 상태: '대기', 담당자: '김철수' });
  });

  it('updateWorkOrderDetail은 기존 상태를 유지한 채 담당자·메모만 갱신한다', () => {
    useMappingStore.setState({ workOrders: [{ 설비ID: 'E-001', 상태: '진행중' }] });
    useMappingStore.getState().updateWorkOrderDetail('E-001', { 메모: '누유 확인' });
    const wo = useMappingStore.getState().workOrders.find((w) => w.설비ID === 'E-001');
    expect(wo).toEqual({ 설비ID: 'E-001', 상태: '진행중', 메모: '누유 확인' });
  });

  it('updateWorkOrderDetail은 다른 설비의 작업오더에 영향을 주지 않는다', () => {
    useMappingStore.setState({
      workOrders: [
        { 설비ID: 'E-001', 상태: '진행중', 담당자: '홍길동' },
        { 설비ID: 'E-002', 상태: '대기' },
      ],
    });
    useMappingStore.getState().updateWorkOrderDetail('E-001', { 메모: '수정' });
    const workOrders = useMappingStore.getState().workOrders;
    expect(workOrders.find((w) => w.설비ID === 'E-002')).toEqual({ 설비ID: 'E-002', 상태: '대기' });
  });
});
