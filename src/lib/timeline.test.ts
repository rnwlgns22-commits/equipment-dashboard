import { describe, it, expect } from 'vitest';
import { historyDateRange, hadRecentRepair } from './timeline';
import type { HistoryRecord } from '../types';

function repair(설비ID: string, 날짜: string): HistoryRecord {
  return { id: `h-${설비ID}-${날짜}`, 날짜, 설비ID, 유형: '수리', 제목: '수리', 출처파일: 'test' };
}

describe('historyDateRange', () => {
  // max는 now() 인자를 안 받고 내부에서 실제 시각을 쓰므로, "과거 이력만 있을 때
  // max=지금"이라는 케이스는 실제 시각과 비교해서 확인한다(결정론적으로 특정 과거
  // 날짜를 기대할 수 없음 — 이건 timeline.ts의 설계 자체가 그러함: 타임라인
  // 슬라이더가 항상 "오늘"까지 늘어나 있어야 하므로).
  it('이력 중 최소 날짜를 정확히 반환한다', () => {
    const { min } = historyDateRange([repair('A', '2026-01-01'), repair('A', '2026-06-15')]);
    expect(min.toISOString().slice(0, 10)).toBe('2026-01-01');
  });

  it('가장 최근 이력이 과거면 max는 실제 최근 이력이 아니라 지금(now)이다', () => {
    const { max } = historyDateRange([repair('A', '2020-01-01')]);
    expect(Math.abs(max.getTime() - Date.now())).toBeLessThan(5000);
  });

  it('이력이 없으면 min/max 둘 다 지금 시각이다', () => {
    const before = Date.now();
    const { min, max } = historyDateRange([]);
    expect(min.getTime()).toBeGreaterThanOrEqual(before);
    expect(max.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('가장 최근 이력이 미래 날짜면 max는 그 미래 날짜를 그대로 쓴다(캡핑 안 함)', () => {
    const farFuture = repair('A', '2099-01-01');
    const { max } = historyDateRange([farFuture]);
    expect(max.toISOString().slice(0, 10)).toBe('2099-01-01');
  });

  it('잘못된 날짜 형식은 건너뛴다(min 기준으로 확인)', () => {
    const { min } = historyDateRange([repair('A', '이상한날짜'), repair('A', '2026-05-01')]);
    expect(min.toISOString().slice(0, 10)).toBe('2026-05-01');
  });
});

describe('hadRecentRepair', () => {
  const histories = [repair('A', '2026-07-15')];

  it('기준일이 수리일 이후 windowDays 이내면 true', () => {
    expect(hadRecentRepair('A', new Date('2026-07-17'), histories, 3)).toBe(true);
  });

  it('기준일이 수리일보다 이전이면 false(미래 수리는 안 침)', () => {
    expect(hadRecentRepair('A', new Date('2026-07-10'), histories, 3)).toBe(false);
  });

  it('windowDays를 벗어나면 false', () => {
    expect(hadRecentRepair('A', new Date('2026-07-25'), histories, 3)).toBe(false);
  });

  it('다른 설비ID는 매칭하지 않는다', () => {
    expect(hadRecentRepair('B', new Date('2026-07-16'), histories, 3)).toBe(false);
  });

  it('점검 이력은 카운트하지 않는다(수리만)', () => {
    const inspectionOnly: HistoryRecord[] = [
      { id: 'i1', 날짜: '2026-07-15', 설비ID: 'A', 유형: '점검', 제목: '점검', 출처파일: 'test' },
    ];
    expect(hadRecentRepair('A', new Date('2026-07-16'), inspectionOnly, 3)).toBe(false);
  });
});
