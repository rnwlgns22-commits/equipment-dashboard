import { describe, it, expect } from 'vitest';
import { getThemeColors } from './colors';

describe('getThemeColors', () => {
  it('다크/라이트 배경·카드·텍스트 색이 서로 다르다', () => {
    const dark = getThemeColors('dark');
    const light = getThemeColors('light');
    expect(dark.bg).not.toBe(light.bg);
    expect(dark.card).not.toBe(light.card);
    expect(dark.text).not.toBe(light.text);
    expect(dark.textDim).not.toBe(light.textDim);
    expect(dark.border).not.toBe(light.border);
  });

  // index.css의 html.light가 --color-accent/--color-risk-*를 덮어쓰지 않으므로
  // (브랜드/상태 색은 테마 무관), 여기서도 두 팔레트가 같은 값을 가져야 Tailwind
  // 클래스로 그려지는 부분과 recharts/canvas로 그려지는 부분이 어긋나지 않는다.
  it('accent·위험등급 색은 테마와 무관하게 동일하다(index.css와 일치해야 함)', () => {
    const dark = getThemeColors('dark');
    const light = getThemeColors('light');
    expect(dark.accent).toBe(light.accent);
    expect(dark.riskHigh).toBe(light.riskHigh);
    expect(dark.riskMid).toBe(light.riskMid);
    expect(dark.riskLow).toBe(light.riskLow);
    expect(dark.categorical).toEqual(light.categorical);
  });
});
