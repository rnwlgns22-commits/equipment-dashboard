import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore, showToast } from './toastStore';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  vi.useRealTimers();
});

describe('toastStore', () => {
  it('show()로 토스트를 추가하면 목록에 쌓인다', () => {
    showToast('저장했습니다');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ message: '저장했습니다', type: 'success' });
  });

  it('dismiss()로 특정 토스트만 지울 수 있다', () => {
    showToast('첫번째');
    showToast('두번째');
    const [first] = useToastStore.getState().toasts;
    useToastStore.getState().dismiss(first.id);
    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('두번째');
  });

  it('action 없는 토스트는 3.5초 후 자동으로 사라진다', () => {
    showToast('일반 알림');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3499);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  // 실행취소 버튼을 누를 시간을 더 줘야 해서(2026-07-25) 일반 토스트보다 오래 유지됨.
  it('action이 있는 토스트(실행취소 등)는 6초 후에 사라진다', () => {
    showToast('삭제했습니다', 'success', { label: '실행취소', onClick: () => {} });
    vi.advanceTimersByTime(3500);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(2500);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('action의 onClick과 label을 그대로 보존한다', () => {
    const onClick = vi.fn();
    showToast('삭제했습니다', 'success', { label: '실행취소', onClick });
    const toast = useToastStore.getState().toasts[0];
    expect(toast.action?.label).toBe('실행취소');
    toast.action?.onClick();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
