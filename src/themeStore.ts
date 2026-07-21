import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fms-theme';

// 기본은 다크 — OS가 라이트를 선호해도 사용자가 직접 토글하기 전엔 다크로 시작한다
// (2026-07-22 요청). localStorage에 저장된 선택이 있으면 그것만 우선한다.
function detectInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
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
