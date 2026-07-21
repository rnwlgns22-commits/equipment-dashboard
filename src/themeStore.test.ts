import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'fms-theme';

// themeStore는 모듈 로드 시점(top-level)에 초기 테마를 계산하고 html 클래스를
// 즉시 적용한다(깜빡임 방지 목적) — 그래서 조건별로 다시 테스트하려면 매번
// resetModules 후 동적 import로 새로 평가해야 한다.
function mockMatchMedia(prefersLight: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('light') ? prefersLight : !prefersLight,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('light');
  mockMatchMedia(false);
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('light');
  vi.resetModules();
});

describe('themeStore — 초기 테마 결정', () => {
  it('저장된 테마가 없고 OS가 다크를 선호하면 dark로 시작하고 light 클래스를 안 붙인다', async () => {
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('저장된 테마가 없고 OS가 라이트를 선호하면 light로 시작하고 light 클래스를 붙인다', async () => {
    mockMatchMedia(true);
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('localStorage에 저장된 테마가 OS 선호보다 우선한다', async () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    mockMatchMedia(false); // OS는 다크를 선호해도
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().theme).toBe('light');
  });
});

describe('themeStore — toggleTheme', () => {
  it('테마를 전환하고 html 클래스·localStorage를 함께 갱신한다', async () => {
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().theme).toBe('dark');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });
});
