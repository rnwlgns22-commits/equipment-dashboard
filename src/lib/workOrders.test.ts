import { describe, it, expect } from 'vitest';
import { dueStateOf, nextWorkOrderStatus, workOrderColor, compareInspectionPriority } from './workOrders';

describe('dueStateOf', () => {
  const now = new Date('2026-07-20T00:00:00Z');

  it('다음점검일이 없으면 null', () => {
    expect(dueStateOf(undefined, now)).toBeNull();
  });

  it('날짜 형식이 이상하면 null', () => {
    expect(dueStateOf('말도안됨', now)).toBeNull();
  });

  it('이미 지났으면 overdue', () => {
    expect(dueStateOf('2026-07-10', now)).toBe('overdue');
  });

  it('7일 이내면 soon', () => {
    expect(dueStateOf('2026-07-25', now)).toBe('soon');
    expect(dueStateOf('2026-07-27', now)).toBe('soon'); // 정확히 경계(7일)
  });

  it('7일보다 많이 남았으면 null(임박 아님)', () => {
    expect(dueStateOf('2026-08-20', now)).toBeNull();
  });

  it('오늘이면 soon(0일)', () => {
    expect(dueStateOf('2026-07-20', now)).toBe('soon');
  });
});

describe('nextWorkOrderStatus', () => {
  it('대기(undefined) → 진행중 → 완료 → 대기 순으로 순환한다', () => {
    expect(nextWorkOrderStatus(undefined)).toBe('진행중');
    expect(nextWorkOrderStatus('진행중')).toBe('완료');
    expect(nextWorkOrderStatus('완료')).toBe('대기');
    expect(nextWorkOrderStatus('대기')).toBe('진행중');
  });
});

describe('workOrderColor', () => {
  it('완료는 초록, 진행중은 시안', () => {
    expect(workOrderColor('완료', null)).toBe('#4ade80');
    expect(workOrderColor('진행중', 'overdue')).toBe('#22d3ee');
  });

  it('대기 상태에서 연체면 빨강, 임박이면 노랑', () => {
    expect(workOrderColor('대기', 'overdue')).toBe('#f87171');
    expect(workOrderColor('대기', 'soon')).toBe('#fbbf24');
  });
});

describe('compareInspectionPriority', () => {
  // 법정점검(법령상 의무)이 정기점검보다 항상 우선순위가 높음(2026-07-21 요청) —
  // 다음점검일이 아무리 임박해도 정기점검이 법정점검보다 위로 올라가면 안 됨.
  it('다음점검일이 더 임박한 정기점검보다 법정점검을 먼저 정렬한다', () => {
    const legal = { 종류: '법정점검' as const, 다음점검일: '2026-12-31' };
    const regular = { 종류: '정기점검' as const, 다음점검일: '2026-07-21' };
    const sorted = [regular, legal].sort(compareInspectionPriority);
    expect(sorted).toEqual([legal, regular]);
  });

  it('같은 종류끼리는 다음점검일이 빠른 순으로 정렬한다', () => {
    const a = { 종류: '법정점검' as const, 다음점검일: '2026-08-01' };
    const b = { 종류: '법정점검' as const, 다음점검일: '2026-07-01' };
    expect([a, b].sort(compareInspectionPriority)).toEqual([b, a]);
  });

  it('여러 건이 섞여도 법정점검 그룹 전체가 정기점검 그룹보다 앞에 온다', () => {
    const items = [
      { 종류: '정기점검' as const, 다음점검일: '2026-07-22' },
      { 종류: '법정점검' as const, 다음점검일: '2026-09-01' },
      { 종류: '정기점검' as const, 다음점검일: '2026-07-25' },
      { 종류: '법정점검' as const, 다음점검일: '2026-07-30' },
    ];
    const sorted = [...items].sort(compareInspectionPriority);
    expect(sorted.map((s) => s.종류)).toEqual(['법정점검', '법정점검', '정기점검', '정기점검']);
    expect(sorted[0].다음점검일).toBe('2026-07-30');
    expect(sorted[1].다음점검일).toBe('2026-09-01');
  });
});
