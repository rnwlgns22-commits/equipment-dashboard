import { describe, it, expect } from 'vitest';
import { buildRecordsFromCandidates } from './uploadCommit';
import type { HistoryCandidate } from './uploadPipeline';

function historyCandidate(overrides: Partial<HistoryCandidate> & { key: string }): HistoryCandidate {
  return {
    fileName: 'test.xlsx',
    relativePath: 'test.xlsx',
    date: '2026-07-01',
    type: '수리',
    title: '테스트 이력',
    equipmentRef: '',
    content: '',
    ...overrides,
  };
}

describe('buildRecordsFromCandidates', () => {
  // 산출기초조사서 파서가 뽑은 비용이 검토 화면을 거쳐 실제 커밋된 HistoryRecord까지
  // 이어져야 대시보드 수리비용 Top10에 반영됨(2026-07-21 추가).
  it('이력 후보의 비용이 HistoryRecord까지 그대로 이어진다', () => {
    const { newHistories } = buildRecordsFromCandidates([], [historyCandidate({ key: 'h1', 비용: 4444000 })], []);
    expect(newHistories[0].비용).toBe(4444000);
  });

  it('비용이 없는 후보는 비용 없이 커밋된다', () => {
    const { newHistories } = buildRecordsFromCandidates([], [historyCandidate({ key: 'h1' })], []);
    expect(newHistories[0].비용).toBeUndefined();
  });

  // 이력 후보의 content가 지금까지 HistoryRecord.내용으로 안 이어지고 그냥 버려졌음
  // (2026-07-26 발견 — 설비목록 상세페이지에서 이력을 펼쳐도 내용이 항상 빈칸이었던
  // 원인). 양식(셀 매핑)이든 일반 자동분류든 content가 있으면 그대로 이어져야 함.
  it('이력 후보의 content가 HistoryRecord.내용까지 그대로 이어진다', () => {
    const { newHistories } = buildRecordsFromCandidates(
      [],
      [historyCandidate({ key: 'h1', content: '먼지 누적으로 필터 막힘, 신품 교체함' })],
      [],
    );
    expect(newHistories[0].내용).toBe('먼지 누적으로 필터 막힘, 신품 교체함');
  });

  it('content가 빈 문자열이면 내용 없이 커밋된다', () => {
    const { newHistories } = buildRecordsFromCandidates([], [historyCandidate({ key: 'h1', content: '' })], []);
    expect(newHistories[0].내용).toBeUndefined();
  });
});
