import { useThemeStore } from '../themeStore';

// index.css의 @theme(다크)·html.light(라이트) 색상과 동일한 값. recharts/canvas(GraphView)는
// SVG fill·2D 컨텍스트에 CSS var()를 안정적으로 못 받는 경우가 있어 리터럴 hex로 따로 둠 —
// index.css 쪽 값을 바꾸면 여기도 맞출 것. accent·risk·categorical은 index.css의 html.light가
// 덮어쓰지 않는 값이라(브랜드/상태 색은 테마와 무관하게 유지) 두 팔레트에서 동일하다.
const SHARED = {
  accent: '#22d3ee',
  riskHigh: '#f87171',
  riskMid: '#fbbf24',
  riskLow: '#4ade80',
  categorical: ['#22d3ee', '#c084fc', '#fb923c', '#4ade80', '#f472b6', '#facc15', '#60a5fa', '#a3a3a3'],
};

const DARK = {
  ...SHARED,
  bg: '#0b0e14',
  card: '#161a24',
  border: '#262b38',
  text: '#e5e7eb',
  textDim: '#8b93a7',
};

const LIGHT = {
  ...SHARED,
  bg: '#f7f8fa',
  card: '#ffffff',
  border: '#e2e5ea',
  text: '#0f172a',
  textDim: '#64748b',
};

export type ThemeColors = typeof DARK;

// 기존 정적 COLORS는 다크 값 그대로 유지 — 테마 전환 없이 값만 참조하던 나머지
// 코드(Mapping의 Konva 토큰 등, 사용자가 올린 도면 이미지 위에 그려져서 앱 테마와
// 무관하게 항상 일정한 대비를 유지해야 함)를 건드리지 않기 위함.
export const COLORS: ThemeColors = DARK;

export function getThemeColors(theme: 'dark' | 'light'): ThemeColors {
  return theme === 'light' ? LIGHT : DARK;
}

// recharts 차트처럼 라이트/다크에 따라 실제로 배경·격자·글자색이 바뀌어야 하는
// 화면에서 사용 — 테마가 바뀌면 리렌더되도록 스토어를 구독한다.
export function useThemeColors(): ThemeColors {
  const theme = useThemeStore((s) => s.theme);
  return getThemeColors(theme);
}
