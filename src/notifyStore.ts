// 알림 켬/끔은 langStore.ts와 같은 패턴(localStorage 백업 zustand 스토어)으로
// 관리(2026-07-27). 브라우저 알림 권한(Notification.permission) 자체는 브라우저가
// 들고 있어서 여기서 따로 저장하지 않음 — 이 스토어는 "이 앱에서 켰는지" 앱 차원의
// 의사만 담는다(권한은 있어도 앱에서 끄면 알림 안 보내야 하므로 둘을 분리).
import { create } from 'zustand';

const ENABLED_KEY = 'fms-notify-enabled';
const SEEN_KEY = 'fms-notify-seen-v1';

function detectInitialEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

interface NotifyState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export const useNotifyStore = create<NotifyState>((set) => ({
  enabled: detectInitialEnabled(),
  setEnabled: (v) => {
    localStorage.setItem(ENABLED_KEY, String(v));
    set({ enabled: v });
  },
}));

// 카테고리별로 "이미 알린 대상 집합의 key"를 기억해서 같은 상태로는 재알림하지
// 않는다(lib/notify.ts 참고). 매 체크마다 현재 대상 집합으로 통째로 교체 저장 —
// 해소된 항목은 자연히 빠져서 별도 정리(pruning) 로직이 필요 없다.
export function loadSeenNotificationKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveSeenNotificationKeys(keys: Set<string>): void {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...keys]));
}
