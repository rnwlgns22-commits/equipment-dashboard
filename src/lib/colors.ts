// index.css의 @theme(다크) 색상과 동일한 값. recharts/canvas(GraphView)는 SVG fill·2D
// 컨텍스트에 CSS var()를 안정적으로 못 받는 경우가 있어 리터럴 hex로 따로 둠 — index.css
// 쪽 값을 바꾸면 여기도 맞출 것. 라이트 테마는 제거됨(2026-08-14) — 다크 고정.
const COLORS_OBJ = {
  accent: '#22d3ee',
  riskHigh: '#f87171',
  riskMid: '#fbbf24',
  riskLow: '#4ade80',
  categorical: ['#22d3ee', '#c084fc', '#fb923c', '#4ade80', '#f472b6', '#facc15', '#60a5fa', '#a3a3a3'],
  bg: '#0b0e14',
  card: '#161a24',
  border: '#262b38',
  text: '#e5e7eb',
  textDim: '#8b93a7',
};

export type ThemeColors = typeof COLORS_OBJ;

export const COLORS: ThemeColors = COLORS_OBJ;

// 테마 전환이 없어진 뒤에도 호출부(GraphView.tsx, Dashboard.tsx)를 안 건드리도록
// 훅 형태는 유지 — 항상 같은 값을 반환한다.
export function useThemeColors(): ThemeColors {
  return COLORS;
}
