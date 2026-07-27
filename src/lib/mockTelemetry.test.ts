import { describe, it, expect } from 'vitest';
import { mockTemperature, mockUptimeHours, statusColor } from './mockTelemetry';

describe('mockTemperature', () => {
  it('같은 설비ID로 호출하면 항상 같은 값이 나온다', () => {
    const id = 'AHU-01';
    expect(mockTemperature(id)).toBe(mockTemperature(id));
  });

  it('18~62도 범위 안에 있다', () => {
    const temperature = mockTemperature('AHU-01');
    expect(temperature).toBeGreaterThanOrEqual(18);
    expect(temperature).toBeLessThanOrEqual(62);
  });
});

describe('mockUptimeHours', () => {
  it('같은 설비ID로 호출하면 항상 같은 값이 나온다', () => {
    const id = 'AHU-01';
    expect(mockUptimeHours(id)).toBe(mockUptimeHours(id));
  });

  it('20~8020시간 범위 안에 있다', () => {
    const uptime = mockUptimeHours('AHU-01');
    expect(uptime).toBeGreaterThanOrEqual(20);
    expect(uptime).toBeLessThanOrEqual(8020);
  });
});

describe('statusColor', () => {
  it('정상이면 #4ade80', () => {
    expect(statusColor('정상')).toBe('#4ade80');
  });

  it('수리중이면 #fbbf24', () => {
    expect(statusColor('수리중')).toBe('#fbbf24');
  });

  it('그 외(정지·폐기 등)는 #f87171', () => {
    expect(statusColor('정지')).toBe('#f87171');
  });
});
