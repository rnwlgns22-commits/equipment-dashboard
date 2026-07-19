import type { Equipment, EquipmentStatus, HistoryRecord } from '../types';

export interface MonthlyPoint {
  month: string; // "2026-07"
  건수: number;
}

export function monthlyFailureTrend(histories: HistoryRecord[], monthsBack = 24, now: Date = new Date()): MonthlyPoint[] {
  const buckets = new Map<string, number>();
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    keys.push(key);
    buckets.set(key, 0);
  }
  for (const h of histories) {
    if (h.유형 !== '수리') continue;
    const key = h.날짜.slice(0, 7);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return keys.map((month) => ({ month, 건수: buckets.get(month) ?? 0 }));
}

export interface CategoryCount {
  분류: string;
  건수: number;
}

export function failuresByCategory(equipments: Equipment[], histories: HistoryRecord[]): CategoryCount[] {
  const catOf = new Map(equipments.map((e) => [e.설비ID, e.분류]));
  const counts = new Map<string, number>();
  for (const h of histories) {
    if (h.유형 !== '수리' || !h.설비ID) continue;
    const cat = catOf.get(h.설비ID) ?? '기타';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([분류, 건수]) => ({ 분류, 건수 }))
    .sort((a, b) => b.건수 - a.건수);
}

const STATUS_ORDER: EquipmentStatus[] = ['정상', '수리중', '정지', '폐기'];

export interface SiteStatusRow {
  사이트: string;
  정상: number;
  수리중: number;
  정지: number;
  폐기: number;
}

export function siteStatusBreakdown(equipments: Equipment[]): SiteStatusRow[] {
  const rows = new Map<string, SiteStatusRow>();
  for (const e of equipments) {
    const site = e.사이트 || '미분류';
    if (!rows.has(site)) {
      rows.set(site, { 사이트: site, 정상: 0, 수리중: 0, 정지: 0, 폐기: 0 });
    }
    const row = rows.get(site)!;
    row[e.상태] += 1;
  }
  return [...rows.values()].sort((a, b) => a.사이트.localeCompare(b.사이트));
}

export { STATUS_ORDER };
