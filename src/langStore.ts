import { create } from 'zustand';

export type Lang = 'ko' | 'en';

const STORAGE_KEY = 'fms-lang';

// 2026-08-14: 라이트/다크 토글을 없애면서(다크 고정) 비게 된 토글 버튼을 한/영
// 언어 전환으로 재활용(총괄자 요청). 기본은 한국어 — 저장된 선택이 있으면 그것만 우선한다.
function detectInitialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'ko' || saved === 'en') return saved;
  return 'ko';
}

interface LangState {
  lang: Lang;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: detectInitialLang(),
  toggleLang: () => {
    const next: Lang = get().lang === 'ko' ? 'en' : 'ko';
    localStorage.setItem(STORAGE_KEY, next);
    set({ lang: next });
  },
}));
