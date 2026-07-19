import type { WorkOrderStatus } from '../types';

export type DueState = 'overdue' | 'soon' | null;

// 점검 임박(7일 이내) 또는 이미 지난 설비만 작업오더 배지 대상.
export function dueStateOf(다음점검일: string | undefined, now: Date): DueState {
  if (!다음점검일) return null;
  const due = new Date(다음점검일);
  if (Number.isNaN(due.getTime())) return null;
  const days = Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return null;
}

// 배지를 클릭할 때마다 대기 → 진행중 → 완료 → 대기로 순환 (현장 작업자가 상태를
// 즉시 갱신하는 용도 — 스펙 §5.1 그대로).
export function nextWorkOrderStatus(current: WorkOrderStatus | undefined): WorkOrderStatus {
  if (current === '진행중') return '완료';
  if (current === '완료') return '대기';
  return '진행중';
}

export function workOrderColor(status: WorkOrderStatus, dueState: DueState): string {
  if (status === '완료') return '#4ade80';
  if (status === '진행중') return '#22d3ee';
  return dueState === 'overdue' ? '#f87171' : '#fbbf24';
}
