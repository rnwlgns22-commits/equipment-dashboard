// index.css의 @theme 색상과 동일한 값. recharts는 SVG fill에 CSS var()를
// 안정적으로 못 받는 경우가 있어 리터럴 hex로 따로 둠 — 값 바꾸면 둘 다 맞출 것.
export const COLORS = {
  accent: '#22d3ee',
  riskHigh: '#f87171',
  riskMid: '#fbbf24',
  riskLow: '#4ade80',
  textDim: '#8b93a7',
  border: '#262b38',
  categorical: ['#22d3ee', '#c084fc', '#fb923c', '#4ade80', '#f472b6', '#facc15', '#60a5fa', '#a3a3a3'],
};
