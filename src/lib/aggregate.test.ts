import { describe, it, expect } from 'vitest';
import { monthlyFailureTrend, failuresByCategory, siteStatusBreakdown } from './aggregate';
import type { Equipment, HistoryRecord } from '../types';

function repair(설비ID: string | undefined, 날짜: string): HistoryRecord {
  return { id: `h-${설비ID}-${날짜}`, 날짜, 설비ID, 유형: '수리', 제목: '수리', 출처파일: 'test' };
}
function stub(설비ID: string, 분류: Equipment['분류'], 사이트: string, 상태: Equipment['상태']): Equipment {
  return { 설비ID, 설비명: 설비ID, 분류, 사이트, 상태, 연결설비: [], 상세사양: {}, 출처파일: 'test' };
}

describe('monthlyFailureTrend', () => {
  const now = new Date('2026-07-20');

  it('요청한 개월 수만큼 버킷을 만든다(빈 달도 0으로 채움)', () => {
    const result = monthlyFailureTrend([], 3, now);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.month)).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(result.every((r) => r.건수 === 0)).toBe(true);
  });

  it('해당 월의 수리 건수를 집계한다', () => {
    const histories = [repair('A', '2026-07-01'), repair('A', '2026-07-15'), repair('B', '2026-06-01')];
    const result = monthlyFailureTrend(histories, 3, now);
    expect(result.find((r) => r.month === '2026-07')?.건수).toBe(2);
    expect(result.find((r) => r.month === '2026-06')?.건수).toBe(1);
  });

  it('점검 이력은 집계에서 뺀다', () => {
    const inspection: HistoryRecord = { id: 'i1', 날짜: '2026-07-01', 설비ID: 'A', 유형: '점검', 제목: 'x', 출처파일: 'test' };
    const result = monthlyFailureTrend([inspection], 3, now);
    expect(result.find((r) => r.month === '2026-07')?.건수).toBe(0);
  });

  it('범위 밖(monthsBack보다 오래된) 이력은 무시한다', () => {
    const result = monthlyFailureTrend([repair('A', '2020-01-01')], 3, now);
    expect(result.every((r) => r.건수 === 0)).toBe(true);
  });
});

describe('failuresByCategory', () => {
  it('설비 분류별로 수리 건수를 집계하고 많은 순으로 정렬한다', () => {
    const equipments = [stub('A', '공조', 'X', '정상'), stub('B', '전기', 'X', '정상')];
    const histories = [repair('A', '2026-01-01'), repair('A', '2026-02-01'), repair('B', '2026-01-01')];
    const result = failuresByCategory(equipments, histories);
    expect(result[0]).toEqual({ 분류: '공조', 건수: 2 });
    expect(result[1]).toEqual({ 분류: '전기', 건수: 1 });
  });

  it('설비ID 없는(고아) 이력은 집계에서 뺀다', () => {
    const result = failuresByCategory([], [repair(undefined, '2026-01-01')]);
    expect(result).toEqual([]);
  });
});

describe('siteStatusBreakdown', () => {
  it('사이트별 상태 카운트를 집계한다', () => {
    const equipments = [
      stub('A', '공조', 'A동', '정상'),
      stub('B', '공조', 'A동', '수리중'),
      stub('C', '공조', 'B동', '정상'),
    ];
    const result = siteStatusBreakdown(equipments);
    expect(result.find((r) => r.사이트 === 'A동')).toEqual({ 사이트: 'A동', 정상: 1, 수리중: 1, 정지: 0, 폐기: 0 });
    expect(result.find((r) => r.사이트 === 'B동')?.정상).toBe(1);
  });

  it('사이트가 빈 문자열이면 미분류로 묶는다', () => {
    const result = siteStatusBreakdown([stub('A', '공조', '', '정상')]);
    expect(result[0].사이트).toBe('미분류');
  });

  it('사이트명 가나다순으로 정렬한다', () => {
    const equipments = [stub('A', '공조', 'C동', '정상'), stub('B', '공조', 'A동', '정상')];
    const result = siteStatusBreakdown(equipments);
    expect(result.map((r) => r.사이트)).toEqual(['A동', 'C동']);
  });
});
