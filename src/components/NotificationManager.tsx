import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useNotifyStore, loadSeenNotificationKeys, saveSeenNotificationKeys } from '../notifyStore';
import { collectNotificationCategories } from '../lib/notify';

// 30분 — 날짜 기반 판정(점검 임박 7일 이내 등)이라 초 단위로 정밀할 필요가 없고,
// 데이터가 바뀔 때도(설비/이력/자재 CRUD) 아래 useEffect 의존성으로 즉시 재확인되니
// 이 주기는 "탭을 켜둔 채 오래 방치했을 때" 시간 경과만으로 상태가 바뀌는 경우
// (예: 어제는 8일 남았던 점검이 오늘 7일 이내로 들어옴) 잡아내는 안전망 역할.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// 알림(2026-07-27, _웹서비스설계/할일.md) — 화면에는 아무것도 렌더링하지 않고
// Layout에 한 번만 마운트해서 어느 화면에 있든 백그라운드로 점검 임박·법정/정기
// 점검 도래·재고부족을 감시한다. 브라우저 알림(Notification API)이라 탭이 열려
// 있어야 동작(서버 없는 이 앱의 설계원칙 — README "알려진 제약" 참고). 사용자가
// 설정에서 켜고 브라우저 권한을 허용한 경우에만 동작.
export default function NotificationManager() {
  const equipments = useAppStore((s) => s.equipments);
  const inspectionSchedules = useAppStore((s) => s.inspectionSchedules);
  const parts = useAppStore((s) => s.parts);
  const enabled = useNotifyStore((s) => s.enabled);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const check = () => {
      const categories = collectNotificationCategories(equipments, inspectionSchedules, parts, new Date());
      const seen = loadSeenNotificationKeys();
      const nextSeen = new Set<string>();
      for (const cat of categories) {
        nextSeen.add(cat.key);
        if (seen.has(cat.key)) continue;
        const n = new Notification(cat.title, {
          body: cat.body,
          tag: cat.key,
          icon: `${import.meta.env.BASE_URL}pwa-192.png`,
        });
        n.onclick = () => {
          window.focus();
          navigate(cat.to);
          n.close();
        };
      }
      saveSeenNotificationKeys(nextSeen);
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, equipments, inspectionSchedules, parts, navigate]);

  return null;
}
