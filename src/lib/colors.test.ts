import { describe, it, expect } from 'vitest';
import { COLORS, useThemeColors } from './colors';

describe('COLORS', () => {
  it('필요한 색 키를 전부 가진다(다크 고정, 2026-08-14 라이트 테마 제거)', () => {
    expect(COLORS.bg).toBeTruthy();
    expect(COLORS.card).toBeTruthy();
    expect(COLORS.text).toBeTruthy();
    expect(COLORS.textDim).toBeTruthy();
    expect(COLORS.border).toBeTruthy();
    expect(COLORS.accent).toBeTruthy();
    expect(COLORS.riskHigh).toBeTruthy();
    expect(COLORS.riskMid).toBeTruthy();
    expect(COLORS.riskLow).toBeTruthy();
    expect(COLORS.categorical.length).toBeGreaterThan(0);
  });

  it('useThemeColors()는 항상 COLORS와 같은 값을 반환한다', () => {
    expect(useThemeColors()).toBe(COLORS);
  });
});
