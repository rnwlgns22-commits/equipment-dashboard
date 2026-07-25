import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: ToastType, action?: ToastAction) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = 'success', action) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action }] }));
    // 실행취소 버튼이 있으면 누를 시간을 더 줌.
    setTimeout(() => get().dismiss(id), action ? 6000 : 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// 렌더 트리 밖(이벤트 핸들러, store.ts의 persist 등)에서도 그냥 부를 수 있도록 —
// 컴포넌트가 아니라도 훅 없이 바로 토스트를 띄우기 위한 헬퍼.
export const showToast = (message: string, type?: ToastType, action?: ToastAction) =>
  useToastStore.getState().show(message, type, action);
