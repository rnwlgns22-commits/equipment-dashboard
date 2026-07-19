// _스크립트\failure_stats.py 포팅. 로직은 그대로, 언어만 TS로.
import type { Equipment, FailureStat, HistoryRecord, RiskLevel } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function riskOf(recentCount: number): RiskLevel {
  if (recentCount >= 3) return '상';
  if (recentCount >= 1) return '중';
  return '하';
}

export interface StatsResult {
  stats: FailureStat[];
  orphanCount: number;
}

export function computeFailureStats(histories: HistoryRecord[], now: Date = new Date()): StatsResult {
  const byEquip = new Map<string, Date[]>();
  let orphanCount = 0;

  for (const h of histories) {
    if (h.유형 !== '수리') continue;
    if (!h.설비ID) {
      orphanCount += 1;
      continue;
    }
    const d = new Date(h.날짜);
    if (Number.isNaN(d.getTime())) continue;
    const list = byEquip.get(h.설비ID) ?? [];
    list.push(d);
    byEquip.set(h.설비ID, list);
  }

  const oneYearAgo = new Date(now.getTime() - 365 * DAY_MS);
  const stats: FailureStat[] = [];

  for (const [설비ID, dates] of byEquip) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    const count = dates.length;
    const first = dates[0];
    const last = dates[dates.length - 1];
    const recentCount = dates.filter((d) => d >= oneYearAgo).length;

    let mtbf: number | undefined;
    let predicted: string | undefined;
    if (count >= 2) {
      const span = daysBetween(first, last);
      mtbf = span / (count - 1);
      const predictedDate = new Date(last.getTime() + Math.round(mtbf) * DAY_MS);
      predicted = predictedDate.toISOString().slice(0, 10);
    }

    stats.push({
      설비ID,
      고장건수: count,
      최근1년건수: recentCount,
      최초고장일: first.toISOString().slice(0, 10),
      최근고장일: last.toISOString().slice(0, 10),
      mtbf일: mtbf,
      예상다음고장일: predicted,
      위험등급: riskOf(recentCount),
    });
  }

  stats.sort((a, b) => b.최근1년건수 - a.최근1년건수 || b.고장건수 - a.고장건수);
  return { stats, orphanCount };
}

export function equipmentName(equipments: Equipment[], id: string): string {
  return equipments.find((e) => e.설비ID === id)?.설비명 ?? id;
}
