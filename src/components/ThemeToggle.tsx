import { useThemeStore } from '../themeStore';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? '다크 모드로 전환' : '라이트 모드로 전환'}
      title={isLight ? '다크 모드로 전환' : '라이트 모드로 전환'}
      className={`shrink-0 h-8 w-8 rounded-lg border border-border flex items-center justify-center text-sm hover:border-accent/50 transition-colors ${className}`}
    >
      {isLight ? '🌙' : '☀️'}
    </button>
  );
}
