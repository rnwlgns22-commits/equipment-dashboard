// 알림(2026-07-27 추가, _웹서비스설계/할일.md) — 점검 임박·법정/정기점검 도래·
// 재고부족을 대시보드 밖에서도 알리는 기능. 이 앱은 완전 클라이언트 사이드(서버
// 없음)라 진짜 푸시/이메일은 설계원칙과 충돌해서, 브라우저 알림(Notification API,
// 탭이 열려 있을 때만 동작)으로 범위를 좁힘 — 대시보드 KPI 타일(점검 임박·법정·
// 정기점검 도래·재고부족)과 같은 판정 기준을 그대로 재사용한다.
//
// 개별 항목마다 알림을 쏘면 한 번에 여러 건이 몰릴 때 알림 폭탄이 되므로,
// 종류(설비 점검/법정·정기점검/자재)별로 묶어서 하나씩만 만든다. dedup은
// components/NotificationManager.tsx가 이 key를 기준으로 처리 — 대상 집합이
// 바뀌지 않는 한(항목이 늘거나 줄거나, 다음점검일이 바뀌거나) 같은 key라 재알림하지
// 않고, 집합이 바뀌면 key도 바뀌어 새로 알린다.
import type { Equipment, InspectionSchedule, Part } from '../types';
import { daysUntil } from './dates';
import { dueStateOf, compareInspectionPriority } from './workOrders';

export interface NotificationCategory {
  key: string;
  title: string;
  body: string;
  to: string;
}

function summarize(names: string[], total: number): string {
  const shown = names.slice(0, 3).join(', ');
  return total > 3 ? `${shown} 외 ${total - 3}건` : shown;
}

export function collectNotificationCategories(
  equipments: Equipment[],
  inspectionSchedules: InspectionSchedule[],
  parts: Part[],
  now: Date,
): NotificationCategory[] {
  const categories: NotificationCategory[] = [];

  const dueSoonEquip = equipments
    .filter((e) => {
      const d = daysUntil(e.다음점검일, now);
      return d !== null && d >= 0 && d <= 7;
    })
    .sort((a, b) => a.설비ID.localeCompare(b.설비ID));
  if (dueSoonEquip.length > 0) {
    categories.push({
      key: `eq-due:${dueSoonEquip.map((e) => `${e.설비ID}@${e.다음점검일}`).join(',')}`,
      title: `점검 임박 설비 ${dueSoonEquip.length}건`,
      body: summarize(dueSoonEquip.map((e) => e.설비명), dueSoonEquip.length),
      to: '/dashboard',
    });
  }

  const dueInsp = inspectionSchedules
    .map((s) => ({ ...s, due: dueStateOf(s.다음점검일, now) }))
    .filter((s) => s.due !== null)
    .sort(compareInspectionPriority);
  if (dueInsp.length > 0) {
    categories.push({
      key: `insp-due:${dueInsp.map((s) => `${s.id}@${s.다음점검일}@${s.due}`).join(',')}`,
      title: `법정·정기점검 도래 ${dueInsp.length}건`,
      body: summarize(dueInsp.map((s) => s.항목명), dueInsp.length),
      to: '/dashboard',
    });
  }

  const lowStock = parts
    .filter((p) => p.안전재고 !== undefined && p.현재수량 <= p.안전재고)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (lowStock.length > 0) {
    categories.push({
      key: `part-low:${lowStock.map((p) => `${p.id}@${p.현재수량}`).join(',')}`,
      title: `재고부족 자재 ${lowStock.length}건`,
      body: summarize(lowStock.map((p) => p.자재명), lowStock.length),
      to: '/inventory',
    });
  }

  return categories;
}
