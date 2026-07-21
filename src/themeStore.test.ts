import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'fms-theme';

// themeStore는 모듈 로드 시점(top-level)에 초기 테마를 계산하고 html 클래스를
// 즉시 적용한다(깜빡임 방지 목적) — 그래서 조건별로 다시 테스트하려면 매번
// resetModules 후 동적 import로 새로 평가해야 한다.
beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('light');
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('light');
  vi.resetModules();
});

describe('themeStore — 초기 테마 결정', () => {
  // 2026-07-22 요청 — OS가 라이트를 선호해도 사용자가 직접 토글하기 전엔 항상
  // 다크로 시작해야 함(이전엔 OS 선호를 따랐는데, 그 동작을 없앰).
  it('저장된 테마가 없으면 OS 선호와 무관하게 항상 dark로 시작한다', async () => {
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('localStorage에 저장된 테마(light)가 있으면 그 값으로 시작한다', async () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('localStorage에 저장된 테마(dark)가 있으면 그 값으로 시작한다', async () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('light')).toBe(false);
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
