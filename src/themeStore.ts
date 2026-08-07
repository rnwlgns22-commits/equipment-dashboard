import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fms-theme';

// 기본은 라이트 — OS 선호와 무관하게, 사용자가 직접 토글하기 전엔 라이트로 시작한다
// (2026-08-07 요청). 원래는 다크가 기본이었는데(2026-07-22), 아이폰 글라스스킨
// 컨셉으로 바꾸면서 참고 보드의 글라스 핀이 대부분 '밝은 성에유리'였고 그 재질이
// 라이트에서 제대로 살아나서 기본을 뒤집음. OS 선호를 따르지 않는다는 원칙 자체는
// 그대로 유지. localStorage에 저장된 선택이 있으면 그것만 우선한다.
function detectInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

const initialTheme = detectInitialTheme();
// 모듈이 로드되는 즉시(React가 첫 렌더를 하기 전) 테마 클래스를 적용 — 안 그러면
// 라이트 모드 사용자가 새로고침할 때 어두운 화면이 잠깐 번쩍인다. main.tsx가 이
// 모듈을 App보다 먼저 import해서 보장한다.
applyThemeClass(initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyThemeClass(next);
    set({ theme: next });
  },
}));
