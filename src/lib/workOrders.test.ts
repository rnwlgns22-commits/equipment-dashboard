import { describe, it, expect } from 'vitest';
import { dueStateOf, nextWorkOrderStatus, workOrderColor } from './workOrders';

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
