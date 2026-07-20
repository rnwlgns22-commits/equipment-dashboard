import { describe, it, expect } from 'vitest';
import { addDaysUTC } from './dates';

describe('addDaysUTC', () => {
  it('일수를 더한다', () => {
    expect(addDaysUTC('2026-07-20', 10)).toBe('2026-07-30');
  });

  it('월/연도 경계를 넘어간다', () => {
    expect(addDaysUTC('2026-07-25', 10)).toBe('2026-08-04');
    expect(addDaysUTC('2026-12-28', 10)).toBe('2027-01-07');
  });

  // UTC+9 등 로컬 시간대에서 new Date(y,m,d) 지역시간 생성자를 썼다면 하루씩 밀리는
  // 문제가 있었음(2026-07-19/20 여러 화면에서 반복 발견된 버그 패턴) — 회귀 방지.
  it('0일을 더하면 원래 날짜 그대로다(시간대 밀림 없음)', () => {
    expect(addDaysUTC('2026-07-20', 0)).toBe('2026-07-20');
  });

  it('윤년 2월도 정확히 처리한다', () => {
    expect(addDaysUTC('2028-02-28', 1)).toBe('2028-02-29'); // 2028은 윤년
    expect(addDaysUTC('2028-02-29', 1)).toBe('2028-03-01');
  });
});
