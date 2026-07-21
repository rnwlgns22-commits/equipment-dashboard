import type { HistoryRecord, InspectionKind, WorkOrder, WorkOrderStatus } from '../types';

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

// 배지 클릭으로 상태를 순환시키다 "완료"에 도달하는 순간, 그때까지 채워둔 담당자·
// 메모를 담아 점검·수리 이력 한 건을 자동으로 남긴다(법정/정기점검의 "오늘 완료"가
// 이력을 만드는 것과 같은 취지, 2026-07-22 추가). 대기→진행중 전환처럼 완료가 아닌
// 경우는 아직 끝난 일이 아니므로 이력을 만들지 않아 null을 반환 — 컴포넌트(캔버스
// 클릭 좌표 등 UI 세부사항)와 분리해서 순수 함수로 테스트 가능하게 함.
export function advanceWorkOrder(
  설비ID: string,
  current: WorkOrderStatus | undefined,
  detail: Pick<WorkOrder, '담당자' | '메모'> | undefined,
  now: Date,
): { next: WorkOrderStatus; historyToAdd: HistoryRecord | null } {
  const next = nextWorkOrderStatus(current);
  if (next !== '완료') return { next, historyToAdd: null };

  const content = [detail?.담당자 && `담당자: ${detail.담당자}`, detail?.메모].filter(Boolean).join('\n');
  return {
    next,
    historyToAdd: {
      id: `hist-wo-${설비ID}-${now.getTime()}`,
      날짜: now.toISOString().slice(0, 10),
      설비ID,
      유형: '수리',
      제목: '작업오더 완료',
      내용: content || undefined,
      출처파일: '작업오더',
    },
  };
}

const INSPECTION_KIND_PRIORITY: Record<InspectionKind, number> = { 법정점검: 0, 정기점검: 1 };

// 법정점검(법령상 의무, 어기면 과태료·행정처분 위험)이 정기점검(내부 유지보수
// 루틴)보다 항상 우선순위가 높음 — 다음점검일로만 정렬하면 임박한 정기점검이
// 이미 기한을 넘긴 법정점검보다 위에 뜰 수 있어서, 종류를 1차 정렬키로 두고
// 그 안에서만 다음점검일(빠른 순)로 정렬한다(2026-07-21 요청: "법정점검을
// 최우선순위로").
export function compareInspectionPriority(
  a: { 종류: InspectionKind; 다음점검일?: string },
  b: { 종류: InspectionKind; 다음점검일?: string },
): number {
  return (
    INSPECTION_KIND_PRIORITY[a.종류] - INSPECTION_KIND_PRIORITY[b.종류] ||
    (a.다음점검일 ?? '').localeCompare(b.다음점검일 ?? '')
  );
}
