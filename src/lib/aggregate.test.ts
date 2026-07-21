import { describe, it, expect } from 'vitest';
import { monthlyFailureTrend, failuresByCategory, siteStatusBreakdown, repairCostTop10, totalRepairCost } from './aggregate';
import type { Equipment, HistoryRecord } from '../types';

function repair(설비ID: string | undefined, 날짜: string, 비용?: number): HistoryRecord {
  return { id: `h-${설비ID}-${날짜}-${비용 ?? 0}`, 날짜, 설비ID, 유형: '수리', 제목: '수리', 비용, 출처파일: 'test' };
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

describe('repairCostTop10', () => {
  it('설비별 수리비용을 합산하고 비용이 큰 순으로 정렬한다', () => {
    const histories = [repair('A', '2026-01-01', 10000), repair('A', '2026-02-01', 5000), repair('B', '2026-01-01', 30000)];
    const result = repairCostTop10(histories);
    expect(result[0]).toEqual({ 설비ID: 'B', 총비용: 30000, 건수: 1 });
    expect(result[1]).toEqual({ 설비ID: 'A', 총비용: 15000, 건수: 2 });
  });

  it('비용이 기록되지 않은 이력은 집계에서 뺀다(0원 착시 방지)', () => {
    const result = repairCostTop10([repair('A', '2026-01-01')]);
    expect(result).toEqual([]);
  });

  it('점검 이력이나 고아 이력은 빼고, 최대 10건만 반환한다', () => {
    const histories = [
      { id: 'i1', 날짜: '2026-01-01', 설비ID: 'A', 유형: '점검' as const, 제목: 'x', 비용: 9999, 출처파일: 'test' },
      repair(undefined, '2026-01-01', 5000),
      ...Array.from({ length: 12 }, (_, i) => repair(`E${i}`, '2026-01-01', 1000 + i)),
    ];
    const result = repairCostTop10(histories);
    expect(result).toHaveLength(10);
    expect(result.every((r) => r.설비ID !== 'A' || r.총비용 !== 9999)).toBe(true);
  });
});

describe('totalRepairCost', () => {
  it('수리 이력의 비용만 합산한다', () => {
    const histories = [
      repair('A', '2026-01-01', 10000),
      repair('B', '2026-01-01', 5000),
      { id: 'i1', 날짜: '2026-01-01', 설비ID: 'A', 유형: '점검' as const, 제목: 'x', 비용: 3000, 출처파일: 'test' },
    ];
    expect(totalRepairCost(histories)).toBe(15000);
  });

  it('이력이 없으면 0을 반환한다', () => {
    expect(totalRepairCost([])).toBe(0);
  });
});
