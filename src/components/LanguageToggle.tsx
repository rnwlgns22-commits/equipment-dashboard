import { useLangStore } from '../langStore';

// 2026-08-14: 다크 고정으로 할 일이 없어진 테마 토글 버튼을 언어 전환(한/영)으로
// 재활용(총괄자 요청, 구 ThemeToggle.tsx 대체).
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const lang = useLangStore((s) => s.lang);
  const toggleLang = useLangStore((s) => s.toggleLang);
  const isKo = lang === 'ko';

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={isKo ? 'Switch to English' : '한국어로 전환'}
      title={isKo ? 'Switch to English' : '한국어로 전환'}
      className={`shrink-0 h-8 w-8 rounded-lg border border-border flex items-center justify-center text-xs font-semibold hover:border-accent/50 transition-colors ${className}`}
    >
      {isKo ? 'EN' : '한'}
    </button>
  );
}
